import { cardById } from "./cards";
import { targetForCard } from "./rules";
import type { BoardCard, GameEvent, GameState, PlayerStats } from "./types";

let nextId = 1;
type Side = "player" | "opponent";

function keysFor(side: Side) {
  return side === "player"
    ? {
        selfKey: "player" as const,
        enemyKey: "opponent" as const,
        handKey: "hand" as const,
        ownBoardKey: "playerBoard" as const,
        enemyBoardKey: "opponentBoard" as const,
      }
    : {
        selfKey: "opponent" as const,
        enemyKey: "player" as const,
        handKey: "opponentHand" as const,
        ownBoardKey: "opponentBoard" as const,
        enemyBoardKey: "playerBoard" as const,
      };
}

export function playCard(state: GameState, cardId: string, targetId?: string): GameState {
  return playCardForSide(state, "player", cardId, targetId);
}

export function useHeroPower(state: GameState, targetId?: string): GameState {
  return useHeroPowerForSide(state, "player", targetId);
}

export function emergencyAction(state: GameState): GameState {
  return emergencyActionForSide(state, "player");
}

export function useHeroPowerForSide(state: GameState, side: Side, targetId?: string): GameState {
  if (state.winner) return state;
  if (state.activePlayer !== side) return addEvent(state, "Du bist nicht am Zug.", "warning");
  const { selfKey, ownBoardKey } = keysFor(side);
  const faction = side === "player" ? state.playerFaction : state.opponentFaction;
  const stats = state[selfKey];
  if (stats.heroPowerUsed) return addEvent(state, "Heldenskill wurde in diesem Zug schon genutzt.", "warning");
  if (stats.cash < 2) return addEvent(state, "Nicht genug Cash fuer den Heldenskill.", "warning");

  let next: GameState = {
    ...state,
    [selfKey]: { ...stats, cash: stats.cash - 2, heroPowerUsed: true },
  };

  if (faction === "raver") {
    if (next[ownBoardKey].length >= 5) return addEvent(state, "Dein Board ist voll.", "warning");
    next = {
      ...next,
      [selfKey]: { ...next[selfKey], rausch: Math.min(10, next[selfKey].rausch + 1) },
      [ownBoardKey]: [...next[ownBoardKey], createBoardCard("hero_raver_spotlight", side, true, true)],
    };
    return checkWinner(
      addEvent(
        next,
        "Heldenskill Kurz im Spotlight: Spotlight-Sprinter beschworen.",
        "warning",
        {
          cardId: "hero_raver_spotlight",
          details: "2/1 Person. Kann sofort angreifen. Verschwindet am Ende deines Zuges. +1 Rausch.",
        },
      ),
    );
  }

  if (faction === "awareness") {
    next = {
      ...next,
      [selfKey]: {
        ...next[selfKey],
        health: Math.min(30, next[selfKey].health + 2),
        stability: Math.min(30, next[selfKey].stability + 2),
      },
    };
    return checkWinner(
      addEvent(next, "Heldenskill Stabilisieren: +2 Gesundheit, +2 Stabilitaet.", "recovery", {
        details: "Awareness gewinnt Zeit: heilt Gesundheit und Stabilitaet, ohne Risiko zu erhoehen.",
      }),
    );
  }

  if (faction === "dealer") {
    next = {
      ...next,
      [selfKey]: {
        ...next[selfKey],
        cash: Math.min(10, next[selfKey].cash + 3),
        fahndungsdruck: Math.min(10, next[selfKey].fahndungsdruck + 1),
      },
    };
    return checkWinner(
      addEvent(next, "Heldenskill Schneller Deal: +3 Cash, +1 Fahndung.", "danger", {
        details: "Netto +1 Cash in diesem Zug. Der Preis ist +1 Fahndung.",
      }),
    );
  }

  return addEvent(state, "Diese Klasse hat noch keinen aktiven Heldenskill.", "warning");
}

export function emergencyActionForSide(state: GameState, side: Side): GameState {
  if (state.winner) return state;
  if (state.activePlayer !== side) return addEvent(state, "Du bist nicht am Zug.", "warning");

  const { selfKey } = keysFor(side);
  const actor = side === "player" ? "Spieler 1" : "Spieler 2";
  const stats = state[selfKey];
  let next: GameState = {
    ...state,
    [selfKey]: {
      ...stats,
      control: Math.min(10, stats.control + 1),
      fahndungsdruck: Math.max(0, stats.fahndungsdruck - 2),
      rausch: Math.max(0, stats.rausch - 1),
    },
  };

  next = addEvent(next, `${actor} taucht ab: -2 Fahndung, -1 Rausch, +1 Kontrolle.`, "recovery", {
    details:
      "Notfallaktion: Du bekommst keine Karte und keinen Angriff dazu. Sie stabilisiert eine schlechte Lage und beendet deinen Zug.",
  });
  return endTurnForSide(next, side);
}

