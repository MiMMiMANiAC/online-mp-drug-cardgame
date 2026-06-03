import { cardById } from "./cards";
import type { BoardCard, GameEvent, GameState, PlayerStats } from "./types";

interface ReportLabels {
  opponentLabel: string;
  playerLabel: string;
}

export function buildMatchReport(state: GameState, labels: ReportLabels) {
  const lines = [
    "NEBENWIRKUNGEN - MATCH-ANALYSE",
    `Erstellt: ${new Date().toLocaleString("de-DE")}`,
    "",
    "ERGEBNIS",
    `Gewinner: ${winnerLabel(state, labels)}`,
    `Letzte Runde: ${state.turn}`,
    `Aktiver Spieler beim Ende: ${state.activePlayer === "player" ? labels.playerLabel : labels.opponentLabel}`,
    "",
    "ENDSTAND",
    formatStats(labels.playerLabel, state.player),
    `Hand/Deck: ${state.hand.length}/${state.deck.length}`,
    formatBoard("Board", state.playerBoard),
    "",
    formatStats(labels.opponentLabel, state.opponent),
    `Hand/Deck: ${state.opponentHand.length}/${state.opponentDeck.length}`,
    formatBoard("Board", state.opponentBoard),
    "",
    "AKTIONSVERLAUF",
    ...formatEvents(state.analysisEvents),
    "",
    "BALANCING-HINWEISE",
    "- Pruefe Karten, die oft gespielt werden und direkt Gesundheit/Stabilitaet stark veraendern.",
    "- Pruefe Runden, in denen Cash leer war, aber keine sinnvolle Aktion moeglich war.",
    "- Pruefe, ob Rausch, Fahndung oder Abhaengigkeit sichtbar Konsequenzen ausgelöst haben.",
    "- Pruefe Erschoepfungseintraege, falls Decks zu schnell leer laufen.",
  ];

  return lines.join("\n");
}

function winnerLabel(state: GameState, labels: ReportLabels) {
  if (!state.winner) return "Noch offen";
  return state.winner === "player" ? labels.playerLabel : labels.opponentLabel;
}

function formatStats(label: string, stats: PlayerStats) {
  return [
    `${label}:`,
    `Gesundheit ${stats.health}/30, Stabilitaet ${stats.stability}/30`,
    `Cash ${stats.cash}/${stats.maxCash}, Kontrolle ${stats.control}/10`,
    `Fahndung ${stats.fahndungsdruck}/10, Rausch ${stats.rausch}/10, Abhaengigkeit ${stats.abhaengigkeit}/5`,
    `Erschoepfung ${stats.erschoepfung}`,
  ].join("\n");
}

function formatBoard(title: string, board: BoardCard[]) {
  if (board.length === 0) return `${title}: leer`;
  return `${title}: ${board
    .map((boardCard) => {
      const card = cardById.get(boardCard.cardId);
      const ready = boardCard.canAttack && !boardCard.exhausted ? "bereit" : "nicht bereit";
      return `${card?.name ?? boardCard.cardId} ${boardCard.attack}/${boardCard.health} (${ready})`;
    })
    .join(", ")}`;
}

function formatEvents(events: GameEvent[]) {
  if (events.length === 0) return ["Keine Ereignisse gespeichert."];
  return events.map((event, index) => `${String(index + 1).padStart(3, "0")}. [${event.tone}] ${event.text}`);
}
