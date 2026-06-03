import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Server, type Socket } from "socket.io";
import {
  attackHeroForSide,
  attackMinionForSide,
  emergencyActionForSide,
  endTurnForSide,
  playCardForSide,
  useHeroPowerForSide,
} from "../src/game/actions";
import { confirmMulliganForSide, createGameState, markGameStarted, starterDecks } from "../src/game/state";
import type { FactionId, GameState } from "../src/game/types";

type Seat = "player" | "opponent";
type RoomStatus = "waiting" | "mulligan" | "playing";

interface OnlinePlayer {
  socketId: string;
  faction: FactionId;
  deck: string[];
  displayName: string;
  friendCode: string;
}

interface RoomState {
  code: string;
  confirmedMulligans: Set<Seat>;
  player?: OnlinePlayer;
  opponent?: OnlinePlayer;
  status: RoomStatus;
  state?: GameState;
}

interface RoomPayload {
  opponentFriendCode?: string;
  opponentName?: string;
  playerFriendCode?: string;
  playerName?: string;
  roomCode: string;
  role: Seat;
  status: RoomStatus;
  playerCount: number;
}

interface JoinPayload {
  displayName?: string;
  friendCode?: string;
  roomCode?: string;
  faction?: FactionId;
  deck?: string[];
}

const rooms = new Map<string, RoomState>();
const socketRooms = new Map<string, string>();

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const distDir = join(rootDir, "dist");

const httpServer = createServer(async (request, response) => {
  if (!request.url || request.url.startsWith("/socket.io/")) return;

  const url = new URL(request.url, "http://localhost");
  const cleanPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = resolve(join(distDir, cleanPath));
  const safeFilePath = filePath.startsWith(distDir) ? filePath : join(distDir, "index.html");

  try {
    const data = await readFile(safeFilePath);
    response.writeHead(200, { "Content-Type": mimeType(safeFilePath) });
    response.end(data);
  } catch {
    try {
      const fallback = await readFile(join(distDir, "index.html"));
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(fallback);
    } catch {
      response.writeHead(404);
      response.end("Build missing. Run npm run build first.");
    }
  }
});
const io = new Server(httpServer, {
  cors: {
    origin: true,
  },
});

io.on("connection", (socket) => {
  socket.emit("server:hello", {
    message: "Nebenwirkungen Multiplayer-Server bereit.",
  });

  socket.on("room:create", (payload: JoinPayload) => {
    leavePreviousRoom(socket);
    const code = uniqueRoomCode();
    const room: RoomState = {
      code,
      confirmedMulligans: new Set(),
      player: makeOnlinePlayer(socket, payload),
      status: "waiting",
    };
    rooms.set(code, room);
    socket.join(code);
    socketRooms.set(socket.id, code);
    emitRoomPayload(socket, room, "player");
  });

  socket.on("room:join", (payload: JoinPayload) => {
    leavePreviousRoom(socket);
    const code = normalizeRoomCode(payload.roomCode);
    if (!code) {
      socket.emit("room:error", { message: "Raumcode fehlt." });
      return;
    }

    const room = rooms.get(code);
    if (room) pruneDisconnectedPlayers(room);
    if (!room || !room.player) {
      socket.emit("room:error", { message: "Raum nicht gefunden." });
      return;
    }
    if (room.opponent && room.opponent.socketId !== socket.id) {
      socket.emit("room:error", { message: "Raum ist bereits voll." });
      return;
    }

    room.opponent = makeOnlinePlayer(socket, payload);
    socket.join(code);
    socketRooms.set(socket.id, code);
    startRoomIfReady(room);
    broadcastRoom(room);
  });

  socket.on("game:play-card", (payload: { roomCode?: string; cardId?: string; targetId?: string }) => {
    socket.emit("game:debug", {
      message: payload.targetId
        ? `Server empfaengt Karte ${payload.cardId ?? "?"} auf Ziel ${payload.targetId}.`
        : `Server empfaengt Karte ${payload.cardId ?? "?"}.`,
    });
    updateRoomState(socket, payload.roomCode, (state, role) =>
      payload.cardId ? playCardForSide(state, role, payload.cardId, payload.targetId) : state,
    );
  });

  socket.on("game:attack-hero", (payload: { roomCode?: string; attackerId?: string }) => {
    updateRoomState(socket, payload.roomCode, (state, role) =>
      payload.attackerId ? attackHeroForSide(state, role, payload.attackerId) : state,
    );
  });

  socket.on("game:attack-minion", (payload: { roomCode?: string; attackerId?: string; targetId?: string }) => {
    updateRoomState(socket, payload.roomCode, (state, role) =>
      payload.attackerId && payload.targetId ? attackMinionForSide(state, role, payload.attackerId, payload.targetId) : state,
    );
  });

  socket.on("game:end-turn", (payload: { roomCode?: string }) => {
    updateRoomState(socket, payload.roomCode, (state, role) => endTurnForSide(state, role));
  });

  socket.on("game:hero-power", (payload: { roomCode?: string; targetId?: string }) => {
    updateRoomState(socket, payload.roomCode, (state, role) => useHeroPowerForSide(state, role, payload.targetId));
  });

  socket.on("game:emergency-action", (payload: { roomCode?: string }) => {
    updateRoomState(socket, payload.roomCode, (state, role) => emergencyActionForSide(state, role));
  });

  socket.on("game:mulligan-confirm", (payload: { roomCode?: string; selectedIndexes?: number[] }) => {
    const code = normalizeRoomCode(payload.roomCode) ?? socketRooms.get(socket.id);
    const room = code ? rooms.get(code) : undefined;
    if (!room?.state || room.status !== "mulligan") {
      socket.emit("room:error", { message: "Mulligan ist nicht aktiv." });
      return;
    }
    const role = roleForSocket(room, socket.id);
    if (!role) {
      socket.emit("room:error", { message: "Du sitzt nicht in diesem Raum." });
      return;
    }
    if (!room.confirmedMulligans.has(role)) {
      room.state = confirmMulliganForSide(room.state, role, sanitizeIndexes(payload.selectedIndexes), Date.now());
      room.confirmedMulligans.add(role);
    }
    if (room.confirmedMulligans.has("player") && room.confirmedMulligans.has("opponent")) {
      room.state = markGameStarted(room.state);
      room.status = "playing";
    }
    broadcastRoom(room);
  });

  socket.on("disconnect", () => {
    leavePreviousRoom(socket);
  });
});

