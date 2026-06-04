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
  clientId: string;
  connected: boolean;
  disconnectedAt?: number;
  socketId?: string;
  faction: FactionId;
  deck: string[];
  displayName: string;
  friendCode: string;
}

interface RoomState {
  code: string;
  confirmedMulligans: Set<Seat>;
  cleanupTimer?: ReturnType<typeof setTimeout>;
  turnEndsAt?: number;
  turnTimer?: ReturnType<typeof setTimeout>;
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
  clientId?: string;
  displayName?: string;
  friendCode?: string;
  roomCode?: string;
  faction?: FactionId;
  deck?: string[];
}

interface GameActionPayload {
  attackerId?: string;
  cardId?: string;
  clientId?: string;
  roomCode?: string;
  targetId?: string;
}

const rooms = new Map<string, RoomState>();
const socketRooms = new Map<string, string>();
const ROOM_RECONNECT_TTL_MS = 10 * 60 * 1000;
const TURN_LIMIT_MS = 90 * 1000;

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
    leavePreviousRoom(socket, true);
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
    leavePreviousRoom(socket, true);
    const code = normalizeRoomCode(payload.roomCode);
    if (!code) {
      socket.emit("room:error", { message: "Raumcode fehlt." });
      return;
    }

    const room = rooms.get(code);
    if (!room || !room.player) {
      socket.emit("room:error", { message: "Raum nicht gefunden." });
      return;
    }
    const reconnectRole = roleForClient(room, normalizeClientId(payload.clientId));
    if (reconnectRole) {
      reconnectPlayer(socket, room, reconnectRole, payload);
      return;
    }
    if (room.opponent) {
      socket.emit("room:error", { message: "Raum ist bereits voll." });
      return;
    }

    room.opponent = makeOnlinePlayer(socket, payload);
    socket.join(code);
    socketRooms.set(socket.id, code);
    startRoomIfReady(room);
    broadcastRoom(room);
  });

  socket.on("room:reconnect", (payload: JoinPayload) => {
    const code = normalizeRoomCode(payload.roomCode);
    const clientId = normalizeClientId(payload.clientId);
    if (!code || !clientId) {
      socket.emit("room:error", { message: "Reconnect fehlgeschlagen: Raum oder Spieler-ID fehlt." });
      return;
    }

    const room = rooms.get(code);
    if (!room) {
      socket.emit("room:error", { message: "Raum nicht gefunden. Erstelle einen neuen Raum." });
      return;
    }

    const role = roleForClient(room, clientId);
    if (!role) {
      socket.emit("room:error", { message: "Reconnect fehlgeschlagen: Dieser Spieler gehoert nicht zu diesem Raum." });
      return;
    }

    reconnectPlayer(socket, room, role, payload);
  });

  socket.on("game:play-card", (payload: GameActionPayload) => {
    socket.emit("game:debug", {
      message: payload.targetId
        ? `Server empfaengt Karte ${payload.cardId ?? "?"} auf Ziel ${payload.targetId}.`
        : `Server empfaengt Karte ${payload.cardId ?? "?"}.`,
    });
    updateRoomState(
      socket,
      payload.roomCode,
      (state, role) => (payload.cardId ? playCardForSide(state, role, payload.cardId, payload.targetId) : state),
      payload.clientId,
    );
  });

  socket.on("game:attack-hero", (payload: GameActionPayload) => {
    updateRoomState(
      socket,
      payload.roomCode,
      (state, role) => (payload.attackerId ? attackHeroForSide(state, role, payload.attackerId) : state),
      payload.clientId,
    );
  });

  socket.on("game:attack-minion", (payload: GameActionPayload) => {
    updateRoomState(
      socket,
      payload.roomCode,
      (state, role) =>
        payload.attackerId && payload.targetId ? attackMinionForSide(state, role, payload.attackerId, payload.targetId) : state,
      payload.clientId,
    );
  });

  socket.on("game:end-turn", (payload: GameActionPayload) => {
    updateRoomState(socket, payload.roomCode, (state, role) => endTurnForSide(state, role), payload.clientId);
  });

  socket.on("game:hero-power", (payload: GameActionPayload) => {
    updateRoomState(socket, payload.roomCode, (state, role) => useHeroPowerForSide(state, role, payload.targetId), payload.clientId);
  });

  socket.on("game:emergency-action", (payload: GameActionPayload) => {
    updateRoomState(socket, payload.roomCode, (state, role) => emergencyActionForSide(state, role), payload.clientId);
  });

  socket.on("game:mulligan-confirm", (payload: { clientId?: string; roomCode?: string; selectedIndexes?: number[] }) => {
    const code = normalizeRoomCode(payload.roomCode) ?? socketRooms.get(socket.id);
    const room = code ? rooms.get(code) : undefined;
    if (!room?.state || room.status !== "mulligan") {
      socket.emit("room:error", { message: "Mulligan ist nicht aktiv." });
      return;
    }
    const reconnectRole = roleForClient(room, normalizeClientId(payload.clientId));
    if (reconnectRole && room[reconnectRole]?.socketId !== socket.id) reconnectPlayer(socket, room, reconnectRole, payload);
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
      scheduleTurnTimer(room);
    }
    broadcastRoom(room);
  });

  socket.on("disconnect", () => {
    leavePreviousRoom(socket);
  });
});

