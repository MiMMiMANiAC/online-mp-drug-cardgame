import type { CardDefinition, CardFaction, CardKind } from "./types";

export type EffectStrength = "none" | "minor" | "medium" | "strong" | "extreme";
export type DrawbackStrength = "none" | "minor" | "medium" | "dangerous" | "extreme";
export type BalanceRating = "too_weak" | "fair" | "too_strong" | "needs_review";
export type BalanceWarningCode =
  | "too_strong"
  | "too_weak"
  | "missing_stats"
  | "missing_drawback_for_high_power"
  | "effect_text_unstructured"
  | "risk_reward_mismatch"
  | "needs_review";

export interface StatLine {
  attack: number;
  stability: number;
}

export interface StatSuggestion {
  budget: number;
  adjustedBudget: number;
  balanced: StatLine;
  aggressive: StatLine;
  defensive: StatLine;
}

export interface BalanceWarning {
  cardId: string;
  severity: "info" | "warning" | "danger";
  code: BalanceWarningCode;
  message: string;
}

export interface BalanceEvaluation {
  cardId: string;
  name: string;
  kind: CardKind;
  faction: CardFaction;
  cost: number;
  expectedBudget: number;
  estimatedValue: number;
  actualBudget: number;
  adjustedBudget: number;
  deviation: number;
  effectStrength: EffectStrength;
  drawbackStrength: DrawbackStrength;
  effectCategories: string[];
  drawbackCategories: string[];
  rating: BalanceRating;
  reason: string;
  warnings: BalanceWarning[];
  notes: string[];
}

export interface BalanceAnalysis {
  totalCards: number;
  fairCards: number;
  tooStrongCards: number;
  tooWeakCards: number;
  needsReviewCards: number;
  warnings: BalanceWarning[];
  evaluations: BalanceEvaluation[];
  averageDeviationByCost: Record<number, number>;
  averageDeviationByFaction: Record<CardFaction, number>;
  mostSuspiciousCards: BalanceEvaluation[];
}

const directDamageBudget: Record<number, number> = {
  0: 1,
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: 7,
  7: 9,
  8: 10,
  9: 12,
  10: 15,
};

const effectCosts: Record<EffectStrength, number> = {
  none: 0,
  minor: -1,
  medium: -2,
  strong: -3,
  extreme: -5,
};

const drawbackBonuses: Record<DrawbackStrength, number> = {
  none: 0,
  minor: 1,
  medium: 2,
  dangerous: 3,
  extreme: 4,
};

export function getBaseStatBudget(cost: number): number {
  return clampCost(cost) * 2 + 1;
}

export function getDirectDamageBudget(cost: number): number {
  return directDamageBudget[clampCost(cost)];
}

export function getMinionOnlyDamageBudget(cost: number): number {
  const base = getDirectDamageBudget(cost);
  return base + (cost >= 3 ? 2 : 1);
}

export function suggestStatsForCost(
  cost: number,
  effectStrength: EffectStrength = "none",
  drawbackStrength: DrawbackStrength = "none",
): StatSuggestion {
  const budget = getBaseStatBudget(cost);
  const adjustedBudget = Math.max(1, budget + effectCosts[effectStrength] + drawbackBonuses[drawbackStrength]);
  const balancedAttack = Math.max(0, Math.floor(adjustedBudget / 2));
  const balancedStability = Math.max(1, adjustedBudget - balancedAttack);

  return {
    budget,
    adjustedBudget,
    balanced: { attack: balancedAttack, stability: balancedStability },
    aggressive: {
      attack: Math.max(1, balancedAttack + 1),
      stability: Math.max(1, adjustedBudget - balancedAttack - 1),
    },
    defensive: {
      attack: Math.max(0, balancedAttack - 1),
      stability: Math.max(1, adjustedBudget - balancedAttack + 1),
    },
  };
}