function updateRoomState(socket: Socket, roomCode: string | undefined, apply: (state: GameState, role: Seat) => GameState) {
  const code = socketRooms.get(socket.id) ?? normalizeRoomCode(roomCode);
  const room = code ? rooms.get(code) : undefined;
  if (!room?.state || room.status !== "playing") {
    socket.emit("room:error", { message: "Spielraum ist noch nicht bereit." });
    return;
  }
  const role = roleForSocket(room, socket.id);
  if (!role) {
    socket.emit("room:error", { message: "Du sitzt nicht in diesem Raum." });
    return;
  }
  room.state = apply(room.state, role);
  socket.emit("game:debug", { message: `Server-Ergebnis: ${room.state.events[0]?.text ?? "keine Aenderung"}` });
  broadcastRoom(room);
}

function startRoomIfReady(room: RoomState) {
  if (!room.player || !room.opponent || room.state) return;
  const seed = Date.now();
  room.state = createGameState({
    playerFaction: room.player.faction,
    opponentFaction: room.opponent.faction,
    playerDeck: room.player.deck,
    opponentDeck: room.opponent.deck,
    seed,
  });
  room.status = "mulligan";
  room.confirmedMulligans.clear();
}

function broadcastRoom(room: RoomState) {
  if (room.player) emitRoomPayload(io.to(room.player.socketId), room, "player");
  if (room.opponent) emitRoomPayload(io.to(room.opponent.socketId), room, "opponent");
  if (!room.state) return;
  if (room.player) {
    io.to(room.player.socketId).emit("game:state", {
      state: perspectiveFor(room.state, "player"),
      status: room.status,
      mulliganConfirmed: room.confirmedMulligans.has("player"),
    });
  }
  if (room.opponent) {
    io.to(room.opponent.socketId).emit("game:state", {
      state: perspectiveFor(room.state, "opponent"),
      status: room.status,
      mulliganConfirmed: room.confirmedMulligans.has("opponent"),
    });
  }
}

function emitRoomPayload(target: Socket | ReturnType<typeof io.to>, room: RoomState, role: Seat) {
  const own = role === "player" ? room.player : room.opponent;
  const other = role === "player" ? room.opponent : room.player;
  const payload: RoomPayload = {
    opponentFriendCode: other?.friendCode,
    opponentName: other?.displayName,
    playerFriendCode: own?.friendCode,
    playerName: own?.displayName,
    roomCode: room.code,
    role,
    status: room.status,
    playerCount: Number(Boolean(room.player)) + Number(Boolean(room.opponent)),
  };
  target.emit("room:update", payload);
}

