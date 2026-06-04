import assert from "node:assert/strict";
import {
  attackOpponentHero,
  attackOpponentMinion,
  emergencyAction,
  emergencyActionForSide,
  endTurn,
  playCard,
  useHeroPower,
  useHeroPowerForSide,
} from "../src/game/actions";
import { cardById, cards } from "../src/game/cards";
import { buildMatchReport } from "../src/game/report";
import { SELF_HERO_TARGET } from "../src/game/rules";
import {
  confirmMulligan,
  confirmMulliganForSide,
  createGameState,
  ensurePlayableStartingHand,
  initialGameState,
  shuffle,
  starterDecks,
} from "../src/game/state";

let state = initialGameState;

assert.equal(state.turn, 1);
assert.equal(state.player.cash, 2);
assert.equal(state.player.maxCash, 2);

for (const [faction, deck] of Object.entries(starterDecks)) {
  assert.equal(deck.length, 30, `${faction}-Starterdeck muss 30 Karten haben.`);
  assert.ok(hasRisk(deck, "rausch"), `${faction}-Starterdeck braucht Rausch-Karten.`);
  assert.ok(hasRisk(deck, "fahndung"), `${faction}-Starterdeck braucht Fahndungs-Karten.`);
  assert.ok(hasRisk(deck, "abhaengigkeit"), `${faction}-Starterdeck braucht Abhaengigkeits-Karten.`);
  assert.ok(deck.filter((cardId) => cardById.get(cardId)?.kind === "person").length >= 10, `${faction}-Starterdeck braucht genug Personen.`);
}

const implementedNonPersonCards = new Set([
  "raver_anreissen",
  "raver_druckwelle",
  "raver_kieferkrampf",
  "raver_kein_morgen",
  "raver_bassdruck",
  "raver_durchballern",
  "raver_zusammenbruch",
  "awareness_wasser",
  "awareness_substanztest",
  "awareness_schadensbegrenzung",
  "awareness_deeskalation",
  "awareness_therapieplatz",
  "awareness_rueckzugsraum",
  "awareness_abschirmen",
  "awareness_intervention",
  "awareness_klarer_kopf",
  "dealer_kleiner_lauf",
  "dealer_schnelles_geld",
  "dealer_bunkern",
  "dealer_druckmittel",
  "dealer_abziehen",
  "dealer_schuldenbuch",
  "dealer_grosse_lieferung",
  "dealer_netzwerk",
  "neutral_wasserflasche",
  "neutral_erste_hilfe",
  "neutral_panikmoment",
  "neutral_taxi_nach_hause",
  "neutral_gruppendruck",
  "neutral_razzia_geruecht",
  "neutral_ruhiger_rueckzugsort",
  "neutral_ueberforderung",
  "neutral_razzia",
  "neutral_frische_luft",
  "neutral_leerer_akku",
  "neutral_kaputter_schlaf",
  "neutral_offene_rechnung",
  "neutral_morgen_danach",
  "neutral_afterhour_sog",
  "neutral_craving_schub",
  "neutral_hinterhof_deal",
  "neutral_blaulicht_geruecht",
  "neutral_schlafdefizit",
  "neutral_kontrollverlust",
  "neutral_beratungsflyer",
  "neutral_druck_von_aussen",
]);
const unwiredCards = cards.filter((card) => card.kind !== "person" && card.kind !== "zustand" && !implementedNonPersonCards.has(card.id));
assert.deepEqual(unwiredCards.map((card) => card.id), [], "Alle Nicht-Person-Karten muessen in der Effektlogik verdrahtet sein.");

const fromDeck = createGameState({
  playerFaction: "dealer",
  opponentFaction: "awareness",
  playerDeck: starterDecks.dealer,
  opponentDeck: starterDecks.awareness,
  seed: 42,
});
assert.equal(fromDeck.hand.length, 4, "Matchstart muss 4 Handkarten ziehen.");
assert.equal(fromDeck.deck.length, starterDecks.dealer.length - 4, "Deck muss nach Starthand reduziert sein.");
assert.equal(fromDeck.opponentHand.length, 3, "Gegner muss 3 Startkarten haben.");
assert.notDeepEqual(fromDeck.hand, starterDecks.dealer.slice(0, 4), "Deck muss gemischt werden.");