export function evaluateCardPower(card: CardDefinition): BalanceEvaluation {
  const effectCategories = getEffectCategories(card);
  const drawbackCategories = getDrawbackCategories(card);
  const effectStrength = estimateEffectStrength(card, effectCategories);
  const drawbackStrength = estimateDrawbackStrength(card, drawbackCategories);
  const expectedBudget = expectedBudgetForCard(card);
  const actualBudget = actualBudgetForCard(card, effectCategories);
  const adjustedBudget = Math.max(0, expectedBudget + effectCosts[effectStrength] + drawbackBonuses[drawbackStrength]);
  const deviation = actualBudget - adjustedBudget;
  const rating = rateCard(card, deviation, effectStrength, drawbackStrength, effectCategories);
  const reason = explainRating(card, rating, effectStrength, drawbackStrength, effectCategories, drawbackCategories, deviation);
  const notes = describeHeuristics(card, effectStrength, drawbackStrength, effectCategories, drawbackCategories);
  const evaluationWithoutWarnings: BalanceEvaluation = {
    cardId: card.id,
    name: card.name,
    kind: card.kind,
    faction: card.faction,
    cost: card.cost,
    expectedBudget,
    estimatedValue: actualBudget,
    actualBudget,
    adjustedBudget,
    deviation,
    effectStrength,
    drawbackStrength,
    effectCategories,
    drawbackCategories,
    rating,
    reason,
    warnings: [],
    notes,
  };

  return {
    ...evaluationWithoutWarnings,
    warnings: validateCardBalance(card, evaluationWithoutWarnings),
  };
}

export function validateCardBalance(card: CardDefinition, evaluation = evaluateCardPowerWithoutWarnings(card)): BalanceWarning[] {
  const warnings: BalanceWarning[] = [];
  const text = combinedText(card);

  if (card.kind === "person" && (card.attack === undefined || card.stability === undefined)) {
    warnings.push(makeWarning(card, "danger", "missing_stats", "Personenkarte hat keine vollstaendigen Angriff/HP-Werte."));
  }

  if (evaluation.rating === "too_strong") {
    warnings.push(
      makeWarning(
        card,
        evaluation.deviation >= 5 ? "danger" : "warning",
        "too_strong",
        `Diese Karte liegt ca. ${evaluation.deviation} Punkte ueber dem erwarteten Kosten-Budget.`,
      ),
    );
  }

  if (evaluation.rating === "too_weak") {
    warnings.push(
      makeWarning(
        card,
        "warning",
        "too_weak",
        `Diese Karte liegt ca. ${Math.abs(evaluation.deviation)} Punkte unter dem erwarteten Kosten-Budget.`,
      ),
    );
  }

  if (evaluation.rating === "needs_review") {
    warnings.push(makeWarning(card, "info", "needs_review", evaluation.reason));
  }

  if ((evaluation.effectStrength === "strong" || evaluation.effectStrength === "extreme") && evaluation.drawbackStrength === "none") {
    if (hasRiskRewardTags(card)) {
      warnings.push(
        makeWarning(
          card,
          "warning",
          "missing_drawback_for_high_power",
          "Starker Effekt mit Risiko-/Tempo-Tags hat keinen erkennbaren Drawback.",
        ),
      );
    }
  }

  if (!text.includes(":") && !hasRecognizedEffectText(card)) {
    warnings.push(makeWarning(card, "info", "effect_text_unstructured", "Effekttext ist schwer strukturiert auswertbar."));
  }

  if (hasPositiveRiskEffect(card) && evaluation.drawbackStrength === "none" && hasRiskRewardTags(card)) {
    warnings.push(
      makeWarning(card, "warning", "risk_reward_mismatch", "Risiko-/Tempo-Karte erzeugt Vorteil ohne erkennbaren Nachteil."),
    );
  }

  return warnings;
}

