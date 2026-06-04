import type { FactionDefinition } from "./types";

export const factions: FactionDefinition[] = [
  {
    id: "raver",
    name: "Raver",
    role: "Tempo, Boarddruck, Rausch",
    heroPower: {
      name: "Kurz im Spotlight",
      text: "4 Cash: Beschwoere einen 2/1 Spotlight-Sprinter. Er kann sofort angreifen, verschwindet am Zugende. +1 Rausch.",
    },
  },
  {
    id: "awareness",
    name: "Awareness",
    role: "Schutz, Stabilitaet, Risikosenkung",
    heroPower: {
      name: "Stabilisieren",
      text: "3 Cash: Waehle dich oder eine eigene Person. Held: +2 Gesundheit und +2 Stabilitaet. Person: +2 HP.",
    },
  },
  {
    id: "dealer",
    name: "Dealer",
    role: "Cash, Risiko, Fahndung",
    heroPower: {
      name: "Schneller Deal",
      text: "3 Cash: +3 Cash in diesem Zug. +1 Fahndung.",
    },
  },
  {
    id: "psychonauten",
    name: "Psychonauten",
    role: "Zufall, Kartenziehen, Rausch",
    heroPower: {
      name: "Perspektivwechsel",
      text: "2 Cash: Ziehe 1 Karte, wirf 1 zufaellige Karte ab.",
    },
  },
  {
    id: "junkies",
    name: "Junkies",
    role: "Abhaengigkeit, Craving, Comebacks",
    heroPower: {
      name: "Noch ein Tag",
      text: "2 Cash: Heile 2 Gesundheit. +1 Abhaengigkeit.",
    },
  },
  {
    id: "bullen",
    name: "Bullen",
    role: "Kontrolle, Razzia, Board-Clear",
    heroPower: {
      name: "Kontrolle",
      text: "2 Cash: Erhoehe die Fahndung des Gegners um 1.",
    },
  },
  {
    id: "aerzte",
    name: "Aerzte",
    role: "Heilung, Substitution, Stabilisierung",
    heroPower: {
      name: "Behandlung",
      text: "2 Cash: Heile 2 Gesundheit oder 2 Stabilitaet.",
    },
  },
];

export const playableFactions = factions.filter((faction) =>
  ["raver", "awareness", "dealer"].includes(faction.id),
);