export function playCardForSide(state: GameState, side: Side, cardId: string, targetId?: string): GameState {
  if (state.winner) return state;
  if (state.activePlayer !== side) return addEvent(state, "Du bist nicht am Zug.", "warning");
  const { selfKey, handKey, ownBoardKey, enemyBoardKey } = keysFor(side);
  const card = cardById.get(cardId);
  if (!card || !state[handKey].includes(cardId)) return addEvent(state, "Karte nicht verfuegbar.", "warning");
  if (state[selfKey].cash < card.cost) return addEvent(state, "Nicht genug Cash.", "warning");
  if (card.kind === "person" && state[ownBoardKey].length >= 5) return addEvent(state, "Dein Board ist voll.", "warning");
  const target = targetForCard(cardId);
  if (target === "ownPerson" && !state[ownBoardKey].some((boardCard) => boardCard.instanceId === targetId)) {
    return addEvent(state, "Waehle eine eigene Person als Ziel.", "warning");
  }
  if (target === "enemyPerson" && !state[enemyBoardKey].some((boardCard) => boardCard.instanceId === targetId)) {
    return addEvent(state, "Waehle eine gegnerische Person als Ziel.", "warning");
  }
  if (
    target === "anyPerson" &&
    !state[ownBoardKey].some((boardCard) => boardCard.instanceId === targetId) &&
    !state[enemyBoardKey].some((boardCard) => boardCard.instanceId === targetId)
  ) {
    return addEvent(state, "Waehle eine Person als Ziel.", "warning");
  }
  let next: GameState = {
    ...state,
    [selfKey]: { ...state[selfKey], cash: state[selfKey].cash - card.cost },
    [handKey]: removeFirst(state[handKey], cardId),
  };

  if (card.kind === "person") {
    const ready = cardId === "raver_nachlegen" && next[selfKey].rausch >= 2;
    next = { ...next, [ownBoardKey]: [...next[ownBoardKey], createBoardCard(cardId, side, ready)] };
    next = applyPersonOnPlay(next, cardId, side);
  } else {
    next = applySpellLikeEffect(next, cardId, side, targetId);
  }

  return checkWinner(
    addEvent(next, `${card.name} gespielt.`, eventTone(cardId), {
      cardId,
      details: card.drawback ? `${card.effect} Nachteil: ${card.drawback}` : card.effect,
    }),
  );
}

export function attackOpponentHero(state: GameState, instanceId: string): GameState {
  return attackHeroForSide(state, "player", instanceId);
}

export function attackHeroForSide(state: GameState, side: Side, instanceId: string): GameState {
  if (state.winner) return state;
  if (state.activePlayer !== side) return addEvent(state, "Du bist nicht am Zug.", "warning");
  const { enemyKey, ownBoardKey } = keysFor(side);
  const attacker = state[ownBoardKey].find((card) => card.instanceId === instanceId);
  if (!attacker) return state;
  if (!attacker.canAttack || attacker.exhausted) return addEvent(state, "Diese Person kann noch nicht angreifen.", "warning");

  const definition = cardById.get(attacker.cardId);
  let next: GameState = {
    ...state,
    [enemyKey]: { ...state[enemyKey], health: Math.max(0, state[enemyKey].health - attacker.attack) },
    [ownBoardKey]: state[ownBoardKey].map((card) =>
      card.instanceId === instanceId ? { ...card, exhausted: true, canAttack: false } : card,
    ),
  };
  next = applyAttackTriggers(next, attacker.cardId, side);

  return checkWinner(addEvent(next, `${definition?.name ?? "Person"} greift Gegner fuer ${attacker.attack} Schaden an.`, "danger"));
}

export function attackOpponentMinion(state: GameState, attackerId: string, targetId: string): GameState {
  return attackMinionForSide(state, "player", attackerId, targetId);
}

export function attackMinionForSide(state: GameState, side: Side, attackerId: string, targetId: string): GameState {
  if (state.winner) return state;
  if (state.activePlayer !== side) return addEvent(state, "Du bist nicht am Zug.", "warning");
  const { ownBoardKey, enemyBoardKey } = keysFor(side);
  const attacker = state[ownBoardKey].find((card) => card.instanceId === attackerId);
  const target = state[enemyBoardKey].find((card) => card.instanceId === targetId);
  if (!attacker || !target) return state;
  if (!attacker.canAttack || attacker.exhausted) return addEvent(state, "Diese Person kann noch nicht angreifen.", "warning");

  const attackerAfter = { ...attacker, health: attacker.health - target.attack, exhausted: true, canAttack: false };
  const targetAfter = { ...target, health: target.health - attacker.attack };
  const attackerDef = cardById.get(attacker.cardId);
  const targetDef = cardById.get(target.cardId);

  let next: GameState = {
    ...state,
    [ownBoardKey]: state[ownBoardKey]
      .map((card) => (card.instanceId === attackerId ? attackerAfter : card))
      .filter((card) => card.health > 0),
    [enemyBoardKey]: state[enemyBoardKey]
      .map((card) => (card.instanceId === targetId ? targetAfter : card))
      .filter((card) => card.health > 0),
  };
  next = applyAttackTriggers(next, attacker.cardId, side);
  if (attackerAfter.health < attacker.health) next = applyOwnDamageTriggers(next, side);
  if (targetAfter.health < target.health) next = applyOwnDamageTriggers(next, side === "player" ? "opponent" : "player");

  const deathText =
    attackerAfter.health <= 0 && targetAfter.health <= 0
      ? " Beide gehen vom Board."
      : attackerAfter.health <= 0
        ? ` ${attackerDef?.name ?? "Angreifer"} stirbt.`
        : targetAfter.health <= 0
          ? ` ${targetDef?.name ?? "Ziel"} stirbt.`
          : "";

  return checkWinner(
    addEvent(
      next,
      `${attackerDef?.name ?? "Person"} greift ${targetDef?.name ?? "Ziel"} an: ${attacker.attack} / ${target.attack} Schaden.${deathText}`,
      "danger",
    ),
  );
}

export function endTurn(state: GameState): GameState {
  if (state.winner) return state;

  let next = addEvent(state, "Du beendest den Zug.", "info");
  next = runEndOfTurnRisks(next, "player");
  next = runOpponentTurn(next);
  next = startPlayerTurn(next);
  return checkWinner(next);
}

function runOpponentTurn(state: GameState): GameState {
  let next: GameState = {
    ...state,
    activePlayer: "opponent",
    opponent: refreshStartOfTurn(state.opponent),
    opponentBoard: readyBoard(state.opponentBoard),
  };

  next = runStartOfTurnRisks(next, "opponent");
  next = drawStartOfTurnCards(next, "opponent");
  next = opponentPlayOneCard(next);
  next = opponentAttack(next);
  next = runEndOfTurnRisks(next, "opponent");
  return next;
}