export function analyzeAllCards(cardList: CardDefinition[]): BalanceAnalysis {
  const evaluations = cardList.map(evaluateCardPower);
  const warnings = evaluations.flatMap((evaluation) => evaluation.warnings);

  return {
    totalCards: evaluations.length,
    fairCards: evaluations.filter((evaluation) => evaluation.rating === "fair").length,
    tooStrongCards: evaluations.filter((evaluation) => evaluation.rating === "too_strong").length,
    tooWeakCards: evaluations.filter((evaluation) => evaluation.rating === "too_weak").length,
    needsReviewCards: evaluations.filter((evaluation) => evaluation.rating === "needs_review").length,
    warnings,
    evaluations,
    averageDeviationByCost: averageDeviationBy(evaluations, (evaluation) => evaluation.cost),
    averageDeviationByFaction: averageDeviationBy(evaluations, (evaluation) => evaluation.faction),
    mostSuspiciousCards: [...evaluations]
      .sort((first, second) => suspiciousScore(second) - suspiciousScore(first))
      .slice(0, 12),
  };
}

function evaluateCardPowerWithoutWarnings(card: CardDefinition): BalanceEvaluation {
  const effectCategories = getEffectCategories(card);
  const drawbackCategories = getDrawbackCategories(card);
  const effectStrength = estimateEffectStrength(card, effectCategories);
  const drawbackStrength = estimateDrawbackStrength(card, drawbackCategories);
  const expectedBudget = expectedBudgetForCard(card);
  const actualBudget = actualBudgetForCard(card, effectCategories);
  const adjustedBudget = Math.max(0, expectedBudget + effectCosts[effectStrength] + drawbackBonuses[drawbackStrength]);
  const deviation = actualBudget - adjustedBudget;
  const rating = rateCard(card, deviation, effectStrength, drawbackStrength, effectCategories);

  return {
    cardId: card.id,
    name: card.name,
    kind: card.kind,
    faction: card.faction,
    cost: card.cost,
    expectedBudget,
    estimatedValue: actualBudget,
    actualBudget,
    adjustedBudget,
    deviation,
    effectStrength,
    drawbackStrength,
    effectCategories,
    drawbackCategories,
    rating,
    reason: explainRating(card, rating, effectStrength, drawbackStrength, effectCategories, drawbackCategories, deviation),
    warnings: [],
    notes: describeHeuristics(card, effectStrength, drawbackStrength, effectCategories, drawbackCategories),
  };
}

function expectedBudgetForCard(card: CardDefinition) {
  if (card.kind === "person") return getBaseStatBudget(card.cost);
  if (isDamageText(card.effect)) {
    return card.effect.toLowerCase().includes("person") ? getMinionOnlyDamageBudget(card.cost) : getDirectDamageBudget(card.cost);
  }
  if (card.kind === "zustand") return Math.max(1, card.cost + 1);
  if (card.kind === "ort") return Math.max(2, card.cost + 2);
  return Math.max(1, card.cost + 1);
}

function actualBudgetForCard(card: CardDefinition, effectCategories: string[]) {
  const text = combinedText(card);
  let budget = card.kind === "person" ? (card.attack ?? 0) + (card.stability ?? 0) : 0;

  budget += countMatches(text, /ziehe\s+1\s+karte/g) * 2;
  budget += countMatches(text, /ziehe\s+2\s+karten/g) * 4;
  budget += sumNumberBefore(text, "cash");
  budget += countMatches(text, /reduziere\s+rausch|reduziere\s+abhaengigkeit|reduziere\s+fahndung/g) * 2;
  budget += countMatches(text, /reduziere\s+deinen\s+hoechsten\s+risikowert|reduziere\s+einen\s+deiner\s+risikowerte/g) * 2;
  budget += countMatches(text, /erhoehe\s+kontrolle|\+\d+\s+kontrolle/g) * 2;
  budget += countMatches(text, /heile\s+1|1\s+stabilitaet|1\s+gesundheit/g) * 1;
  budget += countMatches(text, /heile\s+2|2\s+stabilitaet|2\s+gesundheit/g) * 2;
  budget += countMatches(text, /heile\s+3|3\s+stabilitaet|3\s+gesundheit/g) * 3;
  budget += countMatches(text, /heile\s+4|4\s+stabilitaet|4\s+gesundheit/g) * 4;
  budget += countMatches(text, /kann sofort angreifen/g) * 3;
  budget += countMatches(text, /zerstoere/g) * 6;
  budget += highestNumberBefore(text, "schaden");
  budget += highestNumberBefore(text, "angriff");
  budget += highestNumberBefore(text, "stabilitaet");
  budget += highestNumberBefore(text, "gesundheit");

  if (effectCategories.includes("aoe")) budget += 3;
  if (effectCategories.includes("symmetric")) budget = Math.max(1, Math.round(budget * 0.7));
  return Math.max(1, budget);
}

