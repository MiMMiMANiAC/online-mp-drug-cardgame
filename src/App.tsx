import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { EventLog } from "./components/EventLog";
import { deckForFaction, type FriendEntry, GameSetup } from "./components/GameSetup";
import { GameBoard } from "./components/GameBoard";
import { MulliganScreen } from "./components/MulliganScreen";
import { TurnBanner } from "./components/TurnBanner";
import { playSound, setMasterVolume, setSoundEnabled, unlockAudio } from "./audio/sound";
import { cardById } from "./game/cards";
import {
  attackOpponentHero,
  attackOpponentMinion,
  emergencyAction as useEmergencyGameAction,
  endTurn,
  HERO_POWER_COSTS,
  playCard as playGameCard,
  useHeroPower as useGameHeroPower,
} from "./game/actions";
import { buildMatchReport } from "./game/report";
import { confirmMulligan, createGameState, initialGameState, starterDecks } from "./game/state";
import { canPlayCard, targetForCard } from "./game/rules";
import type { FactionId, GamePhase } from "./game/types";

type TurnBannerTone = "player" | "opponent" | "victory" | "defeat";
type OnlineRole = "player" | "opponent";
type OnlineStatus = "waiting" | "mulligan" | "playing";
type OnlineSession = {
  clientId: string;
  displayName: string;
  friendCode: string;
  role: OnlineRole;
  roomCode: string;
};
type OnlineStatePayload = {
  mulliganConfirmed?: boolean;
  state: typeof initialGameState;
  status: OnlineStatus;
  turnEndsAt?: number;
};
type RoomErrorPayload = {
  code?: "ROOM_NOT_FOUND" | string;
  message: string;
  roomCode?: string;
};
type RoomUpdatePayload = {
  opponentFriendCode?: string;
  opponentName?: string;
  playerFriendCode?: string;
  playerName?: string;
  roomCode: string;
  role: OnlineRole;
  status: OnlineStatus;
  playerCount: number;
};