function startPlayerTurn(state: GameState): GameState {
  let next: GameState = {
    ...state,
    turn: state.turn + 1,
    activePlayer: "player",
    player: refreshStartOfTurn(state.player),
    playerBoard: readyBoard(state.playerBoard),
  };

  next = runStartOfTurnRisks(next, "player");
  next = drawStartOfTurnCards(next, "player");
  return addEvent(next, `Runde ${next.turn}: Du bist am Zug.`, "recovery");
}

export function endTurnForSide(state: GameState, side: Side): GameState {
  if (state.winner) return state;
  if (state.activePlayer !== side) return addEvent(state, "Du bist nicht am Zug.", "warning");

  const otherSide: Side = side === "player" ? "opponent" : "player";
  const otherStatsKey = otherSide === "player" ? "player" : "opponent";
  const otherBoardKey = otherSide === "player" ? "playerBoard" : "opponentBoard";

  let next = addEvent(state, `${side === "player" ? "Spieler 1" : "Spieler 2"} beendet den Zug.`, "info");
  next = runEndOfTurnRisks(next, side);
  next = {
    ...next,
    turn: otherSide === "player" ? next.turn + 1 : next.turn,
    activePlayer: otherSide,
    [otherStatsKey]: refreshStartOfTurn(next[otherStatsKey]),
    [otherBoardKey]: readyBoard(next[otherBoardKey]),
  };
  next = runStartOfTurnRisks(next, otherSide);
  next = drawStartOfTurnCards(next, otherSide);
  return checkWinner(addEvent(next, `${otherSide === "player" ? "Spieler 1" : "Spieler 2"} ist am Zug.`, "recovery"));
}

function refreshStartOfTurn(stats: PlayerStats): PlayerStats {
  const maxCash = Math.min(10, stats.maxCash + 1);
  const cashPenalty = stats.fahndungsdruck >= 9 ? 3 : stats.fahndungsdruck >= 6 ? 2 : stats.fahndungsdruck >= 3 ? 1 : 0;
  const minimumPlayableCash = maxCash >= 2 ? 2 : maxCash;
  const availableCash = Math.min(maxCash, Math.max(minimumPlayableCash, maxCash - cashPenalty));
  return {
    ...stats,
    maxCash,
    cash: availableCash,
    control: Math.max(0, Math.min(10, stats.control + 1 - (stats.fahndungsdruck >= 6 ? 1 : 0))),
    rausch: Math.max(0, stats.rausch - 1),
    stability: Math.max(0, stats.stability - stats.abhaengigkeit),
    heroPowerUsed: false,
  };
}

function runStartOfTurnRisks(state: GameState, side: "player" | "opponent"): GameState {
  const statsKey = side === "player" ? "player" : "opponent";
  const boardKey = side === "player" ? "playerBoard" : "opponentBoard";
  const actor = side === "player" ? "Deine" : "Gegnerische";
  let stats = { ...state[statsKey] };
  let board = [...state[boardKey]];
  let next: GameState = state;

  if (stats.abhaengigkeit > 0) {
    next = addEvent({ ...next, [statsKey]: stats, [boardKey]: board }, `${actor} Abhaengigkeit kostet ${stats.abhaengigkeit} Stabilitaet.`, "danger");
  }

  if (stats.fahndungsdruck >= 3) {
    const blockedCash = stats.fahndungsdruck >= 9 ? 3 : stats.fahndungsdruck >= 6 ? 2 : 1;
    next = addEvent(
      { ...next, [statsKey]: stats, [boardKey]: board },
      `${actor} Fahndung blockiert ${blockedCash} Cash.`,
      "warning",
    );
  }

  if (stats.rausch >= 4) {
    const controlLoss = stats.rausch >= 8 ? 2 : 1;
    stats = { ...stats, control: Math.max(0, stats.control - controlLoss) };
    next = addEvent(
      { ...next, [statsKey]: stats, [boardKey]: board },
      `${actor} Rausch erschwert Kontrolle: -${controlLoss} Kontrolle.`,
      "warning",
    );
  }

  if (stats.abhaengigkeit >= 4) {
    const damage = stats.abhaengigkeit >= 5 ? 2 : 1;
    stats = { ...stats, health: Math.max(0, stats.health - damage) };
    next = addEvent(
      { ...next, [statsKey]: stats, [boardKey]: board },
      `${actor} Abhaengigkeit kippt in Entzug: -${damage} Gesundheit.`,
      "danger",
    );
  }

  if (stats.fahndungsdruck >= 9) {
    board = damageTagged(board, 1);
    stats = { ...stats, health: Math.max(0, stats.health - 1) };
    next = addEvent(
      { ...next, [statsKey]: stats, [boardKey]: board },
      `${actor} Fahndung loest Razzia-Druck aus: riskante Personen nehmen Schaden, -1 Gesundheit.`,
      "danger",
    );
  }

  return { ...next, [statsKey]: stats, [boardKey]: board };
}

