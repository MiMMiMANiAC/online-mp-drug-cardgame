import type { CardDefinition, CardTarget, PlayerStats } from "./types";

export const SELF_HERO_TARGET = "__self_hero";

export function canPlayCard(card: CardDefinition, stats: PlayerStats) {
  return stats.cash >= card.cost;
}

export function dangerLabel(stats: PlayerStats) {
  if (stats.fahndungsdruck >= 9) return "Razzia unmittelbar";
  if (stats.fahndungsdruck >= 6) return "Zielscheibe";
  if (stats.fahndungsdruck >= 3) return "Beobachtet";
  return "Unauffällig";
}

export function rauschLabel(value: number) {
  if (value >= 8) return "Absturz";
  if (value >= 6) return "Kontrollverlust";
  if (value >= 4) return "Unter Einfluss";
  return "Klarer Kopf";
}

export function targetForCard(cardId: string): CardTarget | null {
  const ownPersonTargets = new Set([
    "raver_anreissen",
    "raver_kieferkrampf",
    "raver_durchballern",
    "neutral_taxi_nach_hause",
  ]);
  const ownCharacterTargets = new Set([
    "awareness_wasser",
    "neutral_wasserflasche",
    "neutral_erste_hilfe",
  ]);
  const enemyPersonTargets = new Set([
    "raver_druckwelle",
    "raver_bassdruck",
    "awareness_schadensbegrenzung",
    "awareness_intervention",
    "dealer_druckmittel",
    "neutral_druck_von_aussen",
  ]);
  const anyPersonTargets = new Set([
    "neutral_ueberforderung",
    "neutral_schlafdefizit",
  ]);

  if (ownPersonTargets.has(cardId)) return "ownPerson";
  if (ownCharacterTargets.has(cardId)) return "ownCharacter";
  if (enemyPersonTargets.has(cardId)) return "enemyPerson";
  if (anyPersonTargets.has(cardId)) return "anyPerson";
  return null;
}

export function targetLabel(target: CardTarget) {
  if (target === "ownPerson") return "Eigene Person waehlen";
  if (target === "ownCharacter") return "Dich oder eigene Person waehlen";
  if (target === "enemyPerson") return "Gegnerische Person waehlen";
  return "Beliebige Person waehlen";
}