const shuffledRaverPreview = shuffle(starterDecks.raver, 2026).slice(0, 10);
assert.ok(
  shuffledRaverPreview.some((cardId) => cardById.get(cardId)?.faction === "neutral"),
  "Gemischtes Deck muss neutrale Karten auch frueh im Deck haben koennen.",
);

const afterMulligan = confirmMulligan(fromDeck, [0, 2], 99);
assert.equal(afterMulligan.hand.length, 4, "Spielerhand muss nach Mulligan 4 Karten haben.");
assert.equal(afterMulligan.opponentHand.length, 3, "Bot-Hand muss nach Mulligan 3 Karten haben.");
assert.ok(afterMulligan.events.some((event) => event.text === "Spiel beginnt"), "Mulligan muss Spielstart loggen.");
assert.ok(
  afterMulligan.events.some((event) => event.text.includes("Spieler hat 2 Karten getauscht")),
  "Spieler-Mulligan muss Anzahl loggen.",
);

const onlineMulliganState = createGameState({
  playerFaction: "raver",
  opponentFaction: "dealer",
  playerDeck: starterDecks.raver,
  opponentDeck: starterDecks.dealer,
  seed: 77,
});
const onlineOpponentBefore = onlineMulliganState.opponentHand;
const afterOnlinePlayerMulligan = confirmMulliganForSide(onlineMulliganState, "player", [0, 1], 88);
assert.equal(afterOnlinePlayerMulligan.hand.length, 4, "Online-Spieler-1-Mulligan muss 4 Karten behalten.");
assert.deepEqual(
  afterOnlinePlayerMulligan.opponentHand,
  onlineOpponentBefore,
  "Online-Spieler-1-Mulligan darf Spieler-2-Hand nicht veraendern.",
);
const afterOnlineOpponentMulligan = confirmMulliganForSide(afterOnlinePlayerMulligan, "opponent", [0], 91);
assert.equal(afterOnlineOpponentMulligan.opponentHand.length, 3, "Online-Spieler-2-Mulligan muss 3 Karten behalten.");

const secured = ensurePlayableStartingHand(
  ["raver_kein_morgen", "neutral_razzia", "awareness_therapieplatz", "dealer_abziehen"],
  ["raver_auf_anschlag"],
  3,
);
assert.equal(secured.replaced, true, "Tote Starthand muss durch fruehe Karte repariert werden.");
assert.ok(secured.hand.includes("raver_auf_anschlag"), "Reparierte Starthand muss fruehe Karte enthalten.");

let raverHeroPowerState = {
  ...initialGameState,
  playerFaction: "raver" as const,
  hand: [],
  player: { ...initialGameState.player, cash: 4, rausch: 0 },
  playerBoard: [],
};
raverHeroPowerState = useHeroPower(raverHeroPowerState);
assert.equal(raverHeroPowerState.playerBoard.length, 1, "Raver-Heldenskill muss eine Person beschwoeren.");
assert.equal(raverHeroPowerState.playerBoard[0].cardId, "hero_raver_spotlight", "Raver-Heldenskill muss Spotlight-Sprinter beschwoeren.");
assert.equal(raverHeroPowerState.playerBoard[0].attack, 2, "Spotlight-Sprinter muss 2 Angriff haben.");
assert.equal(raverHeroPowerState.playerBoard[0].health, 1, "Spotlight-Sprinter muss 1 Stabilitaet haben.");
assert.equal(raverHeroPowerState.playerBoard[0].canAttack, true, "Spotlight-Sprinter muss sofort angreifen koennen.");
assert.equal(raverHeroPowerState.playerBoard[0].temporary, true, "Spotlight-Sprinter muss temporaer sein.");
assert.equal(raverHeroPowerState.player.rausch, 1, "Raver-Heldenskill muss Rausch erhoehen.");
assert.equal(raverHeroPowerState.player.heroPowerUsed, true, "Heldenskill darf nur einmal pro Zug verfuegbar sein.");
const blockedSecondHeroPower = useHeroPower(raverHeroPowerState);
assert.equal(blockedSecondHeroPower.playerBoard.length, 1, "Zweiter Heldenskill im selben Zug darf nicht wirken.");

let temporaryHeroPowerState = endTurn(raverHeroPowerState);
assert.equal(
  temporaryHeroPowerState.playerBoard.some((card) => card.cardId === "hero_raver_spotlight"),
  false,
  "Temporaere Heldenskill-Person muss am Zugende verschwinden.",
);