function runEndOfTurnRisks(state: GameState, side: "player" | "opponent"): GameState {
  const statsKey = side === "player" ? "player" : "opponent";
  const boardKey = side === "player" ? "playerBoard" : "opponentBoard";
  let stats = { ...state[statsKey] };
  let board = [...state[boardKey]];
  const actor = side === "player" ? "Dein" : "Gegnerischer";
  let next: GameState = state;

  if (board.some((card) => card.cardId === "awareness_aufsicht") && stats.stability <= 5) {
    stats.stability = Math.min(30, stats.stability + 1);
    next = addEvent({ ...next, [statsKey]: stats }, `${actor} Aufsicht stabilisiert um 1.`, "recovery");
  }

  if (board.some((card) => card.cardId === "awareness_streetworker")) {
    stats = reduceHighestRisk(stats);
    next = addEvent({ ...next, [statsKey]: stats }, `${actor} Streetworker reduziert den hoechsten Risikowert.`, "recovery");
  }

  if (board.some((card) => card.cardId === "raver_ueberdreht")) {
    if (stats.rausch >= 5) {
      stats.rausch = Math.min(10, stats.rausch + 1);
    } else {
      board = board.map((card) =>
        card.cardId !== "raver_ueberdreht" ? { ...card, attack: card.attack + 1 } : card,
      );
    }
  }

  if (stats.rausch >= 5 && board.some((card) => card.cardId === "raver_filmriss")) {
    board = board.map((card) => (card.cardId === "raver_filmriss" ? { ...card, health: card.health - 1 } : card));
  }

  next = { ...next, [statsKey]: stats, [boardKey]: board.filter((card) => card.health > 0) };

  if (stats.rausch >= 8) {
    const damagedBoard = board.map((card) => ({ ...card, health: card.health - 1 })).filter((card) => card.health > 0);
    return removeTemporaryBoardCards(
      addEvent(
        {
          ...next,
          [statsKey]: { ...stats, stability: Math.max(0, stats.stability - 3), rausch: Math.max(0, stats.rausch - 3) },
          [boardKey]: damagedBoard,
        },
        `${actor} Rausch kippt in Absturz: -3 Stabilitaet, eigene Personen nehmen 1 Schaden.`,
        "danger",
      ),
      side,
    );
  }

  if (stats.rausch >= 4) {
    const stabilityLoss = stats.rausch >= 6 ? 2 : 1;
    return removeTemporaryBoardCards(
      addEvent(
        {
          ...next,
          [statsKey]: { ...stats, stability: Math.max(0, stats.stability - stabilityLoss) },
        },
        `${actor} Rausch kostet ${stabilityLoss} Stabilitaet.`,
        "danger",
      ),
      side,
    );
  }

  return removeTemporaryBoardCards(next, side);
}

function removeTemporaryBoardCards(state: GameState, side: "player" | "opponent"): GameState {
  const boardKey = side === "player" ? "playerBoard" : "opponentBoard";
  const removed = state[boardKey].filter((card) => card.temporary).length;
  if (removed === 0) return state;
  return addEvent(
    {
      ...state,
      [boardKey]: state[boardKey].filter((card) => !card.temporary),
    },
    `${side === "player" ? "Dein" : "Gegnerischer"} Spotlight-Sprinter verschwindet.`,
    "info",
    { cardId: "hero_raver_spotlight" },
  );
}

function readyBoard(board: BoardCard[]): BoardCard[] {
  return board.map((card) => ({ ...card, exhausted: false, canAttack: true }));
}

function drawStartOfTurnCards(state: GameState, side: "player" | "opponent"): GameState {
  let next = drawCard(state, side);
  const statsKey = side === "player" ? "player" : "opponent";
  const handKey = side === "player" ? "hand" : "opponentHand";
  if (next[statsKey].maxCash >= 7 && next[handKey].length <= 2 && next[side === "player" ? "deck" : "opponentDeck"].length > 0) {
    next = drawCard(next, side);
    next = addEvent(next, `${side === "player" ? "Du bekommst" : "Gegner bekommt"} Nachziehbonus: 1 extra Karte.`, "recovery");
  }
  return next;
}

function drawCard(state: GameState, side: "player" | "opponent"): GameState {
  const deckKey = side === "player" ? "deck" : "opponentDeck";
  const handKey = side === "player" ? "hand" : "opponentHand";
  const deck = state[deckKey];
  if (deck.length === 0) {
    const statsKey = side === "player" ? "player" : "opponent";
    const nextErschoepfung = state[statsKey].erschoepfung + 1;
    return addEvent(
      {
        ...state,
        [statsKey]: {
          ...state[statsKey],
          health: Math.max(0, state[statsKey].health - nextErschoepfung),
          erschoepfung: nextErschoepfung,
        },
      },
      `${side === "player" ? "Du hast" : "Gegner hat"} kein Deck mehr. Erschoepfung ${nextErschoepfung}: -${nextErschoepfung} Gesundheit.`,
      "danger",
    );
  }

  const [drawn, ...rest] = deck;
  const drawnCard = cardById.get(drawn);
  if (drawnCard?.kind === "zustand") {
    return applyDrawnStatus(
      {
        ...state,
        [deckKey]: rest,
      },
      side,
      drawn,
    );
  }
  const event = makeEvent(`${side === "player" ? "Du ziehst" : "Gegner zieht"} 1 Karte.`, "info");
  return {
    ...state,
    [deckKey]: rest,
    [handKey]: [...state[handKey], drawn],
    events: [event, ...state.events].slice(0, 8),
    analysisEvents: [...state.analysisEvents, event],
  };
}

function applyDrawnStatus(state: GameState, side: "player" | "opponent", cardId: string): GameState {
  const statsKey = side === "player" ? "player" : "opponent";
  const actor = side === "player" ? "Du ziehst" : "Gegner zieht";
  const stats = { ...state[statsKey] };

  if (cardId === "craving") {
    if (stats.stability >= 3) stats.stability = Math.max(0, stats.stability - 2);
    else stats.abhaengigkeit = Math.min(5, stats.abhaengigkeit + 1);
    return addEvent({ ...state, [statsKey]: stats }, `${actor} Craving: -2 Stabilitaet oder +1 Abhaengigkeit.`, "danger");
  }

  if (cardId === "entzug") {
    stats.health = Math.max(0, stats.health - 1);
    stats.stability = Math.max(0, stats.stability - 1);
    return addEvent({ ...state, [statsKey]: stats }, `${actor} Entzug: -1 Gesundheit, -1 Stabilitaet.`, "danger");
  }

  return state;
}