function getEffectCategories(card: CardDefinition) {
  const text = card.effect.toLowerCase();
  const categories = new Set<string>();
  if (/ziehe\s+1\s+karte/.test(text)) categories.add("card_draw");
  if (/ziehe\s+2\s+karten/.test(text)) categories.add("big_card_draw");
  if (/erhalte\s+\+\d+\s+cash|\+\d+\s+cash/.test(text)) categories.add("tempo_cash");
  if (/reduziere\s+rausch|reduziere\s+abhaengigkeit|reduziere\s+fahndung|risikowert/.test(text)) categories.add("recovery");
  if (/erhoehe\s+kontrolle|\+\d+\s+kontrolle/.test(text)) categories.add("control_gain");
  if (isDamageText(text)) categories.add("damage");
  if (/allen?\s+(gegnerischen\s+)?personen|alle\s+eigenen\s+personen|beide\s+spieler/.test(text)) categories.add("aoe");
  if (/zerstoere/.test(text)) categories.add("removal");
  if (/heile|gesundheit|stabilitaet/.test(text)) categories.add("recovery");
  if (/kann sofort angreifen/.test(text)) categories.add("immediate_attack");
  if (/\+\d+\s+angriff/.test(text)) categories.add("attack_buff");
  if (/\+\d+\/\+\d+|\+\d+\s+stabilitaet|\+\d+\s+gesundheit/.test(text)) categories.add("defensive_buff");
  if (/gegner|gegnerische|gegnerischen/.test(text)) categories.add("offensive");
  if (/beide spieler/.test(text)) categories.add("symmetric");
  if (!categories.size && !isVanillaPersonText(text)) categories.add("unstructured");
  return [...categories];
}

function getDrawbackCategories(card: CardDefinition) {
  const drawback = card.drawback?.toLowerCase() ?? "";
  const categories = new Set<string>();
  if (!drawback) return [];
  if (/\+1\s+rausch/.test(drawback)) categories.add("minor_rausch");
  if (/\+2\s+rausch/.test(drawback)) categories.add("medium_rausch");
  if (/\+[3-9]\s+rausch/.test(drawback)) categories.add("dangerous_rausch");
  if (/\+1\s+fahndung/.test(drawback)) categories.add("minor_fahndung");
  if (/\+2\s+fahndung/.test(drawback)) categories.add("medium_fahndung");
  if (/\+[3-9]\s+fahndung/.test(drawback)) categories.add("dangerous_fahndung");
  if (/\+1\s+abhaengigkeit/.test(drawback)) categories.add("medium_abhaengigkeit");
  if (/\+[2-9]\s+abhaengigkeit/.test(drawback)) categories.add("dangerous_abhaengigkeit");
  if (/verlier(?:e|st).*kontrolle/.test(drawback)) categories.add("control_loss");
  if (/verlier(?:e|st).*(gesundheit|stabilitaet)|-\d+\s+(gesundheit|stabilitaet)/.test(drawback)) categories.add("self_damage");
  if (/lege.*karte.*ab|wirf.*karte.*ab/.test(drawback)) categories.add("discard");
  if (/zerstoere.*eigene\s+person/.test(drawback)) categories.add("sacrifice");
  if (/beide spieler/.test(drawback)) categories.add("symmetric_drawback");
  if (/verschwindet|nur durch|bei fahndung|bei rausch/.test(drawback)) categories.add("conditional_risk");
  return [...categories];
}