let awarenessHeroPowerState = {
  ...initialGameState,
  playerFaction: "awareness" as const,
  player: { ...initialGameState.player, cash: 3, health: 24, stability: 25, rausch: 2, fahndungsdruck: 5, abhaengigkeit: 1 },
};
awarenessHeroPowerState = useHeroPower(awarenessHeroPowerState, SELF_HERO_TARGET);
assert.equal(awarenessHeroPowerState.player.health, 26, "Awareness-Heldenskill muss Gesundheit heilen.");
assert.equal(awarenessHeroPowerState.player.stability, 27, "Awareness-Heldenskill muss Stabilitaet heilen.");

let awarenessPersonHealState = {
  ...initialGameState,
  playerFaction: "awareness" as const,
  player: { ...initialGameState.player, cash: 3 },
  playerBoard: [
    {
      instanceId: "wounded-helper",
      cardId: "awareness_krisenhelferin",
      owner: "player" as const,
      attack: 1,
      health: 1,
      exhausted: false,
      canAttack: true,
    },
  ],
};
awarenessPersonHealState = useHeroPower(awarenessPersonHealState, "wounded-helper");
assert.equal(awarenessPersonHealState.playerBoard[0].health, 3, "Awareness-Heldenskill muss eigene Personen gezielt heilen.");

let dealerHeroPowerState = {
  ...initialGameState,
  playerFaction: "dealer" as const,
  player: { ...initialGameState.player, cash: 4, fahndungsdruck: 0 },
};
dealerHeroPowerState = useHeroPower(dealerHeroPowerState);
assert.equal(dealerHeroPowerState.player.cash, 4, "Dealer-Heldenskill kostet 3 und gibt danach +3 Cash.");
assert.equal(dealerHeroPowerState.player.fahndungsdruck, 1, "Dealer-Heldenskill muss Fahndung erhoehen.");

let multiplayerHeroPowerState = {
  ...initialGameState,
  activePlayer: "opponent" as const,
  opponentFaction: "dealer" as const,
  opponent: { ...initialGameState.opponent, cash: 4, fahndungsdruck: 0 },
};
multiplayerHeroPowerState = useHeroPowerForSide(multiplayerHeroPowerState, "opponent");
assert.equal(multiplayerHeroPowerState.opponent.cash, 4, "Multiplayer-Spieler-2-Heldenskill muss auf Gegnerseite wirken.");
assert.equal(multiplayerHeroPowerState.opponent.heroPowerUsed, true, "Multiplayer-Spieler-2-Heldenskill muss verbraucht werden.");
assert.equal(multiplayerHeroPowerState.opponent.fahndungsdruck, 1, "Multiplayer-Spieler-2-Heldenskill muss Fahndung erhoehen.");

state = {
  ...state,
  hand: ["neutral_razzia"],
  player: { ...state.player, cash: 1 },
};
state = playCard(state, "neutral_razzia");
assert.equal(state.hand.includes("neutral_razzia"), true, "Teure Karte darf bei 1 Cash nicht gespielt werden.");

state = {
  ...initialGameState,
  hand: ["raver_auf_anschlag"],
  deck: ["awareness_streetworker", "raver_bassdruck"],
  player: { ...initialGameState.player, cash: 2, maxCash: 2 },
};
state = playCard(state, "raver_auf_anschlag");
assert.equal(state.playerBoard.length, 1, "Person muss in Runde 1 spielbar sein.");
assert.equal(state.playerBoard[0].canAttack, false, "Frisch gelegte Person darf nicht sofort angreifen.");
assert.ok(state.analysisEvents.some((event) => event.text.includes("Puls im roten Bereich gespielt")), "Analyse-Log muss gespielte Karten speichern.");
state = endTurn(state);
assert.equal(state.turn, 2, "Nach Gegnerzug muss Runde 2 starten.");
assert.equal(state.player.maxCash, 3, "Cash-Max muss wie Mana pro eigenem Zug steigen.");
assert.equal(state.player.cash, 3, "Cash muss zum Zugbeginn voll aufgefuellt sein.");
assert.ok(state.hand.length >= 1, "Spieler muss eine Karte ziehen.");

assert.equal(state.playerBoard[0].canAttack, true, "Person muss im naechsten eigenen Zug bereit sein.");