function opponentPlayOneCard(state: GameState): GameState {
  const playableId = state.opponentHand.find((cardId) => {
    const card = cardById.get(cardId);
    return card && card.cost <= state.opponent.cash && (card.kind !== "person" || state.opponentBoard.length < 5);
  });
  if (!playableId) return addEvent(state, "Gegner spielt keine Karte.", "info");

  const card = cardById.get(playableId);
  if (!card) return state;

  let next: GameState = {
    ...state,
    opponent: { ...state.opponent, cash: state.opponent.cash - card.cost },
    opponentHand: removeFirst(state.opponentHand, playableId),
  };

  if (card.kind === "person") {
    const ready = playableId === "raver_nachlegen" && next.opponent.rausch >= 2;
    next = { ...next, opponentBoard: [...next.opponentBoard, createBoardCard(playableId, "opponent", ready)] };
    next = applyPersonOnPlay(next, playableId, "opponent");
  } else {
    next = applySpellLikeEffect(next, playableId, "opponent");
  }

  return addEvent(next, `Gegner spielt ${card.name}.`, eventTone(playableId));
}

function opponentAttack(state: GameState): GameState {
  let next = state;
  for (const attacker of next.opponentBoard) {
    if (!attacker.canAttack || attacker.exhausted) continue;
    next = {
      ...next,
      player: { ...next.player, health: Math.max(0, next.player.health - attacker.attack) },
      opponentBoard: next.opponentBoard.map((card) =>
        card.instanceId === attacker.instanceId ? { ...card, exhausted: true, canAttack: false } : card,
      ),
    };
    next = applyAttackTriggers(next, attacker.cardId, "opponent");
    const card = cardById.get(attacker.cardId);
    next = addEvent(next, `Gegner: ${card?.name ?? "Person"} greift dich fuer ${attacker.attack} Schaden an.`, "danger");
  }
  return next;
}

