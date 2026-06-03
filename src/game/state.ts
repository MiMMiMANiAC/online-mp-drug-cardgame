import { cardById } from "./cards";
import type { FactionId, GameEvent, GameState } from "./types";

type Side = "player" | "opponent";

export const starterDecks: Record<"raver" | "awareness" | "dealer", string[]> = {
  raver: [
    "raver_auf_anschlag",
    "raver_auf_anschlag",
    "raver_anreissen",
    "raver_anreissen",
    "raver_clubgaenger",
    "raver_clubgaenger",
    "raver_druckwelle",
    "raver_druckwelle",
    "raver_nachlegen",
    "raver_nachlegen",
    "raver_kieferkrampf",
    "raver_kieferkrampf",
    "raver_filmriss",
    "raver_filmriss",
    "raver_kein_morgen",
    "raver_bassdruck",
    "raver_durchballern",
    "raver_ueberdreht",
    "neutral_afterhour_sog",
    "neutral_afterhour_sog",
    "neutral_craving_schub",
    "neutral_craving_schub",
    "neutral_hinterhof_deal",
    "neutral_hinterhof_deal",
    "neutral_blaulicht_geruecht",
    "neutral_schlafdefizit",
    "neutral_schlechter_einfluss",
    "neutral_schlechter_einfluss",
    "neutral_wasserflasche",
    "neutral_beratungsflyer",
  ],
  awareness: [
    "awareness_wasser",
    "awareness_wasser",
    "awareness_aufsicht",
    "awareness_aufsicht",
    "awareness_substanztest",
    "awareness_substanztest",
    "awareness_krisenhelferin",
    "awareness_krisenhelferin",
    "awareness_schadensbegrenzung",
    "awareness_schadensbegrenzung",
    "awareness_streetworker",
    "awareness_streetworker",
    "awareness_deeskalation",
    "awareness_deeskalation",
    "awareness_therapieplatz",
    "awareness_therapieplatz",
    "awareness_rueckzugsraum",
    "awareness_abschirmen",
    "awareness_intervention",
    "awareness_klarer_kopf",
    "neutral_kontaktperson",
    "neutral_kontaktperson",
    "neutral_verpeilter_gast",
    "neutral_verpeilter_gast",
    "neutral_erste_hilfe",
    "neutral_erste_hilfe",
    "neutral_afterhour_sog",
    "neutral_craving_schub",
    "neutral_hinterhof_deal",
    "neutral_blaulicht_geruecht",
  ],
  dealer: [
    "dealer_laeufer",
    "dealer_laeufer",
    "dealer_kleiner_lauf",
    "dealer_kleiner_lauf",
    "dealer_stammkunde",
    "dealer_stammkunde",
    "dealer_schnelles_geld",
    "dealer_schnelles_geld",
    "dealer_bunkern",
    "dealer_bunkern",
    "dealer_druckmittel",
    "dealer_druckmittel",
    "dealer_mittelsmann",
    "dealer_mittelsmann",
    "dealer_abziehen",
    "dealer_schuldenbuch",
    "dealer_falscher_freund",
    "dealer_grosse_lieferung",
    "dealer_netzwerk",
    "neutral_kontaktperson",
    "neutral_kontaktperson",
    "neutral_szenekenner",
    "neutral_razzia_geruecht",
    "neutral_afterhour_sog",
    "neutral_craving_schub",
    "neutral_hinterhof_deal",
    "neutral_blaulicht_geruecht",
    "neutral_schlafdefizit",
    "neutral_druck_von_aussen",
    "neutral_beratungsflyer",
  ],
};

export const initialGameState = createGameState({
  playerFaction: "raver",
  opponentFaction: "awareness",
  playerDeck: starterDecks.raver,
  opponentDeck: starterDecks.awareness,
  seed: 7,
});

interface CreateGameStateOptions {
  playerFaction: FactionId;
  opponentFaction: FactionId;
  playerDeck: string[];
  opponentDeck: string[];
  seed?: number;
}

export function createGameState({
  playerFaction,
  opponentFaction,
  playerDeck,
  opponentDeck,
  seed = Date.now(),
}: CreateGameStateOptions): GameState {
  const playerShuffle = shuffle(playerDeck, seed);
  const opponentShuffle = shuffle(opponentDeck, seed + 13);
  const hand = playerShuffle.slice(0, 4);
  const opponentHand = opponentShuffle.slice(0, 3);

  const setupEvents: GameEvent[] = [
    {
      id: "e1",
      text: `Mulligan gestartet: ${label(playerFaction)} gegen ${label(opponentFaction)}.`,
      tone: "info",
    },
    { id: "e2", text: "Dein Deck wurde gemischt. Du hast 4 Karten gezogen.", tone: "info" },
  ];

  return {
    turn: 1,
    activePlayer: "player",
    playerFaction,
    opponentFaction,
    player: {
      health: 30,
      stability: 30,
      fahndungsdruck: 0,
      rausch: 0,
      maxCash: 2,
      cash: 2,
      control: 5,
      abhaengigkeit: 0,
      erschoepfung: 0,
      heroPowerUsed: false,
    },
    opponent: {
      health: 30,
      stability: 30,
      fahndungsdruck: 0,
      rausch: 0,
      maxCash: 2,
      cash: 2,
      control: 5,
      abhaengigkeit: 0,
      erschoepfung: 0,
      heroPowerUsed: false,
    },
    deck: playerShuffle.slice(4),
    hand,
    opponentDeck: opponentShuffle.slice(3),
    opponentHand,
    playerBoard: [],
    opponentBoard: [],
    events: [...setupEvents].reverse(),
    analysisEvents: setupEvents,
  };
}