const opponentHealthBefore = state.opponent.health;
state = attackOpponentHero(state, state.playerBoard[0].instanceId);
assert.equal(state.opponent.health, opponentHealthBefore - state.playerBoard[0].attack, "Angriff muss Gegner-Leben senken.");
assert.equal(state.playerBoard[0].canAttack, false, "Person darf nach Angriff nicht erneut angreifen.");

let multiRoundState = createGameState({
  playerFaction: "raver",
  opponentFaction: "awareness",
  playerDeck: starterDecks.raver,
  opponentDeck: starterDecks.awareness,
  seed: 11,
});

for (let i = 0; i < 4; i += 1) {
  multiRoundState = endTurn(multiRoundState);
  const playable = multiRoundState.hand.find((cardId) => {
    return (cardById.get(cardId)?.cost ?? 99) <= multiRoundState.player.cash;
  });
  if (playable) multiRoundState = playCard(multiRoundState, playable);
}

assert.ok(multiRoundState.turn >= 5, "Mehrere Runden muessen simulierbar sein.");
assert.ok(multiRoundState.events.length > 0, "Kampflog muss gefuellt bleiben.");
assert.ok(multiRoundState.player.maxCash <= 10, "Cash-Max darf 10 nicht ueberschreiten.");
assert.ok(multiRoundState.opponent.maxCash <= 10, "Gegner-Cash-Max darf 10 nicht ueberschreiten.");

let lateRefillState = {
  ...initialGameState,
  turn: 6,
  activePlayer: "player" as const,
  hand: [],
  deck: ["neutral_wasserflasche", "neutral_frische_luft"],
  opponentHand: [],
  opponentDeck: ["neutral_verpeilter_gast"],
  player: { ...initialGameState.player, maxCash: 6, cash: 6 },
  opponent: { ...initialGameState.opponent, maxCash: 6, cash: 6 },
  playerBoard: [],
  opponentBoard: [],
};
lateRefillState = endTurn(lateRefillState);
assert.equal(lateRefillState.turn, 7, "Spaeter Refill-Test muss in Runde 7 landen.");
assert.equal(lateRefillState.hand.length, 2, "Ab 7 Cash und fast leerer Hand muss der Spieler 2 Karten ziehen.");
assert.ok(
  lateRefillState.events.some((event) => event.text.includes("Nachziehbonus")),
  "Spaeter Refill muss im Kampflog sichtbar sein.",
);

let fatigueState = {
  ...initialGameState,
  hand: [],
  deck: [],
  opponentHand: [],
  opponentDeck: [],
  player: { ...initialGameState.player, maxCash: 6, cash: 6, health: 30 },
  opponent: { ...initialGameState.opponent, maxCash: 6, cash: 6 },
};
fatigueState = endTurn(fatigueState);
assert.equal(fatigueState.player.erschoepfung, 1, "Erster leerer Draw muss Erschoepfung 1 setzen.");
assert.equal(fatigueState.player.health, 29, "Erster leerer Draw muss 1 Gesundheit kosten.");
fatigueState = endTurn(fatigueState);
assert.equal(fatigueState.player.erschoepfung, 2, "Zweiter leerer Draw muss Erschoepfung 2 setzen.");
assert.equal(fatigueState.player.health, 27, "Zweiter leerer Draw muss 2 Gesundheit kosten.");

let highRushState = {
  ...initialGameState,
  hand: [],
  deck: ["neutral_wasserflasche"],
  opponentHand: [],
  opponentDeck: [],
  player: { ...initialGameState.player, rausch: 9, stability: 30 },
  opponent: { ...initialGameState.opponent, maxCash: 6, cash: 6 },
  playerBoard: [
    {
      instanceId: "rush-body",
      cardId: "raver_clubgaenger",
      owner: "player" as const,
      attack: 2,
      health: 3,
      exhausted: false,
      canAttack: true,
    },
  ],
  opponentBoard: [],
};
highRushState = endTurn(highRushState);
assert.ok(highRushState.events.some((event) => event.text.includes("Absturz")), "Rausch 9+ muss Absturz loggen.");
assert.equal(highRushState.playerBoard[0].health, 2, "Absturz muss eigene Personen beschaedigen.");
assert.ok(highRushState.player.stability <= 27, "Absturz muss deutlich Stabilitaet kosten.");