function applySpellLikeEffect(state: GameState, cardId: string, side: "player" | "opponent", targetId?: string): GameState {
  const selfKey = side === "player" ? "player" : "opponent";
  const enemyKey = side === "player" ? "opponent" : "player";
  const ownBoardKey = side === "player" ? "playerBoard" : "opponentBoard";
  const enemyBoardKey = side === "player" ? "opponentBoard" : "playerBoard";

  const self = { ...state[selfKey] };
  const enemy = { ...state[enemyKey] };
  let ownBoard = [...state[ownBoardKey]];
  let enemyBoard = [...state[enemyBoardKey]];

  switch (cardId) {
    case "raver_anreissen":
      ownBoard = buffTarget(ownBoard, targetId, 2, 0);
      self.rausch = Math.min(10, self.rausch + 1);
      break;
    case "raver_druckwelle":
    case "awareness_deeskalation":
      enemyBoard = buffTarget(enemyBoard, targetId, -2, 0);
      if (cardId === "raver_druckwelle") self.rausch = Math.min(10, self.rausch + 1);
      if (cardId === "awareness_deeskalation") {
        self.fahndungsdruck = Math.max(0, self.fahndungsdruck - 1);
        enemy.fahndungsdruck = Math.max(0, enemy.fahndungsdruck - 1);
      }
      break;
    case "neutral_ueberforderung":
      if (ownBoard.some((card) => card.instanceId === targetId)) {
        ownBoard = buffTarget(ownBoard, targetId, -2, 0);
        self.stability = Math.max(0, self.stability - 1);
      } else {
        enemyBoard = buffTarget(enemyBoard, targetId, -2, 0);
        enemy.stability = Math.max(0, enemy.stability - 1);
      }
      break;
    case "raver_kieferkrampf":
      ownBoard = buffTarget(ownBoard, targetId, 1, 1);
      self.rausch = Math.min(10, self.rausch + 1);
      return drawCard({ ...state, [selfKey]: self, [enemyKey]: enemy, [ownBoardKey]: ownBoard, [enemyBoardKey]: enemyBoard }, side);
    case "raver_kein_morgen":
      enemy.health = Math.max(0, enemy.health - (self.rausch >= 5 ? 6 : 4));
      self.stability = Math.max(0, self.stability - 2);
      break;
    case "raver_bassdruck":
      enemyBoard = damageTarget(enemyBoard, targetId, self.rausch >= 3 ? 3 : 2);
      self.rausch = Math.min(10, self.rausch + 1);
      break;
    case "raver_durchballern":
      ownBoard = ownBoard.map((card, index) => ({
        ...card,
        attack: card.attack + 1,
        canAttack: targetId ? card.instanceId === targetId || card.canAttack : index === 0 ? true : card.canAttack,
        exhausted: targetId ? (card.instanceId === targetId ? false : card.exhausted) : index === 0 ? false : card.exhausted,
      }));
      self.rausch = Math.min(10, self.rausch + 2);
      self.stability = Math.max(0, self.stability - 1);
      break;
    case "raver_zusammenbruch": {
      enemyBoard = enemyBoard.map((card) => ({ ...card, health: card.health - 1 })).filter((card) => card.health > 0);
      const removed = Math.min(4, self.rausch);
      self.rausch = 0;
      self.stability = Math.max(0, self.stability - removed);
      break;
    }
    case "awareness_wasser":
      self.stability = Math.min(30, self.stability + 2);
      self.rausch = Math.max(0, self.rausch - 1);
      break;
    case "awareness_substanztest":
      if (self.rausch >= self.abhaengigkeit) self.rausch = Math.max(0, self.rausch - 2);
      else self.abhaengigkeit = Math.max(0, self.abhaengigkeit - 2);
      return drawCard({ ...state, [selfKey]: self, [enemyKey]: enemy, [ownBoardKey]: ownBoard, [enemyBoardKey]: enemyBoard }, side);
    case "awareness_schadensbegrenzung":
      enemyBoard = resetTargetBuff(enemyBoard, targetId);
      self.fahndungsdruck = Math.max(0, self.fahndungsdruck - 1);
      break;
    case "awareness_abschirmen":
      ownBoard = buffAll(ownBoard, 0, 2);
      self.stability = Math.min(30, self.stability + 2);
      break;
    case "awareness_intervention":
      enemyBoard = resetTargetBuff(enemyBoard, targetId).map((card, index) =>
        matchesTarget(card, targetId, index) ? { ...card, canAttack: false, exhausted: true } : card,
      );
      break;
    case "awareness_klarer_kopf":
      self.rausch = 0;
      self.abhaengigkeit = Math.max(0, self.abhaengigkeit - 2);
      self.stability = Math.min(30, self.stability + 4);
      break;
    case "awareness_therapieplatz":
      if (self.stability >= 30) self.abhaengigkeit = Math.max(0, self.abhaengigkeit - 1);
      else self.stability = Math.min(30, self.stability + 2);
      break;
    case "awareness_rueckzugsraum":
      self.rausch = Math.max(0, self.rausch - 1);
      break;
    case "dealer_kleiner_lauf":
      self.cash = Math.min(10, self.cash + 2);
      self.fahndungsdruck = Math.min(10, self.fahndungsdruck + 1);
      break;
    case "dealer_schnelles_geld":
      self.cash = Math.min(10, self.cash + 1);
      self.fahndungsdruck = Math.min(10, self.fahndungsdruck + 1);
      return drawCard({ ...state, [selfKey]: self, [enemyKey]: enemy, [ownBoardKey]: ownBoard, [enemyBoardKey]: enemyBoard }, side);
    case "dealer_bunkern":
      self.fahndungsdruck = Math.max(0, self.fahndungsdruck - 1);
      self.cash = Math.min(10, self.cash + 1);
      break;
    case "dealer_druckmittel":
      enemyBoard = damageTarget(enemyBoard, targetId, self.cash > 0 ? 5 : 3);
      self.fahndungsdruck = Math.min(10, self.fahndungsdruck + 1);
      break;
    case "dealer_abziehen": {
      const damage = Math.min(6, self.cash);
      self.cash = 0;
      enemy.health = Math.max(0, enemy.health - damage);
      self.fahndungsdruck = Math.min(10, self.fahndungsdruck + 2);
      if (self.fahndungsdruck >= 6) self.stability = Math.max(0, self.stability - 2);
      break;
    }
    case "dealer_grosse_lieferung":
      self.cash = Math.min(10, self.cash + 4);
      self.fahndungsdruck = Math.min(10, self.fahndungsdruck + 3);
      return drawCard({ ...state, [selfKey]: self, [enemyKey]: enemy, [ownBoardKey]: ownBoard, [enemyBoardKey]: enemyBoard }, side);
    case "dealer_schuldenbuch":
      self.cash = Math.min(10, self.cash + 1);
      enemy.health = Math.max(0, enemy.health - 1);
      if (self.fahndungsdruck >= 5) self.health = Math.max(0, self.health - 1);
      break;
    case "dealer_netzwerk":
      self.cash = Math.min(10, self.cash + 2);
      self.fahndungsdruck = Math.min(10, self.fahndungsdruck + 1);
      ownBoard = ownBoard.map((card) => (cardById.get(card.cardId)?.faction === "dealer" ? { ...card, attack: card.attack + 1 } : card));
      break;
    case "neutral_wasserflasche":
      self.stability = Math.min(30, self.stability + 1);
      self.rausch = Math.max(0, self.rausch - 1);
      break;
    case "neutral_frische_luft":
      self.stability = Math.min(30, self.stability + (self.rausch >= 3 ? 1 : 0));
      self.rausch = Math.max(0, self.rausch - 1);
      break;
    case "neutral_erste_hilfe":
      self.health = Math.min(30, self.health + 4);
      break;
    case "neutral_panikmoment":
      if (enemyBoard.length > 0) enemyBoard = damageFirst(enemyBoard, 2);
      else ownBoard = damageFirst(ownBoard, 2);
      self.stability = Math.max(0, self.stability - 1);
      enemy.stability = Math.max(0, enemy.stability - 1);
      break;
    case "neutral_taxi_nach_hause":
      ownBoard = removeTarget(ownBoard, targetId);
      self.stability = Math.min(30, self.stability + 3);
      self.rausch = Math.max(0, self.rausch - 1);
      break;
    case "neutral_gruppendruck":
      ownBoard = buffAll(ownBoard, 1, 0);
      enemyBoard = buffAll(enemyBoard, 1, 0);
      self.rausch = Math.min(10, self.rausch + 1);
      enemy.rausch = Math.min(10, enemy.rausch + 1);
      break;
    case "neutral_razzia_geruecht":
      self.fahndungsdruck = Math.min(10, self.fahndungsdruck + 1);
      enemy.fahndungsdruck = Math.min(10, enemy.fahndungsdruck + 1);
      return drawCard({ ...state, [selfKey]: self, [enemyKey]: enemy, [ownBoardKey]: ownBoard, [enemyBoardKey]: enemyBoard }, side);
    case "neutral_razzia":
      ownBoard = damageTagged(ownBoard, 3);
      enemyBoard = damageTagged(enemyBoard, 3);
      self.fahndungsdruck = Math.max(4, self.fahndungsdruck);
      enemy.fahndungsdruck = Math.max(4, enemy.fahndungsdruck);
      break;
    case "neutral_leerer_akku":
      return drawCard({ ...state, [selfKey]: self, [enemyKey]: enemy, [ownBoardKey]: ownBoard, [enemyBoardKey]: enemyBoard }, side);
    case "neutral_ruhiger_rueckzugsort":
      self.stability = Math.min(30, self.stability + 1);
      break;
    case "neutral_kaputter_schlaf":
      self.health = Math.min(30, self.health + 4);
      self.stability = Math.max(0, self.stability - 2);
      break;
    case "neutral_morgen_danach":
      ownBoard = ownBoard.map(resetBuff);
      enemyBoard = enemyBoard.map(resetBuff);
      self.rausch = 0;
      enemy.rausch = 0;
      self.stability = Math.max(0, self.stability - 2);
      enemy.stability = Math.max(0, enemy.stability - 2);
      break;
    case "neutral_offene_rechnung":
      enemy.health = Math.max(0, enemy.health - 2);
      if (self.cash > 0) self.cash = Math.max(0, self.cash - 1);
      else self.stability = Math.max(0, self.stability - 2);
      break;
    case "neutral_afterhour_sog":
      self.rausch = Math.min(10, self.rausch + 2);
      return drawCard(drawCard({ ...state, [selfKey]: self, [enemyKey]: enemy, [ownBoardKey]: ownBoard, [enemyBoardKey]: enemyBoard }, side), side);
    case "neutral_craving_schub":
      self.abhaengigkeit = Math.min(5, self.abhaengigkeit + 1);
      return drawCard(drawCard({ ...state, [selfKey]: self, [enemyKey]: enemy, [ownBoardKey]: ownBoard, [enemyBoardKey]: enemyBoard }, side), side);
    case "neutral_hinterhof_deal":
      self.cash = Math.min(10, self.cash + 2);
      self.fahndungsdruck = Math.min(10, self.fahndungsdruck + 1);
      break;
    case "neutral_blaulicht_geruecht":
      self.fahndungsdruck = Math.min(10, self.fahndungsdruck + 1);
      enemy.fahndungsdruck = Math.min(10, enemy.fahndungsdruck + 1);
      return drawCard({ ...state, [selfKey]: self, [enemyKey]: enemy, [ownBoardKey]: ownBoard, [enemyBoardKey]: enemyBoard }, side);
    case "neutral_schlafdefizit":
      if (ownBoard.some((card) => card.instanceId === targetId)) ownBoard = damageTarget(ownBoard, targetId, 1);
      else enemyBoard = damageTarget(enemyBoard, targetId, 1);
      if (self.rausch >= 4) self.abhaengigkeit = Math.min(5, self.abhaengigkeit + 1);
      else self.rausch = Math.min(10, self.rausch + 1);
      return drawCard({ ...state, [selfKey]: self, [enemyKey]: enemy, [ownBoardKey]: ownBoard, [enemyBoardKey]: enemyBoard }, side);
    case "neutral_kontrollverlust":
      ownBoard = ownBoard.map((card) => ({ ...card, health: card.health - 1 })).filter((card) => card.health > 0);
      enemyBoard = enemyBoard.map((card) => ({ ...card, health: card.health - 1 })).filter((card) => card.health > 0);
      self.rausch = Math.min(10, self.rausch + 1);
      enemy.rausch = Math.min(10, enemy.rausch + 1);
      break;
    case "neutral_beratungsflyer":
      return drawCard(
        {
          ...state,
          [selfKey]: reduceHighestRisk(self),
          [enemyKey]: enemy,
          [ownBoardKey]: ownBoard,
          [enemyBoardKey]: enemyBoard,
        },
        side,
      );
    case "neutral_druck_von_aussen":
      enemyBoard = buffTarget(enemyBoard, targetId, -1, 0);
      enemy.fahndungsdruck = Math.min(10, enemy.fahndungsdruck + 1);
      self.abhaengigkeit = Math.min(5, self.abhaengigkeit + 1);
      break;
    default:
      break;
  }

  return { ...state, [selfKey]: self, [enemyKey]: enemy, [ownBoardKey]: ownBoard, [enemyBoardKey]: enemyBoard };
}

