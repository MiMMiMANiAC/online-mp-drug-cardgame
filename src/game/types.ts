export type CardKind = "substanz" | "person" | "ort" | "aktion" | "zustand";

export type RiskTag =
  | "stimulans"
  | "opioid"
  | "psychedelikum"
  | "beruhigung"
  | "harm-reduction"
  | "polizei"
  | "abhaengigkeit"
  | "rausch"
  | "fahndung"
  | "deal"
  | "neutral";

export type FactionId = "raver" | "awareness" | "dealer" | "psychonauten" | "junkies" | "bullen" | "aerzte";
export type CardFaction = FactionId | "neutral";

export type GamePhase = "deckbuilding" | "classSelect" | "mulligan" | "playing" | "gameover";
export type CardTarget = "ownPerson" | "enemyPerson" | "anyPerson" | "ownCharacter";

export interface FactionDefinition {
  id: FactionId;
  name: string;
  role: string;
  heroPower: {
    name: string;
    text: string;
  };
}

export interface CardDefinition {
  id: string;
  name: string;
  kind: CardKind;
  faction: CardFaction;
  tags: RiskTag[];
  cost: number;
  image?: string;
  attack?: number;
  stability?: number;
  effect: string;
  drawback?: string;
  flavor: string;
}

export interface PlayerStats {
  health: number;
  stability: number;
  fahndungsdruck: number;
  rausch: number;
  maxCash: number;
  cash: number;
  control: number;
  abhaengigkeit: number;
  erschoepfung: number;
  heroPowerUsed: boolean;
}

export interface BoardCard {
  instanceId: string;
  cardId: string;
  owner: "player" | "opponent";
  attack: number;
  health: number;
  exhausted: boolean;
  canAttack: boolean;
  temporary?: boolean;
}

export interface GameEvent {
  id: string;
  text: string;
  tone: "info" | "warning" | "danger" | "recovery";
  cardId?: string;
  details?: string;
}

export interface GameState {
  turn: number;
  activePlayer: "player" | "opponent";
  playerFaction: FactionId;
  opponentFaction: FactionId;
  player: PlayerStats;
  opponent: PlayerStats;
  deck: string[];
  hand: string[];
  opponentDeck: string[];
  opponentHand: string[];
  playerBoard: BoardCard[];
  opponentBoard: BoardCard[];
  events: GameEvent[];
  analysisEvents: GameEvent[];
  winner?: "player" | "opponent";
}