let highRiskStartState = {
  ...initialGameState,
  hand: [],
  deck: ["neutral_wasserflasche"],
  opponentHand: [],
  opponentDeck: [],
  player: {
    ...initialGameState.player,
    health: 30,
    stability: 30,
    fahndungsdruck: 9,
    abhaengigkeit: 4,
    maxCash: 5,
    cash: 5,
  },
  opponent: { ...initialGameState.opponent, maxCash: 6, cash: 6 },
  playerBoard: [
    {
      instanceId: "watched-deal",
      cardId: "dealer_laeufer",
      owner: "player" as const,
      attack: 1,
      health: 2,
      exhausted: false,
      canAttack: true,
    },
  ],
  opponentBoard: [],
};
highRiskStartState = endTurn(highRiskStartState);
assert.equal(highRiskStartState.player.cash, 3, "Fahndung 9+ muss zum Zugbeginn 3 Cash blockieren.");
assert.equal(highRiskStartState.player.health, 28, "Hohe Fahndung plus hohe Abhaengigkeit muessen Gesundheit kosten.");
assert.equal(highRiskStartState.playerBoard[0].health, 1, "Razzia-Druck muss riskante Personen beschaedigen.");
assert.ok(highRiskStartState.events.some((event) => event.text.includes("Razzia-Druck")), "Fahndung 9+ muss sichtbar geloggt werden.");

let midRiskState = {
  ...initialGameState,
  hand: [],
  deck: ["neutral_wasserflasche"],
  opponentHand: [],
  opponentDeck: [],
  player: { ...initialGameState.player, maxCash: 4, cash: 4, fahndungsdruck: 3, rausch: 4, control: 5, stability: 30 },
  opponent: { ...initialGameState.opponent, maxCash: 4, cash: 4 },
  playerBoard: [],
  opponentBoard: [],
};
midRiskState = endTurn(midRiskState);
assert.ok(midRiskState.events.some((event) => event.text.includes("Fahndung blockiert 1 Cash")), "Fahndung 3+ muss Cash blockieren.");
assert.ok(midRiskState.events.some((event) => event.text.includes("Rausch kostet 1 Stabilitaet")), "Rausch 4+ muss Stabilitaet kosten.");

let lockedRiskState = {
  ...initialGameState,
  hand: [],
  deck: [],
  opponentHand: [],
  opponentDeck: [],
  player: { ...initialGameState.player, maxCash: 1, cash: 1, fahndungsdruck: 10 },
  opponent: { ...initialGameState.opponent, maxCash: 1, cash: 1 },
  playerBoard: [],
  opponentBoard: [],
};
lockedRiskState = endTurn(lockedRiskState);
assert.equal(lockedRiskState.player.cash, 2, "Hohe Fahndung darf den Startzug nicht unter 2 Cash druecken.");

let emergencyState = {
  ...initialGameState,
  hand: [],
  deck: [],
  opponentHand: [],
  opponentDeck: [],
  activePlayer: "player" as const,
  player: { ...initialGameState.player, maxCash: 6, cash: 0, fahndungsdruck: 8, rausch: 4, control: 3 },
  opponent: { ...initialGameState.opponent, maxCash: 6, cash: 6 },
  playerBoard: [],
  opponentBoard: [],
};
emergencyState = emergencyAction(emergencyState);
assert.equal(emergencyState.player.fahndungsdruck, 6, "Abtauchen muss Fahndung um 2 reduzieren.");
assert.equal(emergencyState.player.rausch, 3, "Abtauchen muss Rausch um 1 reduzieren.");
assert.equal(emergencyState.activePlayer, "opponent", "Abtauchen muss den Zug beenden.");

let opponentEmergencyState = {
  ...initialGameState,
  activePlayer: "opponent" as const,
  opponent: { ...initialGameState.opponent, maxCash: 6, cash: 0, fahndungsdruck: 5, rausch: 3, control: 4 },
};
opponentEmergencyState = emergencyActionForSide(opponentEmergencyState, "opponent");
assert.equal(opponentEmergencyState.opponent.fahndungsdruck, 3, "Multiplayer-Abtauchen muss fuer Spieler 2 Fahndung reduzieren.");
assert.equal(opponentEmergencyState.activePlayer, "player", "Multiplayer-Abtauchen muss den Zug zu Spieler 1 geben.");