function applyPersonOnPlay(state: GameState, cardId: string, side: "player" | "opponent"): GameState {
  const selfKey = side === "player" ? "player" : "opponent";
  const boardKey = side === "player" ? "playerBoard" : "opponentBoard";
  const self = { ...state[selfKey] };
  let board = [...state[boardKey]];

  switch (cardId) {
    case "raver_auf_anschlag":
      if (self.rausch > 0) board = board.map((card, index) => (index === board.length - 1 ? { ...card, attack: card.attack + 1 } : card));
      self.rausch = Math.min(10, self.rausch + 1);
      break;
    case "raver_clubgaenger":
      if (self.rausch >= 3) board = buffLast(board, 1, 0);
      break;
    case "dealer_laeufer":
      self.cash = Math.min(10, self.cash + 1);
      break;
    case "dealer_stammkunde":
      if (self.cash > 0) board = buffLast(board, 1, 0);
      break;
    case "dealer_mittelsmann":
      self.cash = Math.min(10, self.cash + 1);
      self.fahndungsdruck = Math.min(10, self.fahndungsdruck + 1);
      break;
    case "dealer_falscher_freund":
      self.cash = Math.min(10, self.cash + 1);
      if (self.fahndungsdruck >= 6) board = buffLast(board, 0, -2).filter((card) => card.health > 0);
      break;
    case "neutral_kontaktperson":
      if (board.length <= 1) return drawCard({ ...state, [selfKey]: self, [boardKey]: board }, side);
      break;
    case "neutral_schlechter_einfluss":
      board = board.map((card, index) => (index === 0 && board.length > 1 ? { ...card, attack: card.attack + 1 } : card));
      self.rausch = Math.min(10, self.rausch + 1);
      break;
    default:
      break;
  }

  return { ...state, [selfKey]: self, [boardKey]: board };
}

function createBoardCard(cardId: string, owner: "player" | "opponent", ready: boolean, temporary = false): BoardCard {
  const card = cardById.get(cardId);
  return {
    instanceId: `${owner}-${cardId}-${nextId++}`,
    cardId,
    owner,
    attack: card?.attack ?? 0,
    health: card?.stability ?? 1,
    exhausted: !ready,
    canAttack: ready,
    temporary,
  };
}