export function App() {
  const [screen, setScreen] = useState<GamePhase>("deckbuilding");
  const [onlineMode, setOnlineMode] = useState(false);
  const [onlineRoomCode, setOnlineRoomCode] = useState("");
  const [onlineServerUrl, setOnlineServerUrl] = useState(() => localStorage.getItem("nebenwirkungen-online-server") ?? "");
  const [onlineShareLink, setOnlineShareLink] = useState("");
  const [onlineStatus, setOnlineStatus] = useState("");
  const [onlineError, setOnlineError] = useState("");
  const [onlineRole, setOnlineRole] = useState<OnlineRole | null>(null);
  const [onlineMulliganConfirmed, setOnlineMulliganConfirmed] = useState(false);
  const [onlineClientId] = useState(() => getOrCreateClientId());
  const [onlineTurnEndsAt, setOnlineTurnEndsAt] = useState<number | null>(null);
  const [turnSecondsLeft, setTurnSecondsLeft] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem("nebenwirkungen-player-name") ?? "Spieler");
  const [playerFriendCode] = useState(() => getOrCreateFriendCode());
  const [friendCodeDraft, setFriendCodeDraft] = useState("");
  const [friends, setFriends] = useState<FriendEntry[]>(() => loadFriends());
  const [onlineOwnName, setOnlineOwnName] = useState("");
  const [onlineOpponentName, setOnlineOpponentName] = useState("");
  const [selectedFaction, setSelectedFaction] = useState<FactionId>("raver");
  const [deck, setDeck] = useState<string[]>(deckForFaction("raver"));
  const [mulliganIndexes, setMulliganIndexes] = useState<number[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedAttackerId, setSelectedAttackerId] = useState<string | null>(null);
  const [selectedHeroPower, setSelectedHeroPower] = useState(false);
  const [playedCardId, setPlayedCardId] = useState<string>("");
  const [pauseMenuOpen, setPauseMenuOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.8);
  const [updateStatus, setUpdateStatus] = useState<DesktopUpdateStatus>({
    message: "Updater wartet.",
    state: "idle",
  });
  const [actionPopup, setActionPopup] = useState<{ title: string; text: string; visible: boolean } | null>(null);
  const [diagnosticPopup, setDiagnosticPopup] = useState<{ title: string; text: string; visible: boolean } | null>(null);
  const [turnBanner, setTurnBanner] = useState<{ message: string; tone: TurnBannerTone; visible: boolean }>({
    message: "Du bist am Zug",
    tone: "player",
    visible: false,
  });
  const [state, setState] = useState(initialGameState);
  const latestOnlineStateRef = useRef(initialGameState);
  const onlineRoleRef = useRef<OnlineRole | null>(null);
  const onlineRoomCodeRef = useRef("");
  const socketRef = useRef<Socket | null>(null);
  const lastTurnRef = useRef("");

  const selectedCard = useMemo(
    () => (selectedCardId ? cardById.get(selectedCardId) ?? null : null),
    [selectedCardId],
  );
  const canPlaySelected = selectedCard
    ? state.activePlayer === "player" && state.hand.includes(selectedCard.id) && canPlayCard(selectedCard, state.player)
    : false;
  const selectedTarget = selectedCardId ? targetForCard(selectedCardId) : null;
  const heroPowerNeedsTarget = state.playerFaction === "awareness";
  const heroPowerCost = HERO_POWER_COSTS[state.playerFaction as keyof typeof HERO_POWER_COSTS] ?? 3;
  const canUseHeroPower =
    state.activePlayer === "player" && !state.winner && !state.player.heroPowerUsed && state.player.cash >= heroPowerCost;
  const playerSeat = onlineMode ? onlineOwnName || playerName || (onlineRole === "opponent" ? "Spieler 2" : "Spieler 1") : "Spieler 1";
  const opponentSeat = onlineMode ? onlineOpponentName || (onlineRole === "opponent" ? "Spieler 1" : "Spieler 2") : "Spieler 2";
  const playerPortrait = onlineMode ? (onlineRole === "opponent" ? "P2" : "P1") : "P1";
  const opponentPortrait = onlineMode ? (onlineRole === "opponent" ? "P1" : "P2") : "P2";

  useEffect(() => {
    setSoundEnabled(soundOn);
    setMasterVolume(soundVolume);
  }, [soundOn, soundVolume]);

  useEffect(() => {
    localStorage.setItem("nebenwirkungen-online-server", onlineServerUrl);
  }, [onlineServerUrl]);

  useEffect(() => {
    localStorage.setItem("nebenwirkungen-player-name", cleanPlayerName(playerName));
  }, [playerName]);

  useEffect(() => {
    localStorage.setItem("nebenwirkungen-friends", JSON.stringify(friends));
  }, [friends]);

  useEffect(() => {
    const unsubscribe = window.nebenwirkungenDesktop?.onUpdateStatus((status) => {
      setUpdateStatus(status);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = window.nebenwirkungenDesktop?.onEscape(() => {
      togglePauseMenu();
    });
    if (unsubscribe) return unsubscribe;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      togglePauseMenu();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (screen !== "playing") return;
    const key = `${state.turn}-${state.activePlayer}-${state.winner ?? "live"}`;
    if (lastTurnRef.current === key) return;
    lastTurnRef.current = key;

    const message = state.winner
      ? state.winner === "player"
        ? "Sieg"
        : "Niederlage"
      : state.activePlayer === "player"
        ? "Du bist am Zug"
        : "Gegner ist am Zug";
    const tone = state.winner
      ? state.winner === "player"
        ? "victory"
        : "defeat"
      : state.activePlayer === "player"
        ? "player"
        : "opponent";

    setTurnBanner({ message, tone, visible: true });
    if (state.winner === "player") playSound("victory");
    else if (state.winner === "opponent") playSound("defeat");
    else if (state.activePlayer === "player") playSound("turn-start");

    const timeout = window.setTimeout(() => {
      setTurnBanner((current) => ({ ...current, visible: false }));
    }, state.winner ? 1800 : 1450);
    return () => window.clearTimeout(timeout);
  }, [screen, state.activePlayer, state.turn, state.winner]);

  useEffect(() => {
    if (screen !== "playing") return;
    const latest = state.events[0];
    if (!latest?.text.startsWith("Heldenskill")) return;
    setActionPopup({
      title: latest.text.split(":")[0] ?? "Heldenskill",
      text: latest.details ?? latest.text,
      visible: true,
    });
    const timeout = window.setTimeout(() => {
      setActionPopup((current) => (current ? { ...current, visible: false } : current));
    }, 1800);
    return () => window.clearTimeout(timeout);
  }, [screen, state.events]);

  useEffect(() => {
    const urlRoom = new URLSearchParams(window.location.search).get("room");
    if (urlRoom) setOnlineRoomCode(urlRoom.toUpperCase());
  }, []);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!onlineTurnEndsAt || screen !== "playing") {
      setTurnSecondsLeft(null);
      return;
    }
    const turnEndsAt = onlineTurnEndsAt;

    function updateSecondsLeft() {
      setTurnSecondsLeft(Math.max(0, Math.ceil((turnEndsAt - Date.now()) / 1000)));
    }

    updateSecondsLeft();
    const interval = window.setInterval(updateSecondsLeft, 250);
    return () => window.clearInterval(interval);
  }, [onlineTurnEndsAt, screen]);

  function selectCard(cardId: string) {
    if (state.winner) return;
    unlockAudio();
    playSound("button");
    setSelectedAttackerId(null);
    setSelectedHeroPower(false);
    setSelectedCardId(cardId);
    setPlayedCardId(cardId);
  }

  function playSelectedCard() {
    if (!selectedCardId || state.winner) return;
    if (selectedTarget) return;
    unlockAudio();
    playSound("card-play");
    if (onlineMode) {
      showDiagnostic("Online-Diagnose", `Client sendet Karte: ${selectedCard?.name ?? selectedCardId}.`);
      socketRef.current?.emit("game:play-card", onlineActionPayload({ cardId: selectedCardId }));
    } else {
      setState((current) => playGameCard(current, selectedCardId));
    }
    setSelectedCardId(null);
    setSelectedHeroPower(false);
  }

  function playSelectedCardOnTarget(targetId: string) {
    if (!selectedCardId || !selectedTarget || !canPlaySelected || state.winner) return;
    unlockAudio();
    playSound("card-play");
    const targetCard =
      [...state.playerBoard, ...state.opponentBoard].find((boardCard) => boardCard.instanceId === targetId)?.cardId ?? targetId;
    const targetName = cardById.get(targetCard)?.name ?? targetCard;
    if (onlineMode) {
      showDiagnostic(
        "Online-Diagnose",
        `Zielklick angekommen: ${selectedCard?.name ?? selectedCardId} -> ${targetName}. Sende an Server.`,
      );
      socketRef.current?.emit("game:play-card", onlineActionPayload({ cardId: selectedCardId, targetId }));
    } else {
      setState((current) => playGameCard(current, selectedCardId, targetId));
    }
    setSelectedCardId(null);
    setSelectedHeroPower(false);
  }

  function playHandCard(cardId: string, targetId?: string) {
    const card = cardById.get(cardId);
    if (!card || state.winner) return;
    if (state.activePlayer !== "player" || !state.hand.includes(cardId) || !canPlayCard(card, state.player)) {
      selectCard(cardId);
      return;
    }
    const target = targetForCard(cardId);
    if (target && !targetId) {
      selectCard(cardId);
      return;
    }
    if (!target && targetId) return;

    unlockAudio();
    playSound("card-play");
    if (onlineMode) {
      showDiagnostic(
        "Online-Diagnose",
        targetId ? `Client sendet ${card.name} auf Ziel ${targetId}.` : `Client sendet ${card.name}.`,
      );
      socketRef.current?.emit("game:play-card", onlineActionPayload({ cardId, targetId }));
    } else {
      setState((current) => playGameCard(current, cardId, targetId));
    }
    setSelectedCardId(null);
    setSelectedAttackerId(null);
    setSelectedHeroPower(false);
    setPlayedCardId(cardId);
  }

  function useHeroPower(targetId?: string) {
    if (state.winner || !canUseHeroPower) return;
    if (heroPowerNeedsTarget && !targetId) {
      unlockAudio();
      playSound("button");
      setSelectedCardId(null);
      setSelectedAttackerId(null);
      setSelectedHeroPower((current) => !current);
      return;
    }

    unlockAudio();
    playSound("card-play");
    if (onlineMode) {
      socketRef.current?.emit("game:hero-power", onlineActionPayload({ targetId }));
    } else {
      setState((current) => useGameHeroPower(current, targetId));
    }
    setSelectedCardId(null);
    setSelectedAttackerId(null);
    setSelectedHeroPower(false);
  }

  function useEmergencyAction() {
    if (state.winner || state.activePlayer !== "player") return;
    unlockAudio();
    playSound("button");
    if (onlineMode) {
      socketRef.current?.emit("game:emergency-action", onlineActionPayload());
    } else {
      setState((current) => useEmergencyGameAction(current));
    }
    setSelectedCardId(null);
    setSelectedAttackerId(null);
    setSelectedHeroPower(false);
  }

  function showDiagnostic(title: string, text: string) {
    setDiagnosticPopup({ title, text, visible: true });
    window.setTimeout(() => {
      setDiagnosticPopup((current) => (current ? { ...current, visible: false } : current));
    }, 2600);
  }

  function onlineActionPayload(extra: Record<string, string | undefined> = {}) {
    return { clientId: onlineClientId, role: onlineRole ?? undefined, roomCode: onlineRoomCode, ...extra };
  }

  function recoverOnlineRoom(socket: Socket, missingRoomCode?: string) {
    const roomCode = normalizeRoomCode(missingRoomCode ?? onlineRoomCodeRef.current ?? onlineRoomCode);
    const role = onlineRoleRef.current ?? onlineRole;
    if (!roomCode || !role) {
      setOnlineStatus("Recovery nicht moeglich: Raum oder Spielerrolle fehlt.");
      return;
    }

    setOnlineStatus(`Raum ${roomCode} wird aus dem letzten Spielstand wiederhergestellt...`);
    socket.emit("room:recover", {
      clientId: onlineClientId,
      displayName: cleanPlayerName(playerName),
      friendCode: playerFriendCode,
      role,
      roomCode,
      state: latestOnlineStateRef.current,
    });
  }


  function selectAttacker(instanceId: string) {
    if (state.winner || state.activePlayer !== "player") return;
    unlockAudio();
    playSound("button");
    setSelectedCardId(null);
    setSelectedHeroPower(false);
    setSelectedAttackerId((current) => (current === instanceId ? null : instanceId));
  }

  function attackHero() {
    if (!selectedAttackerId) return;
    unlockAudio();
    playSound("attack");
    if (onlineMode) {
      socketRef.current?.emit("game:attack-hero", onlineActionPayload({ attackerId: selectedAttackerId }));
    } else {
      setState((current) => attackOpponentHero(current, selectedAttackerId));
    }
    setSelectedAttackerId(null);
    setSelectedHeroPower(false);
  }

  function attackMinion(targetId: string) {
    if (!selectedAttackerId) return;
    unlockAudio();
    playSound("hit");
    if (onlineMode) {
      socketRef.current?.emit("game:attack-minion", onlineActionPayload({ attackerId: selectedAttackerId, targetId }));
    } else {
      setState((current) => attackOpponentMinion(current, selectedAttackerId, targetId));
    }
    setSelectedAttackerId(null);
    setSelectedHeroPower(false);
  }

  function restartGame() {
    unlockAudio();
    playSound("button");
    setPauseMenuOpen(false);
    setOptionsOpen(false);
    setSelectedCardId(null);
    setSelectedAttackerId(null);
    setSelectedHeroPower(false);
    setPlayedCardId("");
    setScreen("deckbuilding");
  }

  function exportMatchAnalysis() {
    unlockAudio();
    playSound("button");
    const report = buildMatchReport(state, {
      opponentLabel: onlineMode ? opponentSeat : "Gegner",
      playerLabel: onlineMode ? playerSeat : "Du",
    });
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const roomPart = onlineMode && onlineRoomCode ? `-${onlineRoomCode}` : "";
    link.href = url;
    link.download = `nebenwirkungen-analyse-runde-${state.turn}${roomPart}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function returnToLobby() {
    unlockAudio();
    playSound("button");
    setPauseMenuOpen(false);
    setOptionsOpen(false);
    socketRef.current?.disconnect();
    socketRef.current = null;
    setOnlineMode(false);
    setOnlineStatus("");
    setOnlineError("");
    setOnlineShareLink("");
    setOnlineRole(null);
    setOnlineMulliganConfirmed(false);
    setOnlineTurnEndsAt(null);
    setOnlineOwnName("");
    setOnlineOpponentName("");
    lastTurnRef.current = "";
    setSelectedCardId(null);
    setSelectedAttackerId(null);
    setPlayedCardId("");
    setMulliganIndexes([]);
    clearOnlineSession();
    setScreen("deckbuilding");
  }

  function leaveGame() {
    unlockAudio();
    playSound("button");
    socketRef.current?.disconnect();
    socketRef.current = null;
    if (window.nebenwirkungenDesktop?.quitApp) {
      window.nebenwirkungenDesktop.quitApp();
      return;
    }
    window.close();
    setPauseMenuOpen(false);
    setOptionsOpen(false);
  }

  function togglePauseMenu() {
    setPauseMenuOpen((current) => {
      setOptionsOpen(false);
      return !current;
    });
  }

  function toggleFullscreen() {
    unlockAudio();
    playSound("button");
    if (window.nebenwirkungenDesktop?.toggleFullscreen) {
      window.nebenwirkungenDesktop.toggleFullscreen();
      return;
    }
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void document.documentElement.requestFullscreen();
  }

  function connectOnlineSocket() {
    if (socketRef.current?.connected) return socketRef.current;
    const fallbackServerUrl =
      window.location.protocol === "file:" || window.location.port === "5173" ? "http://127.0.0.1:3001" : window.location.origin;
    const envServerUrl = (import.meta.env.VITE_MULTIPLAYER_URL as string | undefined)?.trim();
    const serverUrl = onlineServerUrl.trim() || envServerUrl || fallbackServerUrl;
    const socket = io(serverUrl, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setOnlineError("");
      setOnlineStatus("Online-Server verbunden.");
      const session = loadOnlineSession();
      if (session) {
        setOnlineStatus(`Verbinde erneut mit Raum ${session.roomCode}...`);
        socket.emit("room:reconnect", session);
      }
    });
    socket.on("disconnect", () => {
      if (onlineMode || loadOnlineSession()) {
        setOnlineStatus("Verbindung verloren. Reconnect laeuft...");
      }
    });
    socket.on("connect_error", () => {
      setOnlineError(`Online-Server nicht erreichbar: ${serverUrl}`);
    });
    socket.on("room:update", (payload: RoomUpdatePayload) => {
      setOnlineMode(true);
      setOnlineRoomCode(payload.roomCode);
      setOnlineRole(payload.role);
      onlineRoomCodeRef.current = payload.roomCode;
      onlineRoleRef.current = payload.role;
      setOnlineOwnName(payload.playerName ?? "");
      setOnlineOpponentName(payload.opponentName ?? "");
      saveOnlineSession({
        clientId: onlineClientId,
        displayName: cleanPlayerName(playerName),
        friendCode: playerFriendCode,
        role: payload.role,
        roomCode: payload.roomCode,
      });
      const isDesktopFile = window.location.protocol === "file:";
      const link = isDesktopFile ? `Raumcode: ${payload.roomCode}` : `${window.location.origin}${window.location.pathname}?room=${payload.roomCode}`;
      setOnlineShareLink(link);
      if (!isDesktopFile) window.history.replaceState(null, "", `?room=${payload.roomCode}`);
      setOnlineStatus(
        payload.status === "waiting"
          ? `Raum ${payload.roomCode}: Warte auf zweiten Spieler.`
          : payload.status === "mulligan"
            ? `Raum ${payload.roomCode}: Starthand waehlen.`
            : `Raum ${payload.roomCode}: Online-Spiel laeuft.`,
      );
    });
    socket.on("room:error", (payload: RoomErrorPayload) => {
      setOnlineError(payload.message);
      showDiagnostic("Server lehnt ab", payload.message);
      if (payload.code === "ROOM_NOT_FOUND") {
        recoverOnlineRoom(socket, payload.roomCode);
      }
    });
    socket.on("room:event", (payload: { text: string }) => {
      setOnlineStatus(payload.text);
    });
    socket.on("game:debug", (payload: { message: string }) => {
      showDiagnostic("Server-Diagnose", payload.message);
    });
    socket.on("game:state", (payload: OnlineStatePayload | typeof state) => {
      const nextState = "state" in payload ? payload.state : payload;
      const status = "state" in payload ? payload.status : "playing";
      const mulliganConfirmed = "state" in payload ? Boolean(payload.mulliganConfirmed) : false;
      const turnEndsAt = "state" in payload ? payload.turnEndsAt ?? null : null;
      latestOnlineStateRef.current = nextState;
      setState(nextState);
      setOnlineMulliganConfirmed(mulliganConfirmed);
      setOnlineTurnEndsAt(turnEndsAt);
      setSelectedCardId(null);
      setSelectedAttackerId(null);
      setSelectedHeroPower(false);
      setPlayedCardId("");
      setOnlineMode(true);
      setScreen(status === "mulligan" ? "mulligan" : "playing");
    });

    return socket;
  }

  function createOnlineRoom() {
    unlockAudio();
    playSound("button");
    setOnlineError("");
    setOnlineRole(null);
    setOnlineMulliganConfirmed(false);
    clearOnlineSession();
    lastTurnRef.current = "";
    const socket = connectOnlineSocket();
    socket.emit("room:create", {
      clientId: onlineClientId,
      faction: selectedFaction,
      deck,
      displayName: cleanPlayerName(playerName),
      friendCode: playerFriendCode,
    });
  }

  function joinOnlineRoom() {
    unlockAudio();
    playSound("button");
    setOnlineError("");
    setOnlineRole(null);
    setOnlineMulliganConfirmed(false);
    clearOnlineSession();
    lastTurnRef.current = "";
    const socket = connectOnlineSocket();
    socket.emit("room:join", {
      clientId: onlineClientId,
      roomCode: onlineRoomCode,
      faction: selectedFaction,
      deck,
      displayName: cleanPlayerName(playerName),
      friendCode: playerFriendCode,
    });
  }

  function addFriend() {
    const code = normalizeFriendCode(friendCodeDraft);
    if (!code || code === playerFriendCode) return;
    setFriends((current) => (current.some((friend) => friend.code === code) ? current : [...current, { code }]));
    setFriendCodeDraft("");
  }

  function removeFriend(friendCode: string) {
    setFriends((current) => current.filter((friend) => friend.code !== friendCode));
  }

  function selectFaction(faction: FactionId) {
    if (!["raver", "awareness", "dealer"].includes(faction)) return;
    setSelectedFaction(faction);
    setDeck(deckForFaction(faction));
  }

  function addCard(cardId: string) {
    if (deck.length >= 30) return;
    const copies = deck.filter((id) => id === cardId).length;
    if (copies >= 2) return;
    setDeck((current) => [...current, cardId]);
  }

  function removeCard(index: number) {
    setDeck((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function clearDeck() {
    setDeck([]);
  }

  function loadStarterDeck() {
    setDeck(deckForFaction(selectedFaction));
  }

  function startMatch() {
    unlockAudio();
    playSound("button");
    lastTurnRef.current = "";
    const opponentDeck = selectedFaction === "awareness" ? starterDecks.dealer : starterDecks.awareness;
    setSelectedCardId(null);
    setPlayedCardId("");
    setState(
      createGameState({
        playerFaction: selectedFaction,
        opponentFaction: selectedFaction === "awareness" ? "dealer" : "awareness",
        playerDeck: deck,
        opponentDeck,
      }),
    );
    setMulliganIndexes([]);
    setScreen("mulligan");
  }

  function toggleMulliganCard(index: number) {
    unlockAudio();
    playSound("button");
    setMulliganIndexes((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    );
  }

  function confirmStartingHand() {
    unlockAudio();
    lastTurnRef.current = "";
    if (onlineMode) {
      socketRef.current?.emit("game:mulligan-confirm", {
        ...onlineActionPayload(),
        selectedIndexes: mulliganIndexes,
      });
      setOnlineMulliganConfirmed(true);
      setMulliganIndexes([]);
      playSound("button");
      return;
    }
    playSound("turn-start");
    setState((current) => confirmMulligan(current, mulliganIndexes));
    setMulliganIndexes([]);
    setScreen("playing");
  }

  function renderPauseMenu() {
    if (!pauseMenuOpen) return null;
    return (
      <section className="pause-overlay" aria-label="Spielmenue">
        <div className="pause-card">
          <span>{onlineMode ? `Raum ${onlineRoomCode}` : screen === "deckbuilding" ? "Lobby" : "Solo-Spiel"}</span>
          <h2>{optionsOpen ? "Optionen" : "Pause"}</h2>
          {optionsOpen ? (
            <div className="options-panel">
              <label className="option-row">
                <span>Sound</span>
                <button
                  className={soundOn ? "is-active" : ""}
                  onClick={() => {
                    unlockAudio();
                    setSoundOn((current) => !current);
                  }}
                  type="button"
                >
                  {soundOn ? "An" : "Aus"}
                </button>
              </label>
              <label className="option-row">
                <span>Lautstaerke</span>
                <input
                  max="1"
                  min="0"
                  onChange={(event) => setSoundVolume(Number(event.target.value))}
                  step="0.05"
                  type="range"
                  value={soundVolume}
                />
              </label>
              <label className="option-row">
                <span>Online-Server</span>
                <input
                  onChange={(event) => setOnlineServerUrl(event.target.value)}
                  placeholder="https://dein-server.onrender.com"
                  type="url"
                  value={onlineServerUrl}
                />
              </label>
              <button type="button" onClick={toggleFullscreen}>
                Vollbild wechseln
              </button>
              <div className="update-panel">
                <strong>Updates</strong>
                <span>{updateStatus.message}</span>
                {updateStatus.state === "ready" ? (
                  <button type="button" onClick={() => window.nebenwirkungenDesktop?.installUpdate()}>
                    Update installieren
                  </button>
                ) : (
                  <button type="button" onClick={() => window.nebenwirkungenDesktop?.checkForUpdates()}>
                    Nach Updates suchen
                  </button>
                )}
              </div>
              <button type="button" onClick={() => setOptionsOpen(false)}>
                Zurueck
              </button>
            </div>
          ) : (
            <div className="pause-actions">
              <button type="button" onClick={() => setPauseMenuOpen(false)}>
                Fortsetzen
              </button>
              <button type="button" onClick={() => setOptionsOpen(true)}>
                Optionen
              </button>
              <button type="button" onClick={restartGame}>
                Spiel neu starten
              </button>
              <button type="button" onClick={returnToLobby}>
                Zur Lobby
              </button>
              <button className="danger-menu-action" type="button" onClick={leaveGame}>
                Spiel verlassen
              </button>
            </div>
          )}
          <small>ESC oeffnet und schliesst dieses Menue.</small>
        </div>
      </section>
    );
  }

  function renderUpdateNotice() {
    if (updateStatus.state !== "ready" && updateStatus.state !== "downloading" && updateStatus.state !== "error") return null;
    return (
      <div className={`update-notice is-${updateStatus.state}`}>
        <span>{updateStatus.message}</span>
        {updateStatus.state === "ready" ? (
          <button type="button" onClick={() => window.nebenwirkungenDesktop?.installUpdate()}>
            Neustart
          </button>
        ) : null}
      </div>
    );
  }

  if (screen === "deckbuilding") {
    return (
      <>
        <GameSetup
          deck={deck}
          friendCodeDraft={friendCodeDraft}
          friends={friends}
          onlineError={onlineError}
          onlineRoomCode={onlineRoomCode}
          onlineServerUrl={onlineServerUrl}
          onlineShareLink={onlineShareLink}
          onlineStatus={onlineStatus}
          playerFriendCode={playerFriendCode}
          playerName={playerName}
          selectedFaction={selectedFaction}
          onAddCard={addCard}
          onAddFriend={addFriend}
          onClearDeck={clearDeck}
          onCreateOnlineRoom={createOnlineRoom}
          onJoinOnlineRoom={joinOnlineRoom}
          onLoadStarterDeck={loadStarterDeck}
          onOnlineRoomCodeChange={setOnlineRoomCode}
          onOnlineServerUrlChange={setOnlineServerUrl}
          onPlayerNameChange={setPlayerName}
          onFriendCodeDraftChange={setFriendCodeDraft}
          onRemoveFriend={removeFriend}
          onRemoveCard={removeCard}
          onSelectFaction={selectFaction}
          onStart={startMatch}
        />
        {renderUpdateNotice()}
        {renderPauseMenu()}
      </>
    );
  }

  if (screen === "mulligan") {
    return (
      <>
        <MulliganScreen
          hand={state.hand}
          isWaiting={onlineMode && onlineMulliganConfirmed}
          selectedIndexes={mulliganIndexes}
          onConfirm={confirmStartingHand}
          onToggleCard={toggleMulliganCard}
        />
        {renderUpdateNotice()}
        {renderPauseMenu()}
      </>
    );
  }

  return (
    <main className="app-shell">
      <TurnBanner message={turnBanner.message} tone={turnBanner.tone} visible={turnBanner.visible} />
      {renderUpdateNotice()}
      {actionPopup ? (
        <div className={`action-popup ${actionPopup.visible ? "is-visible" : ""}`}>
          <strong>{actionPopup.title}</strong>
          <span>{actionPopup.text}</span>
        </div>
      ) : null}
      {diagnosticPopup ? (
        <div className={`action-popup diagnostic-popup ${diagnosticPopup.visible ? "is-visible" : ""}`}>
          <strong>{diagnosticPopup.title}</strong>
          <span>{diagnosticPopup.text}</span>
        </div>
      ) : null}
      <header className="topbar">
        <div className={`turn-chip ${state.activePlayer === "player" ? "is-you" : "is-them"}`}>
          <strong>{onlineMode ? `Du bist ${playerSeat}` : "Solo-Spiel"}</strong>
          <span>
            {state.activePlayer === "player" ? "Du bist am Zug" : "Gegner ist am Zug"}
            {onlineMode && turnSecondsLeft !== null ? ` · ${turnSecondsLeft}s` : ""}
          </span>
        </div>
      </header>

      <section className="game-frame">
        <EventLog
          events={state.events}
          opponentLabel={opponentSeat}
          opponentPortrait={opponentPortrait}
          opponentSubLabel="Gegner"
          playerLabel={playerSeat}
          playerPortrait={playerPortrait}
          playerSubLabel="Du"
        />
        <GameBoard
          state={state}
          playedCardId={playedCardId}
          selectedCardId={selectedCardId}
          selectedTarget={canPlaySelected ? selectedTarget : null}
          selectedHeroPower={selectedHeroPower}
          selectedAttackerId={selectedAttackerId}
          onSelectAttacker={selectAttacker}
          onAttackOpponentHero={attackHero}
          onAttackOpponentMinion={attackMinion}
          onSelectHandCard={selectCard}
          onPlayHandCard={playHandCard}
          onEmergencyAction={useEmergencyAction}
          onUseHeroPower={useHeroPower}
          onPlaySelected={playSelectedCard}
          onPlaySelectedOnTarget={playSelectedCardOnTarget}
          opponentTitle={onlineMode ? opponentSeat : "Gegner"}
          playerTitle={onlineMode ? `Du - ${playerSeat}` : "Du"}
          selectedCard={selectedCard}
          canPlaySelected={canPlaySelected}
          canUseHeroPower={canUseHeroPower}
          onEndTurn={() => {
            unlockAudio();
            playSound("button");
            setSelectedCardId(null);
            setSelectedAttackerId(null);
            setSelectedHeroPower(false);
            if (onlineMode) socketRef.current?.emit("game:end-turn", onlineActionPayload());
            else setState((current) => endTurn(current));
          }}
        />
      </section>

      {state.winner ? (
        <section className={`endgame-overlay ${state.winner === "player" ? "is-victory" : "is-defeat"}`}>
          <div className="endgame-card">
            <span>{state.winner === "player" ? "Sieg" : "Niederlage"}</span>
            <h2>{state.winner === "player" ? "Du hast den Gegner gebrochen" : "Du bist gebrochen"}</h2>
            <p>
              {state.winner === "player"
                ? "Gesundheit oder Stabilität des Gegners ist auf 0 gefallen."
                : "Deine Gesundheit oder Stabilität ist auf 0 gefallen."}
            </p>
            <button type="button" onClick={restartGame}>
              Neues Spiel
            </button>
            <button className="secondary-endgame-action" type="button" onClick={exportMatchAnalysis}>
              Analyse exportieren
            </button>
          </div>
        </section>
      ) : null}

      {renderPauseMenu()}
    </main>
  );
}

function cleanPlayerName(name: string) {
  return name.trim().replace(/\s+/g, " ").slice(0, 18) || "Spieler";
}

function normalizeFriendCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12);
}

function getOrCreateFriendCode() {
  const stored = localStorage.getItem("nebenwirkungen-friend-code");
  if (stored) return stored;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let index = 0; index < 5; index += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  const code = `NW-${suffix}`;
  localStorage.setItem("nebenwirkungen-friend-code", code);
  return code;
}

function getOrCreateClientId() {
  const stored = localStorage.getItem("nebenwirkungen-client-id");
  if (stored) return stored;
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let index = 0; index < 32; index += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  const id = `client_${suffix}`;
  localStorage.setItem("nebenwirkungen-client-id", id);
  return id;
}

function saveOnlineSession(session: OnlineSession) {
  localStorage.setItem("nebenwirkungen-online-session", JSON.stringify(session));
}

function loadOnlineSession(): OnlineSession | null {
  try {
    const parsed = JSON.parse(localStorage.getItem("nebenwirkungen-online-session") ?? "null");
    if (!parsed || typeof parsed !== "object") return null;
    const roomCode = normalizeRoomCode(String(parsed.roomCode ?? ""));
    const clientId = String(parsed.clientId ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48);
    const role = parsed.role === "player" || parsed.role === "opponent" ? parsed.role : null;
    if (!roomCode || !clientId || !role) return null;
    return {
      clientId,
      displayName: cleanPlayerName(String(parsed.displayName ?? "Spieler")),
      friendCode: normalizeFriendCode(String(parsed.friendCode ?? "")),
      role,
      roomCode,
    };
  } catch {
    return null;
  }
}

function clearOnlineSession() {
  localStorage.removeItem("nebenwirkungen-online-session");
}

function normalizeRoomCode(roomCode: string) {
  const code = roomCode.trim().toUpperCase();
  return /^[A-Z0-9]{4}$/.test(code) ? code : "";
}

function loadFriends(): FriendEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem("nebenwirkungen-friends") ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({ code: normalizeFriendCode(String(item?.code ?? "")) }))
      .filter((item) => item.code);
  } catch {
    return [];
  }
}