const blockedHeroAttackState = {
  ...initialGameState,
  opponent: { ...initialGameState.opponent, health: 30 },
  playerBoard: [
    {
      instanceId: "blocked-attacker",
      cardId: "raver_clubgaenger",
      owner: "player" as const,
      attack: 2,
      health: 2,
      exhausted: false,
      canAttack: true,
    },
  ],
  opponentBoard: [
    {
      instanceId: "board-guard",
      cardId: "neutral_szenekenner",
      owner: "opponent" as const,
      attack: 2,
      health: 4,
      exhausted: false,
      canAttack: true,
    },
  ],
};
const blockedHeroAttack = attackOpponentHero(blockedHeroAttackState, "blocked-attacker");
assert.equal(blockedHeroAttack.opponent.health, 30, "Held darf nicht angegriffen werden, solange gegnerische Personen liegen.");
assert.ok(blockedHeroAttack.events[0].text.includes("gegnerischen Personen"), "Blockierter Heldenangriff muss erklaert werden.");

const winningState = {
  ...initialGameState,
  opponent: { ...initialGameState.opponent, health: 1 },
  playerBoard: [
    {
      instanceId: "winning-attacker",
      cardId: "raver_clubgaenger",
      owner: "player" as const,
      attack: 2,
      health: 2,
      exhausted: false,
      canAttack: true,
    },
  ],
};

const afterWin = attackOpponentHero(winningState, "winning-attacker");
assert.equal(afterWin.winner, "player", "Toedlicher Angriff muss Gewinner setzen.");
assert.ok(afterWin.events[0].text.includes("Sieg"), "Sieg muss im Kampflog erscheinen.");
const report = buildMatchReport(afterWin, { playerLabel: "Spieler 1", opponentLabel: "Spieler 2" });
assert.ok(report.includes("MATCH-ANALYSE"), "Analyse-Export muss Berichtstitel enthalten.");
assert.ok(report.includes("Sieg"), "Analyse-Export muss Endereignisse enthalten.");

const combatState = {
  ...initialGameState,
  playerBoard: [
    {
      instanceId: "attacker",
      cardId: "raver_clubgaenger",
      owner: "player" as const,
      attack: 1,
      health: 2,
      exhausted: false,
      canAttack: true,
    },
  ],
  opponentBoard: [
    {
      instanceId: "target",
      cardId: "dealer_laeufer",
      owner: "opponent" as const,
      attack: 2,
      health: 1,
      exhausted: false,
      canAttack: true,
    },
  ],
};

const afterCombat = attackOpponentMinion(combatState, "attacker", "target");
assert.equal(afterCombat.playerBoard.length, 0, "Rueckschaden muss eigene tote Karte entfernen.");
assert.equal(afterCombat.opponentBoard.length, 0, "Angriffsschaden muss gegnerische tote Karte entfernen.");

let botGuardState = {
  ...initialGameState,
  hand: [],
  deck: ["neutral_wasserflasche"],
  opponentHand: [],
  opponentDeck: [],
  player: { ...initialGameState.player, health: 30 },
  opponent: { ...initialGameState.opponent, maxCash: 4, cash: 4 },
  playerBoard: [
    {
      instanceId: "player-guard",
      cardId: "neutral_verpeilter_gast",
      owner: "player" as const,
      attack: 1,
      health: 1,
      exhausted: false,
      canAttack: true,
    },
  ],
  opponentBoard: [
    {
      instanceId: "bot-attacker",
      cardId: "raver_clubgaenger",
      owner: "opponent" as const,
      attack: 1,
      health: 2,
      exhausted: false,
      canAttack: true,
    },
  ],
};
botGuardState = endTurn(botGuardState);
assert.equal(botGuardState.player.health, 30, "Bot muss zuerst Personen angreifen, nicht den Helden.");
assert.equal(botGuardState.playerBoard.length, 0, "Bot-Angriff muss die erste gegnerische Person treffen.");

let cashState = {
  ...initialGameState,
  hand: ["dealer_kleiner_lauf"],
  player: { ...initialGameState.player, cash: 2, maxCash: 2 },
};
cashState = playCard(cashState, "dealer_kleiner_lauf");
assert.equal(cashState.player.cash, 3, "Kleiner Lauf kostet 1 und gibt danach wirklich +2 Cash.");
assert.equal(cashState.player.fahndungsdruck, 1, "Kleiner Lauf muss Fahndungsdruck erhoehen.");