function buffFirst(board: BoardCard[], attack: number, health: number) {
  return board.map((card, index) =>
    index === 0 ? { ...card, attack: Math.max(0, card.attack + attack), health: card.health + health } : card,
  );
}

function buffTarget(board: BoardCard[], targetId: string | undefined, attack: number, health: number) {
  return board.map((card, index) =>
    matchesTarget(card, targetId, index) ? { ...card, attack: Math.max(0, card.attack + attack), health: card.health + health } : card,
  );
}

function buffAll(board: BoardCard[], attack: number, health: number) {
  return board.map((card) => ({ ...card, attack: Math.max(0, card.attack + attack), health: card.health + health }));
}

function buffLast(board: BoardCard[], attack: number, health: number) {
  return board.map((card, index) =>
    index === board.length - 1 ? { ...card, attack: Math.max(0, card.attack + attack), health: card.health + health } : card,
  );
}

function damageFirst(board: BoardCard[], damage: number) {
  return board
    .map((card, index) => (index === 0 ? { ...card, health: card.health - damage } : card))
    .filter((card) => card.health > 0);
}

function damageTarget(board: BoardCard[], targetId: string | undefined, damage: number) {
  return board
    .map((card, index) => (matchesTarget(card, targetId, index) ? { ...card, health: card.health - damage } : card))
    .filter((card) => card.health > 0);
}

function removeTarget(board: BoardCard[], targetId: string | undefined) {
  const fallbackIndex = board.length > 0 ? 0 : -1;
  return board.filter((card, index) => (targetId ? card.instanceId !== targetId : index !== fallbackIndex));
}

function damageTagged(board: BoardCard[], damage: number) {
  return board
    .map((boardCard) => {
      const definition = cardById.get(boardCard.cardId);
      const risky = definition?.tags.includes("deal") || definition?.tags.includes("fahndung");
      return risky ? { ...boardCard, health: boardCard.health - damage } : boardCard;
    })
    .filter((card) => card.health > 0);
}

function reduceHighestRisk(stats: PlayerStats): PlayerStats {
  const risks: Array<keyof Pick<PlayerStats, "fahndungsdruck" | "rausch" | "abhaengigkeit">> = [
    "fahndungsdruck",
    "rausch",
    "abhaengigkeit",
  ];
  const highest = risks.reduce((best, key) => (stats[key] > stats[best] ? key : best), risks[0]);
  if (stats[highest] <= 0) return stats;
  return { ...stats, [highest]: Math.max(0, stats[highest] - 1) };
}

function applyAttackTriggers(state: GameState, cardId: string, side: "player" | "opponent"): GameState {
  if (cardId !== "raver_nachlegen") return state;
  const statsKey = side === "player" ? "player" : "opponent";
  const stats = state[statsKey];
  return {
    ...state,
    [statsKey]: { ...stats, rausch: Math.min(10, stats.rausch + 1) },
  };
}

function applyOwnDamageTriggers(state: GameState, side: "player" | "opponent"): GameState {
  const boardKey = side === "player" ? "playerBoard" : "opponentBoard";
  const statsKey = side === "player" ? "player" : "opponent";
  if (!state[boardKey].some((card) => card.cardId === "awareness_krisenhelferin")) return state;
  const stats = state[statsKey];
  return {
    ...state,
    [statsKey]: { ...stats, stability: Math.min(30, stats.stability + 1) },
  };
}

function resetFirstBuff(board: BoardCard[]) {
  return board.map((card, index) => (index === 0 ? resetBuff(card) : card));
}

function resetTargetBuff(board: BoardCard[], targetId: string | undefined) {
  return board.map((card, index) => (matchesTarget(card, targetId, index) ? resetBuff(card) : card));
}

function matchesTarget(card: BoardCard, targetId: string | undefined, index: number) {
  return targetId ? card.instanceId === targetId : index === 0;
}

function resetBuff(boardCard: BoardCard) {
  const definition = cardById.get(boardCard.cardId);
  return {
    ...boardCard,
    attack: definition?.attack ?? boardCard.attack,
    health: Math.min(boardCard.health, definition?.stability ?? boardCard.health),
  };
}

function checkWinner(state: GameState): GameState {
  if (state.opponent.health <= 0 || state.opponent.stability <= 0) {
    return addEvent({ ...state, winner: "player" }, "Sieg: Gegner ist gebrochen.", "recovery");
  }
  if (state.player.health <= 0 || state.player.stability <= 0) {
    return addEvent({ ...state, winner: "opponent" }, "Niederlage: Du bist gebrochen.", "danger");
  }
  return state;
}

function removeFirst(items: string[], value: string) {
  const index = items.indexOf(value);
  if (index < 0) return items;
  return [...items.slice(0, index), ...items.slice(index + 1)];
}

function addEvent(
  state: GameState,
  text: string,
  tone: GameEvent["tone"],
  meta: Pick<GameEvent, "cardId" | "details"> = {},
): GameState {
  const event = makeEvent(text, tone, meta);
  return {
    ...state,
    events: [event, ...state.events].slice(0, 8),
    analysisEvents: [...state.analysisEvents, event],
  };
}

function makeEvent(text: string, tone: GameEvent["tone"], meta: Pick<GameEvent, "cardId" | "details"> = {}): GameEvent {
  return { id: `event-${nextId++}`, text, tone, ...meta };
}

function eventTone(cardId: string): GameEvent["tone"] {
  const card = cardById.get(cardId);
  if (card?.tags.includes("harm-reduction")) return "recovery";
  if (card?.tags.includes("polizei") || card?.tags.includes("fahndung") || card?.tags.includes("deal")) return "danger";
  return "warning";
}