function estimateEffectStrength(card: CardDefinition, categories: string[]): EffectStrength {
  let score = 0;
  if (card.kind === "person" && !isVanillaPersonText(card.effect.toLowerCase())) score += 1;
  if (categories.includes("card_draw")) score += 2;
  if (categories.includes("big_card_draw")) score += 4;
  if (categories.includes("tempo_cash")) score += 2;
  if (categories.includes("recovery")) score += 2;
  if (categories.includes("control_gain")) score += 2;
  if (categories.includes("damage")) score += 2;
  if (categories.includes("aoe")) score += 3;
  if (categories.includes("removal")) score += 5;
  if (categories.includes("immediate_attack")) score += 4;
  if (categories.includes("attack_buff")) score += 2;
  if (categories.includes("defensive_buff")) score += 1;
  if (categories.includes("offensive")) score += 1;
  if (categories.includes("symmetric")) score -= 2;
  return strengthFromScore(score);
}

function estimateDrawbackStrength(card: CardDefinition, categories: string[]): DrawbackStrength {
  if (!card.drawback) return "none";

  let score = 0;
  if (categories.includes("minor_rausch")) score += 1;
  if (categories.includes("medium_rausch")) score += 2;
  if (categories.includes("dangerous_rausch")) score += 3;
  if (categories.includes("minor_fahndung")) score += 1;
  if (categories.includes("medium_fahndung")) score += 2;
  if (categories.includes("dangerous_fahndung")) score += 3;
  if (categories.includes("medium_abhaengigkeit")) score += 2;
  if (categories.includes("dangerous_abhaengigkeit")) score += 3;
  if (categories.includes("control_loss")) score += 2;
  if (categories.includes("self_damage")) score += 3;
  if (categories.includes("discard")) score += 2;
  if (categories.includes("sacrifice")) score += 5;
  if (categories.includes("conditional_risk")) score += 1;
  if (categories.includes("symmetric_drawback")) score = Math.max(1, Math.round(score * 0.6));

  if (score >= 5) return "extreme";
  if (score >= 3) return "dangerous";
  if (score >= 2) return "medium";
  return "minor";
}

function rateCard(
  card: CardDefinition,
  deviation: number,
  effectStrength: EffectStrength,
  drawbackStrength: DrawbackStrength,
  effectCategories: string[],
): BalanceRating {
  const uncertain =
    effectCategories.includes("unstructured") ||
    effectStrength === "extreme" ||
    (effectStrength === "strong" && drawbackStrength === "dangerous") ||
    (card.kind !== "person" && Math.abs(deviation) >= 3);
  if (uncertain) return "needs_review";
  if (deviation >= 3) return "too_strong";
  if (deviation <= -3) return "too_weak";
  return "fair";
}

function explainRating(
  card: CardDefinition,
  rating: BalanceRating,
  effectStrength: EffectStrength,
  drawbackStrength: DrawbackStrength,
  effectCategories: string[],
  drawbackCategories: string[],
  deviation: number,
) {
  if (rating === "needs_review") {
    if (effectCategories.includes("unstructured")) return "Effekttext ist schwer auswertbar; manuelle Pruefung empfohlen.";
    if (effectStrength === "extreme" || drawbackStrength === "dangerous" || drawbackStrength === "extreme") {
      return "Starke Spezialwirkung und relevanter Drawback; Text-Heuristik ist unsicher.";
    }
    if (card.kind !== "person") return "Nicht-Person-Karte mit deutlicher Abweichung; Effektwert muss manuell bewertet werden.";
    return "Heuristik ist unsicher; Karte bitte manuell pruefen.";
  }
  if (rating === "too_strong") return `Geschaetzter Wert liegt ${deviation} Punkte ueber dem Kosten-Budget.`;
  if (rating === "too_weak") return `Geschaetzter Wert liegt ${Math.abs(deviation)} Punkte unter dem Kosten-Budget.`;
  if (drawbackCategories.length) return "Wirkt nach aktueller Heuristik fair, inklusive erkannter Nebenwirkungen.";
  return "Wirkt nach aktueller Heuristik fair.";
}