let deliveryState = {
  ...initialGameState,
  hand: ["dealer_grosse_lieferung"],
  deck: ["neutral_wasserflasche"],
  player: { ...initialGameState.player, cash: 6, maxCash: 6 },
};
deliveryState = playCard(deliveryState, "dealer_grosse_lieferung");
assert.equal(deliveryState.player.cash, 6, "Grosse Lieferung kostet 4 und gibt danach wirklich +4 Cash.");
assert.equal(deliveryState.hand.includes("neutral_wasserflasche"), true, "Grosse Lieferung muss 1 Karte ziehen.");
assert.equal(deliveryState.player.fahndungsdruck, 3, "Grosse Lieferung muss +3 Fahndung geben.");

let bottleState = {
  ...initialGameState,
  hand: ["neutral_wasserflasche"],
  player: { ...initialGameState.player, cash: 2, stability: 24, rausch: 1 },
};
bottleState = playCard(bottleState, "neutral_wasserflasche", SELF_HERO_TARGET);
assert.equal(bottleState.player.stability, 25, "Wasserflasche muss immer 1 Stabilitaet heilen.");
assert.equal(bottleState.player.rausch, 0, "Wasserflasche muss Rausch um 1 reduzieren.");

let firstAidPersonState = {
  ...initialGameState,
  hand: ["neutral_erste_hilfe"],
  player: { ...initialGameState.player, cash: 2 },
  playerBoard: [
    {
      instanceId: "hurt-person",
      cardId: "neutral_szenekenner",
      owner: "player" as const,
      attack: 2,
      health: 1,
      exhausted: false,
      canAttack: true,
    },
  ],
};
firstAidPersonState = playCard(firstAidPersonState, "neutral_erste_hilfe", "hurt-person");
assert.equal(firstAidPersonState.playerBoard[0].health, 5, "Erste Hilfe darf eigene Personen ueber ihre gedruckten HP hinaus heilen.");

let therapyState = {
  ...initialGameState,
  hand: ["awareness_therapieplatz"],
  player: { ...initialGameState.player, cash: 4, stability: 30, abhaengigkeit: 2 },
};
therapyState = playCard(therapyState, "awareness_therapieplatz");
assert.equal(therapyState.player.abhaengigkeit, 1, "Therapieplatz muss bei voller Stabilitaet Abhaengigkeit senken.");

let billState = {
  ...initialGameState,
  hand: ["neutral_offene_rechnung"],
  player: { ...initialGameState.player, cash: 4, maxCash: 4 },
};
billState = playCard(billState, "neutral_offene_rechnung");
assert.equal(billState.opponent.health, 28, "Offene Rechnung muss dem Gegner 2 Schaden zufuegen.");
assert.equal(billState.player.cash, 0, "Offene Rechnung kostet 4 und zieht danach kein negatives Cash ab.");

let cashOutState = {
  ...initialGameState,
  hand: ["dealer_abziehen"],
  player: { ...initialGameState.player, cash: 7, maxCash: 7, fahndungsdruck: 0 },
  opponent: { ...initialGameState.opponent, health: 30 },
};
cashOutState = playCard(cashOutState, "dealer_abziehen");
assert.equal(cashOutState.opponent.health, 28, "Kasse leeren muss nach Kostenzahlung restliches Cash als Schaden nutzen.");
assert.equal(cashOutState.player.cash, 0, "Kasse leeren muss danach das restliche Cash ausgeben.");
assert.equal(cashOutState.player.fahndungsdruck, 2, "Kasse leeren muss Fahndung um 2 erhoehen.");

let rushAttackState = {
  ...initialGameState,
  player: { ...initialGameState.player, rausch: 2 },
  opponent: { ...initialGameState.opponent, health: 30 },
  playerBoard: [
    {
      instanceId: "nachlegen",
      cardId: "raver_nachlegen",
      owner: "player" as const,
      attack: 3,
      health: 2,
      exhausted: false,
      canAttack: true,
    },
  ],
};
rushAttackState = attackOpponentHero(rushAttackState, "nachlegen");
assert.equal(rushAttackState.player.rausch, 3, "Nachlegen muss beim Angriff +1 Rausch geben.");