export function confirmMulligan(state: GameState, selectedIndexes: number[], seed = Date.now()): GameState {
  const playerResult = mulliganHand({
    hand: state.hand,
    deck: state.deck,
    selectedIndexes,
    handSize: 4,
    seed,
  });
  const botSelected = chooseBotMulliganIndexes(state.opponentHand);
  const botResult = mulliganHand({
    hand: state.opponentHand,
    deck: state.opponentDeck,
    selectedIndexes: botSelected,
    handSize: 3,
    seed: seed + 17,
  });

  const playerEvent = makeEvent(
    `Spieler hat ${selectedIndexes.length} Karten getauscht`,
    selectedIndexes.length > 0 ? "info" : "recovery",
  );
  const botEvent = makeEvent(`Bot hat ${botSelected.length} Karten getauscht`, botSelected.length > 0 ? "info" : "recovery");
  const startEvent = makeEvent("Spiel beginnt", "recovery");

  return {
    ...state,
    hand: playerResult.hand,
    deck: playerResult.deck,
    opponentHand: botResult.hand,
    opponentDeck: botResult.deck,
    events: [startEvent, botEvent, playerEvent, ...state.events].slice(0, 8),
    analysisEvents: [...state.analysisEvents, playerEvent, botEvent, startEvent],
  };
}

export function confirmMulliganForSide(
  state: GameState,
  side: Side,
  selectedIndexes: number[],
  seed = Date.now(),
): GameState {
  const handKey = side === "player" ? "hand" : "opponentHand";
  const deckKey = side === "player" ? "deck" : "opponentDeck";
  const handSize = side === "player" ? 4 : 3;
  const result = mulliganHand({
    hand: state[handKey],
    deck: state[deckKey],
    selectedIndexes,
    handSize,
    seed,
  });

  const event = makeEvent(
    `${side === "player" ? "Spieler 1" : "Spieler 2"} hat ${selectedIndexes.length} Karten getauscht`,
    selectedIndexes.length > 0 ? "info" : "recovery",
  );

  return {
    ...state,
    [handKey]: result.hand,
    [deckKey]: result.deck,
    events: [event, ...state.events].slice(0, 8),
    analysisEvents: [...state.analysisEvents, event],
  };
}

export function markGameStarted(state: GameState): GameState {
  const event = makeEvent("Spiel beginnt", "recovery");
  return {
    ...state,
    events: [event, ...state.events].slice(0, 8),
    analysisEvents: [...state.analysisEvents, event],
  };
}

export function ensurePlayableStartingHand(hand: string[], deck: string[], seed = Date.now()) {
  if (hasEarlyCard(hand)) return { hand, deck, replaced: false };

  const expensiveIndexes = hand
    .map((cardId, index) => ({ cardId, index }))
    .filter(({ cardId }) => getCost(cardId) > 3);
  const earlyDeckIndexes = deck
    .map((cardId, index) => ({ cardId, index }))
    .filter(({ cardId }) => getCost(cardId) >= 1 && getCost(cardId) <= 3);

  if (expensiveIndexes.length === 0 || earlyDeckIndexes.length === 0) {
    return { hand, deck, replaced: false };
  }

  const expensive = expensiveIndexes[seed % expensiveIndexes.length];
  const early = earlyDeckIndexes[(seed * 7) % earlyDeckIndexes.length];
  const nextHand = [...hand];
  const nextDeck = [...deck];
  nextHand[expensive.index] = early.cardId;
  nextDeck[early.index] = expensive.cardId;

  return { hand: nextHand, deck: nextDeck, replaced: true };
}

function mulliganHand({
  hand,
  deck,
  selectedIndexes,
  handSize,
  seed,
}: {
  hand: string[];
  deck: string[];
  selectedIndexes: number[];
  handSize: number;
  seed: number;
}) {
  const selected = new Set(selectedIndexes);
  const kept = hand.filter((_, index) => !selected.has(index));
  const returned = hand.filter((_, index) => selected.has(index));
  const shuffledDeck = shuffle([...deck, ...returned], seed);
  const drawCount = Math.max(0, handSize - kept.length);
  const drawn = shuffledDeck.slice(0, drawCount);
  const rest = shuffledDeck.slice(drawCount);
  return ensurePlayableStartingHand([...kept, ...drawn], rest, seed + 31);
}

function chooseBotMulliganIndexes(hand: string[]) {
  const cheapCount = hand.filter((cardId) => {
    const cost = getCost(cardId);
    return cost >= 1 && cost <= 3;
  }).length;

  if (cheapCount >= 2) return [];

  return hand
    .map((cardId, index) => ({ cardId, index }))
    .filter(({ cardId }) => getCost(cardId) >= 5)
    .map(({ index }) => index);
}

function hasEarlyCard(hand: string[]) {
  return hand.some((cardId) => {
    const cost = getCost(cardId);
    return cost >= 1 && cost <= 3;
  });
}

function getCost(cardId: string) {
  return cardById.get(cardId)?.cost ?? 99;
}

function makeEvent(text: string, tone: GameEvent["tone"]): GameEvent {
  return { id: `mulligan-${text}-${Math.random()}`, text, tone };
}

function label(faction: FactionId) {
  const labels: Record<FactionId, string> = {
    raver: "Raver",
    awareness: "Awareness",
    dealer: "Dealer",
    psychonauten: "Psychonauten",
    junkies: "Junkies",
    bullen: "Bullen",
    aerzte: "Ärzte",
  };
  return labels[faction];
}

export function shuffle(items: string[], seed: number) {
  const result = [...items];
  let state = seed || 1;
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) % 4294967296;
    const swapIndex = state % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}