function leavePreviousRoom(socket: Socket) {
  const code = socketRooms.get(socket.id);
  socketRooms.delete(socket.id);
  if (!code) return;

  const room = rooms.get(code);
  if (!room) return;

  let changed = false;
  if (room.player?.socketId === socket.id) {
    room.player = undefined;
    room.confirmedMulligans.delete("player");
    changed = true;
  }
  if (room.opponent?.socketId === socket.id) {
    room.opponent = undefined;
    room.confirmedMulligans.delete("opponent");
    changed = true;
  }

  if (!room.player && !room.opponent) {
    rooms.delete(code);
    return;
  }

  if (changed) {
    room.state = undefined;
    room.status = room.player ? "waiting" : "waiting";
    io.to(code).emit("room:event", { text: "Ein Spieler hat den Raum verlassen." });
    broadcastRoom(room);
  }
}

function pruneDisconnectedPlayers(room: RoomState) {
  let changed = false;
  if (room.player && !io.sockets.sockets.has(room.player.socketId)) {
    socketRooms.delete(room.player.socketId);
    room.player = undefined;
    room.confirmedMulligans.delete("player");
    changed = true;
  }
  if (room.opponent && !io.sockets.sockets.has(room.opponent.socketId)) {
    socketRooms.delete(room.opponent.socketId);
    room.opponent = undefined;
    room.confirmedMulligans.delete("opponent");
    changed = true;
  }
  if (!changed) return;

  room.state = undefined;
  room.status = "waiting";
  if (!room.player && !room.opponent) rooms.delete(room.code);
}

function perspectiveFor(state: GameState, role: Seat): GameState {
  if (role === "player") return state;
  return {
    ...state,
    activePlayer: state.activePlayer === "player" ? "opponent" : "player",
    playerFaction: state.opponentFaction,
    opponentFaction: state.playerFaction,
    player: state.opponent,
    opponent: state.player,
    deck: state.opponentDeck,
    hand: state.opponentHand,
    opponentDeck: state.deck,
    opponentHand: state.hand,
    playerBoard: state.opponentBoard,
    opponentBoard: state.playerBoard,
    winner: state.winner ? (state.winner === "player" ? "opponent" : "player") : undefined,
  };
}

function makeOnlinePlayer(socket: Socket, payload: JoinPayload): OnlinePlayer {
  const faction = normalizeFaction(payload.faction);
  return {
    socketId: socket.id,
    faction,
    deck: validDeck(payload.deck) ? payload.deck : starterDecks[faction],
    displayName: normalizeDisplayName(payload.displayName),
    friendCode: normalizeFriendCode(payload.friendCode),
  };
}

function roleForSocket(room: RoomState, socketId: string): Seat | null {
  if (room.player?.socketId === socketId) return "player";
  if (room.opponent?.socketId === socketId) return "opponent";
  return null;
}

function validDeck(deck: string[] | undefined): deck is string[] {
  return Array.isArray(deck) && deck.length === 30 && deck.every((cardId) => typeof cardId === "string");
}

function normalizeFaction(faction: FactionId | undefined): "raver" | "awareness" | "dealer" {
  if (faction === "awareness" || faction === "dealer") return faction;
  return "raver";
}

function normalizeRoomCode(roomCode: string | undefined) {
  const code = roomCode?.trim().toUpperCase();
  return code && /^[A-Z0-9]{4}$/.test(code) ? code : null;
}

function normalizeDisplayName(displayName: string | undefined) {
  const clean = displayName?.trim().replace(/\s+/g, " ").slice(0, 18);
  return clean || "Spieler";
}

function normalizeFriendCode(friendCode: string | undefined) {
  const clean = friendCode?.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12);
  return clean || "OHNE-CODE";
}

function uniqueRoomCode() {
  let code = "";
  do {
    code = Math.random().toString(36).slice(2, 6).toUpperCase();
  } while (rooms.has(code));
  return code;
}

function sanitizeIndexes(indexes: number[] | undefined) {
  if (!Array.isArray(indexes)) return [];
  return indexes
    .filter((index) => Number.isInteger(index) && index >= 0 && index < 4)
    .slice(0, 4);
}

function mimeType(filePath: string) {
  const types: Record<string, string> = {
    ".css": "text/css",
    ".html": "text/html",
    ".js": "text/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
  };
  return types[extname(filePath)] ?? "application/octet-stream";
}

const port = Number(process.env.PORT ?? 3001);
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Nebenwirkungen server listening on http://0.0.0.0:${port}`);
});