let targetedDamageState = {
  ...initialGameState,
  hand: ["dealer_druckmittel"],
  player: { ...initialGameState.player, cash: 4 },
  opponentBoard: [
    {
      instanceId: "first-target",
      cardId: "awareness_aufsicht",
      owner: "opponent" as const,
      attack: 1,
      health: 3,
      exhausted: false,
      canAttack: true,
    },
    {
      instanceId: "chosen-target",
      cardId: "awareness_streetworker",
      owner: "opponent" as const,
      attack: 2,
      health: 4,
      exhausted: false,
      canAttack: true,
    },
  ],
};
targetedDamageState = playCard(targetedDamageState, "dealer_druckmittel", "chosen-target");
assert.equal(targetedDamageState.opponentBoard[0].health, 3, "Gezielte Aktion darf nicht automatisch die erste Person treffen.");
assert.equal(targetedDamageState.opponentBoard.length, 1, "Gezielte Schadenskarte muss das gewaehlte Ziel treffen.");
assert.equal(targetedDamageState.opponentBoard[0].instanceId, "first-target", "Getroffenes Ziel muss vom Board verschwinden.");

let targetedBuffState = {
  ...initialGameState,
  hand: ["raver_anreissen"],
  player: { ...initialGameState.player, cash: 2 },
  playerBoard: [
    {
      instanceId: "first-own",
      cardId: "neutral_verpeilter_gast",
      owner: "player" as const,
      attack: 1,
      health: 2,
      exhausted: false,
      canAttack: true,
    },
    {
      instanceId: "chosen-own",
      cardId: "raver_clubgaenger",
      owner: "player" as const,
      attack: 2,
      health: 2,
      exhausted: false,
      canAttack: true,
    },
  ],
};
targetedBuffState = playCard(targetedBuffState, "raver_anreissen", "chosen-own");
assert.equal(targetedBuffState.playerBoard[0].attack, 1, "Gezielter Buff darf nicht automatisch die erste eigene Person treffen.");
assert.equal(targetedBuffState.playerBoard[1].attack, 4, "Gezielter Buff muss die gewaehlte eigene Person treffen.");

let missingTargetState = {
  ...initialGameState,
  hand: ["raver_bassdruck"],
  player: { ...initialGameState.player, cash: 2 },
  opponentBoard: [
    {
      instanceId: "enemy",
      cardId: "dealer_laeufer",
      owner: "opponent" as const,
      attack: 1,
      health: 2,
      exhausted: false,
      canAttack: true,
    },
  ],
};
missingTargetState = playCard(missingTargetState, "raver_bassdruck");
assert.equal(missingTargetState.hand.includes("raver_bassdruck"), true, "Spieler-Zielkarten duerfen ohne Ziel nicht ausgespielt werden.");
assert.equal(missingTargetState.player.cash, 2, "Ohne Ziel darf kein Cash bezahlt werden.");

let anyTargetState = {
  ...initialGameState,
  hand: ["neutral_ueberforderung"],
  player: { ...initialGameState.player, cash: 3, stability: 20 },
  playerBoard: [
    {
      instanceId: "own-choice",
      cardId: "raver_clubgaenger",
      owner: "player" as const,
      attack: 2,
      health: 2,
      exhausted: false,
      canAttack: true,
    },
  ],
  opponentBoard: [
    {
      instanceId: "enemy-choice",
      cardId: "dealer_laeufer",
      owner: "opponent" as const,
      attack: 1,
      health: 2,
      exhausted: false,
      canAttack: true,
    },
  ],
};
anyTargetState = playCard(anyTargetState, "neutral_ueberforderung", "own-choice");
assert.equal(anyTargetState.playerBoard[0].attack, 0, "Beliebige-Person-Ziel muss auch eigene Personen treffen koennen.");
assert.equal(anyTargetState.opponentBoard[0].attack, 1, "Beliebige-Person-Ziel darf ohne Klick nicht automatisch Gegner treffen.");
assert.equal(anyTargetState.player.stability, 19, "Ueberforderung muss den Besitzer des Ziels Stabilitaet kosten.");

let directHeroSpellState = {
  ...initialGameState,
  hand: ["raver_kein_morgen"],
  player: { ...initialGameState.player, cash: 5 },
};
directHeroSpellState = playCard(directHeroSpellState, "raver_kein_morgen");
assert.equal(directHeroSpellState.opponent.health, 26, "Direkte Heldenschaden-Karten muessen ohne extra Zielklick funktionieren.");

console.log("Hearthstone-like game loop check passed.");

function hasRisk(deck: string[], tag: "rausch" | "fahndung" | "abhaengigkeit") {
  return deck.some((cardId) => cardById.get(cardId)?.tags.includes(tag));
}