function describeHeuristics(
  card: CardDefinition,
  effectStrength: EffectStrength,
  drawbackStrength: DrawbackStrength,
  effectCategories: string[],
  drawbackCategories: string[],
) {
  const notes = [`Effekt: ${effectStrength}`, `Nachteil: ${drawbackStrength}`];
  if (effectCategories.length) notes.push(`Effektkategorien: ${effectCategories.join(", ")}`);
  if (drawbackCategories.length) notes.push(`Drawback-Kategorien: ${drawbackCategories.join(", ")}`);
  if (card.tags.length) notes.push(`Tags: ${card.tags.join(", ")}`);
  if (card.kind === "person") notes.push(`Stats: ${card.attack ?? "?"}/${card.stability ?? "?"}`);
  if (hasRiskRewardTags(card)) notes.push("Risiko-/Tempo-Achse erkannt");
  return notes;
}

function suspiciousScore(evaluation: BalanceEvaluation) {
  return Math.abs(evaluation.deviation) + (evaluation.rating === "needs_review" ? 2 : 0) + evaluation.warnings.length;
}

function strengthFromScore(score: number): EffectStrength {
  if (score <= 0) return "none";
  if (score <= 2) return "minor";
  if (score <= 4) return "medium";
  if (score <= 7) return "strong";
  return "extreme";
}

function makeWarning(card: CardDefinition, severity: BalanceWarning["severity"], code: BalanceWarningCode, message: string) {
  return { cardId: card.id, severity, code, message };
}

function averageDeviationBy<Key extends string | number>(
  evaluations: BalanceEvaluation[],
  keyFor: (evaluation: BalanceEvaluation) => Key,
) {
  const groups = new Map<Key, { total: number; count: number }>();
  for (const evaluation of evaluations) {
    const key = keyFor(evaluation);
    const group = groups.get(key) ?? { total: 0, count: 0 };
    group.total += evaluation.deviation;
    group.count += 1;
    groups.set(key, group);
  }

  return Object.fromEntries(
    [...groups.entries()].map(([key, group]) => [key, Number((group.total / group.count).toFixed(2))]),
  ) as Record<Key, number>;
}

function hasRecognizedEffectText(card: CardDefinition) {
  const text = combinedText(card);
  return /ziehe|fuege|schaden|reduziere|heile|cash|angriff|stabilitaet|gesundheit|kontrolle|rausch|fahndung|abhaengigkeit|zerstoere/.test(
    text,
  );
}

function hasPositiveRiskEffect(card: CardDefinition) {
  const text = card.effect.toLowerCase();
  return /ziehe|\+.*cash|\+.*angriff|fuege.*schaden|kann sofort angreifen|erhalte/.test(text);
}

function hasRiskRewardTags(card: CardDefinition) {
  return card.tags.some((tag) => tag === "rausch" || tag === "fahndung" || tag === "abhaengigkeit" || tag === "deal");
}

function isDamageText(text: string) {
  return text.toLowerCase().includes("fuege") || text.toLowerCase().includes("schaden");
}

function isVanillaPersonText(text: string) {
  return text.includes("ohne soforteffekt") || text.includes("solide neutrale person") || text.includes("starke person mit hohem risiko");
}

function combinedText(card: CardDefinition) {
  return `${card.effect} ${card.drawback ?? ""}`.toLowerCase();
}

function countMatches(text: string, pattern: RegExp) {
  return text.match(pattern)?.length ?? 0;
}

function highestNumberBefore(text: string, word: string) {
  const matches = [...text.matchAll(new RegExp(`(\\d+)\\s+${word}`, "g"))];
  return matches.reduce((highest, match) => Math.max(highest, Number(match[1] ?? 0)), 0);
}

function sumNumberBefore(text: string, word: string) {
  return [...text.matchAll(new RegExp(`\\+(\\d+)\\s+${word}`, "g"))].reduce(
    (sum, match) => sum + Number(match[1] ?? 0),
    0,
  );
}

function clampCost(cost: number) {
  return Math.max(0, Math.min(10, Math.trunc(cost)));
}