function updateRoomState(
  socket: Socket,
  roomCode: string | undefined,
  apply: (state: GameState, role: Seat) => GameState,
  clientId?: string,
) {
  const code = socketRooms.get(socket.id) ?? normalizeRoomCode(roomCode);
  const room = code ? rooms.get(code) : undefined;
  if (!room) {
    socket.emit("room:error", { message: `Raum ${code ?? "?"} existiert auf dem Server nicht mehr.` });
    return;
  }

  const reconnectRole = roleForClient(room, normalizeClientId(clientId));
  if (reconnectRole && room[reconnectRole]?.socketId !== socket.id) {
    reconnectPlayer(socket, room, reconnectRole, { clientId, roomCode: code ?? undefined });
  }

  if (!room.state) {
    socket.emit("room:error", { message: `Raum ${room.code} hat keinen Spielstand mehr. Status: ${room.status}.` });
    return;
  }
  if (room.status !== "playing") {
    socket.emit("room:error", { message: `Raum ${room.code} ist nicht im Spielmodus. Status: ${room.status}.` });
    return;
  }
  const role = roleForSocket(room, socket.id);
  if (!role) {
    socket.emit("room:error", { message: "Du sitzt nicht in diesem Raum." });
    return;
  }
  const previousActivePlayer = room.state.activePlayer;
  room.state = apply(room.state, role);
  if (room.state.winner) clearTurnTimer(room);
  else if (room.state.activePlayer !== previousActivePlayer) scheduleTurnTimer(room);
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
  if (room.player?.socketId) emitRoomPayload(io.to(room.player.socketId), room, "player");
  if (room.opponent?.socketId) emitRoomPayload(io.to(room.opponent.socketId), room, "opponent");
  if (!room.state) return;
  if (room.player?.socketId) {
    io.to(room.player.socketId).emit("game:state", {
      state: perspectiveFor(room.state, "player"),
      status: room.status,
      mulliganConfirmed: room.confirmedMulligans.has("player"),
      turnEndsAt: room.turnEndsAt,
    });
  }
  if (room.opponent?.socketId) {
    io.to(room.opponent.socketId).emit("game:state", {
      state: perspectiveFor(room.state, "opponent"),
      status: room.status,
      mulliganConfirmed: room.confirmedMulligans.has("opponent"),
      turnEndsAt: room.turnEndsAt,
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

function leavePreviousRoom(socket: Socket, intentional = false) {
  const code = socketRooms.get(socket.id);
  socketRooms.delete(socket.id);
  if (!code) return;

  const room = rooms.get(code);
  if (!room) return;

  let changed = false;
  if (room.player?.socketId === socket.id) {
    markPlayerDisconnected(room.player);
    if (intentional && room.status === "waiting" && !room.state) room.player = undefined;
    changed = true;
  }
  if (room.opponent?.socketId === socket.id) {
    markPlayerDisconnected(room.opponent);
    if (intentional && room.status === "waiting" && !room.state) room.opponent = undefined;
    changed = true;
  }

  if (!room.player && !room.opponent) {
    rooms.delete(code);
    return;
  }

  if (changed) {
    scheduleRoomCleanup(room);
    io.to(code).emit("room:event", { text: "Ein Spieler ist getrennt. Der Raum bleibt fuer Reconnect offen." });
    broadcastRoom(room);
  }
}

function markPlayerDisconnected(player: OnlinePlayer) {
  player.connected = false;
  player.disconnectedAt = Date.now();
  player.socketId = undefined;
}

function reconnectPlayer(socket: Socket, room: RoomState, role: Seat, payload: JoinPayload) {
  leavePreviousRoom(socket, true);
  const player = role === "player" ? room.player : room.opponent;
  if (!player) {
    socket.emit("room:error", { message: "Reconnect fehlgeschlagen: Sitzplatz fehlt." });
    return;
  }

  player.socketId = socket.id;
  player.connected = true;
  player.disconnectedAt = undefined;
  player.displayName = normalizeDisplayName(payload.displayName) || player.displayName;
  player.friendCode = normalizeFriendCode(payload.friendCode) || player.friendCode;
  socket.join(room.code);
  socketRooms.set(socket.id, room.code);
  clearRoomCleanup(room);
  socket.emit("room:event", { text: "Wieder mit dem Raum verbunden." });
  broadcastRoom(room);
}

function scheduleRoomCleanup(room: RoomState) {
  clearRoomCleanup(room);
  room.cleanupTimer = setTimeout(() => {
    const current = rooms.get(room.code);
    if (!current) return;
    const hasConnectedPlayer = Boolean(current.player?.connected || current.opponent?.connected);
    if (hasConnectedPlayer) return;
    clearTurnTimer(current);
    rooms.delete(current.code);
  }, ROOM_RECONNECT_TTL_MS);
}

function clearRoomCleanup(room: RoomState) {
  if (!room.cleanupTimer) return;
  clearTimeout(room.cleanupTimer);
  room.cleanupTimer = undefined;
}

function scheduleTurnTimer(room: RoomState) {
  clearTurnTimer(room);
  if (!room.state || room.status !== "playing" || room.state.winner) return;
  room.turnEndsAt = Date.now() + TURN_LIMIT_MS;
  room.turnTimer = setTimeout(() => {
    const current = rooms.get(room.code);
    if (!current?.state || current.status !== "playing" || current.state.winner) return;
    const side = current.state.activePlayer;
    current.state = endTurnForSide(current.state, side);
    if (current.state.winner) clearTurnTimer(current);
    else scheduleTurnTimer(current);
    broadcastRoom(current);
  }, TURN_LIMIT_MS);
}

function clearTurnTimer(room: RoomState) {
  if (room.turnTimer) clearTimeout(room.turnTimer);
  room.turnTimer = undefined;
  room.turnEndsAt = undefined;
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
    clientId: normalizeClientId(payload.clientId) ?? socket.id,
    connected: true,
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

function roleForClient(room: RoomState, clientId: string | null): Seat | null {
  if (!clientId) return null;
  if (room.player?.clientId === clientId) return "player";
  if (room.opponent?.clientId === clientId) return "opponent";
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

function normalizeClientId(clientId: string | undefined) {
  const clean = clientId?.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48);
  return clean || null;
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
