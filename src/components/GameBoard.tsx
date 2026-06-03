import { useState, type DragEvent } from "react";
import { cardById } from "../game/cards";
import { playableFactions } from "../game/factions";
import { canPlayCard, dangerLabel, rauschLabel, targetForCard, targetLabel } from "../game/rules";
import type { BoardCard, CardDefinition, CardTarget, GameState, PlayerStats } from "../game/types";

interface GameBoardProps {
  state: GameState;
  playedCardId: string;
  selectedCardId: string | null;
  selectedTarget: CardTarget | null;
  selectedHeroPower: boolean;
  selectedAttackerId: string | null;
  selectedCard: CardDefinition | null;
  canPlaySelected: boolean;
  canUseHeroPower: boolean;
  onSelectAttacker: (instanceId: string) => void;
  onAttackOpponentHero: () => void;
  onAttackOpponentMinion: (targetId: string) => void;
  onEndTurn: () => void;
  onPlaySelected: () => void;
  onPlaySelectedOnTarget: (targetId: string) => void;
  onPlayHandCard: (cardId: string, targetId?: string) => void;
  onUseHeroPower: (targetId?: string) => void;
  onSelectHandCard: (cardId: string) => void;
  opponentTitle: string;
  playerTitle: string;
}

export function GameBoard({
  state,
  selectedCardId,
  selectedTarget,
  selectedHeroPower,
  selectedAttackerId,
  selectedCard,
  canPlaySelected,
  canUseHeroPower,
  onSelectAttacker,
  onAttackOpponentHero,
  onAttackOpponentMinion,
  onEndTurn,
  onPlaySelected,
  onPlaySelectedOnTarget,
  onPlayHandCard,
  onUseHeroPower,
  onSelectHandCard,
  opponentTitle,
  playerTitle,
}: GameBoardProps) {
  const [inspectedCard, setInspectedCard] = useState<InspectedCard | null>(null);
  const centerCard = inspectedCard ?? (selectedCard ? { card: selectedCard } : null);
  const heroPower = playableFactions.find((faction) => faction.id === state.playerFaction)?.heroPower;
  const targetHint = selectedHeroPower
    ? "Waehle eine eigene Person fuer den Heldenskill"
    : selectedTarget
      ? targetLabel(selectedTarget)
      : selectedAttackerId
        ? "Waehle ein Ziel"
        : "";

  return (
    <section className="hearth-board" aria-label="Spielbrett">
      <div className="hearth-table">
        <div className="opponent-hand">
          {Array.from({ length: state.opponentHand.length }).map((_, index) => (
            <div
              className="card-back"
              key={index}
              style={{
                transform: `translateX(${(index - (state.opponentHand.length - 1) / 2) * -6}px) rotate(${(index - (state.opponentHand.length - 1) / 2) * 5}deg)`,
                zIndex: 10 + index,
              }}
            >
              <span />
            </div>
          ))}
        </div>

        <HeroPanel
          isTarget={Boolean(selectedAttackerId)}
          onClick={selectedAttackerId ? onAttackOpponentHero : undefined}
          side="opponent"
          stats={state.opponent}
          title={opponentTitle}
        />

        <BoardRow
          board={state.opponentBoard}
          onAttackOpponentMinion={onAttackOpponentMinion}
          onHoverCard={setInspectedCard}
          onPlayHandCard={onPlayHandCard}
          onPlaySelectedOnTarget={onPlaySelectedOnTarget}
          onUseHeroPower={onUseHeroPower}
          owner="opponent"
          selectedAttackerId={selectedAttackerId}
          selectedTarget={selectedTarget}
        />

        <div
          className="battlefield-center is-drop-zone"
          aria-label="Kampfzone"
          onDragOver={(event) => {
            const cardId = getDraggedCardId(event);
            if (canDropInCenter(cardId)) event.preventDefault();
          }}
          onDrop={(event) => {
            const cardId = getDraggedCardId(event);
            if (!canDropInCenter(cardId)) return;
            event.preventDefault();
            onPlayHandCard(cardId);
          }}
        >
          {centerCard ? (
            <CenterCardInfo inspected={centerCard} />
          ) : (
            <span>{targetHint}</span>
          )}
        </div>

        <BoardRow
          board={state.playerBoard}
          onHoverCard={setInspectedCard}
          onPlayHandCard={onPlayHandCard}
          onPlaySelectedOnTarget={onPlaySelectedOnTarget}
          onUseHeroPower={onUseHeroPower}
          onSelectAttacker={onSelectAttacker}
          owner="player"
          selectedAttackerId={selectedAttackerId}
          selectedHeroPower={selectedHeroPower}
          selectedTarget={selectedTarget}
        />

        <HeroPanel side="player" stats={state.player} title={playerTitle} />

        <div className="board-actions">
          <SelectedCardAction
            canPlaySelected={canPlaySelected}
            onPlaySelected={onPlaySelected}
            selectedCard={selectedCard}
            selectedTarget={selectedTarget}
          />
          <ResourceBar stats={state.player} />
          <button
            className={`hero-power-button ${selectedHeroPower ? "is-selected" : ""}`}
            disabled={!canUseHeroPower}
            onClick={() => onUseHeroPower()}
            type="button"
          >
            {heroPower?.name ?? "Heldenskill"}
          </button>
          <button className="end-turn board-end-turn" onClick={onEndTurn} type="button">
            Zug beenden
          </button>
          <span>Runde {state.turn}</span>
        </div>

        <HandFan
          cardIds={state.hand}
          onHoverCard={setInspectedCard}
          onSelect={onSelectHandCard}
          selectedCardId={selectedCardId}
          stats={state.player}
        />
      </div>
    </section>
  );
}

interface InspectedCard {
  card: CardDefinition;
  boardCard?: BoardCard;
}

function HeroPanel({
  side,
  title,
  stats,
  isTarget,
  onClick,
}: {
  side: "player" | "opponent";
  title: string;
  stats: PlayerStats;
  isTarget?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`hero-panel hero-${side} ${isTarget ? "is-target" : ""}`}
      disabled={!onClick}
      onClick={onClick}
      type="button"
    >
      <div className="hero-portrait">{side === "player" ? "CS" : "HR"}</div>
      <div className="hero-meta">
        <strong>{title}</strong>
        <span>Gesundheit {stats.health}/30</span>
        <div className="hero-meter hero-health" aria-hidden="true">
          <i style={{ width: `${Math.max(0, Math.min(100, (stats.health / 30) * 100))}%` }} />
        </div>
        <span>Stabilität {stats.stability}/30</span>
        <div className="hero-meter hero-stability" aria-hidden="true">
          <i style={{ width: `${Math.max(0, Math.min(100, (stats.stability / 30) * 100))}%` }} />
        </div>
      </div>
      <div className="hero-risk">
        <span title={dangerLabel(stats)}>Fahndung {stats.fahndungsdruck}</span>
        <span title={rauschLabel(stats.rausch)}>Rausch {stats.rausch}</span>
        <span>Abhängig {stats.abhaengigkeit}</span>
        <em className="risk-tooltip-panel">
          Rausch: 4+ kostet Kontrolle/Stabilitaet, 8+ Absturz. Fahndung: 3+ blockiert Cash, 9+ Razzia-Druck.
          Abhaengigkeit: kostet Stabilitaet am Zugbeginn, 4+ trifft Gesundheit.
        </em>
      </div>
    </button>
  );
}

interface BoardRowProps {
  board: BoardCard[];
  owner: "player" | "opponent";
  selectedAttackerId?: string | null;
  selectedHeroPower?: boolean;
  selectedTarget?: CardTarget | null;
  onAttackOpponentMinion?: (targetId: string) => void;
  onHoverCard?: (card: InspectedCard | null) => void;
  onPlayHandCard?: (cardId: string, targetId?: string) => void;
  onPlaySelectedOnTarget?: (targetId: string) => void;
  onUseHeroPower?: (targetId?: string) => void;
  onSelectAttacker?: (instanceId: string) => void;
}

function BoardRow({
  board,
  owner,
  selectedAttackerId,
  selectedHeroPower,
  selectedTarget,
  onAttackOpponentMinion,
  onHoverCard,
  onPlayHandCard,
  onPlaySelectedOnTarget,
  onUseHeroPower,
  onSelectAttacker,
}: BoardRowProps) {
  function canDropCardOnRow(cardId: string) {
    const card = cardById.get(cardId);
    return owner === "player" && Boolean(card) && card?.kind === "person" && !targetForCard(cardId);
  }

  return (
    <div
      className={`board-row board-row-${owner} ${owner === "player" ? "is-drop-zone" : ""}`}
      onDragOver={(event) => {
        const cardId = getDraggedCardId(event);
        if (canDropCardOnRow(cardId)) event.preventDefault();
      }}
      onDrop={(event) => {
        const cardId = getDraggedCardId(event);
        if (!canDropCardOnRow(cardId)) return;
        event.preventDefault();
        onPlayHandCard?.(cardId);
      }}
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const boardCard = board[index];
        const card = boardCard ? cardById.get(boardCard.cardId) : null;
        const isSpellTarget =
          Boolean(boardCard) &&
          ((selectedTarget === "ownPerson" && owner === "player") ||
            (selectedTarget === "enemyPerson" && owner === "opponent") ||
            selectedTarget === "anyPerson");
        const isHeroPowerTarget = Boolean(boardCard) && selectedHeroPower && owner === "player";

        return (
          <div className="board-slot" key={`${owner}-${index}`}>
            {card && boardCard ? (
              <button
                className={`board-card art-${card.id} ${boardCard.instanceId === selectedAttackerId ? "is-attacker-selected" : ""} ${selectedAttackerId && owner === "opponent" ? "is-target" : ""} ${isSpellTarget || isHeroPowerTarget ? "is-spell-target" : ""} ${boardCard.canAttack && owner === "player" && !selectedTarget && !selectedHeroPower ? "can-attack" : ""} ${boardCard.exhausted ? "is-exhausted" : ""}`}
                aria-disabled={isSpellTarget || isHeroPowerTarget ? false : owner === "player" ? !boardCard.canAttack : !selectedAttackerId}
                onClick={() => {
                  if (isHeroPowerTarget) {
                    onUseHeroPower?.(boardCard.instanceId);
                    return;
                  }
                  if (isSpellTarget) {
                    onPlaySelectedOnTarget?.(boardCard.instanceId);
                    return;
                  }
                  if (owner === "player" && boardCard.canAttack && !selectedTarget) onSelectAttacker?.(boardCard.instanceId);
                  if (owner === "opponent" && selectedAttackerId) onAttackOpponentMinion?.(boardCard.instanceId);
                }}
                onDragOver={(event) => {
                  const cardId = getDraggedCardId(event);
                  if (canDropOnBoardCard(cardId, owner)) event.preventDefault();
                }}
                onDrop={(event) => {
                  const cardId = getDraggedCardId(event);
                  if (!canDropOnBoardCard(cardId, owner)) return;
                  event.preventDefault();
                  event.stopPropagation();
                  onPlayHandCard?.(cardId, boardCard.instanceId);
                }}
                onMouseEnter={() => onHoverCard?.({ card, boardCard })}
                onMouseLeave={() => onHoverCard?.(null)}
                type="button"
              >
                <span className="board-card-cost">{card.cost}</span>
                <span className="board-card-art">
                  {card.image ? <img alt="" src={card.image} /> : iconFor(card.id)}
                </span>
                {boardCard.canAttack && owner === "player" && !selectedTarget && !selectedHeroPower ? (
                  <span className="attack-ready-badge" aria-label="Kann angreifen">
                    Angriff
                  </span>
                ) : null}
                <strong>{card.name}</strong>
                <small className="card-combat-value">
                  <span>{boardCard.attack} AP</span>
                  <span>{boardCard.health} HP</span>
                </small>
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function SelectedCardAction({
  selectedCard,
  selectedTarget,
  canPlaySelected,
  onPlaySelected,
}: {
  selectedCard: CardDefinition | null;
  selectedTarget: CardTarget | null;
  canPlaySelected: boolean;
  onPlaySelected: () => void;
}) {
  return (
    <div className="selected-action">
      {selectedCard ? (
        <>
          <strong>{selectedCard.name}</strong>
          <span>
            {selectedTarget
              ? targetLabel(selectedTarget)
              : selectedCard.kind === "person"
                  ? "Auf dein Board legen"
                  : "Effekt ausspielen"}
          </span>
          <button disabled={!canPlaySelected || Boolean(selectedTarget)} onClick={onPlaySelected} type="button">
            {selectedTarget ? "Ziel anklicken" : "Ausspielen"}
          </button>
        </>
      ) : (
        <span>Handkarte wählen oder bereite Person anklicken</span>
      )}
    </div>
  );
}

function CenterCardInfo({ inspected }: { inspected: InspectedCard }) {
  const { card, boardCard } = inspected;

  return (
    <div className="center-card-info" aria-label="Karteninfo">
      <span>{card.cost}</span>
      <strong>{card.name}</strong>
      <div>{card.image ? <img alt="" src={card.image} /> : card.kind}</div>
      <i>{card.kind}</i>
      <p>{card.effect}</p>
      {card.drawback ? <small>{card.drawback}</small> : null}
      {boardCard ? (
        <b className="card-combat-value">
          <span>{boardCard.attack} AP</span>
          <span>{boardCard.health} HP</span>
        </b>
      ) : null}
    </div>
  );
}

function ResourceBar({ stats }: { stats: PlayerStats }) {
  return (
    <div className="resource-bar" aria-label="Ressourcen">
      <strong>
        Cash {stats.cash}/{stats.maxCash}
      </strong>
      <div className="cash-crystals">
        {Array.from({ length: 10 }).map((_, index) => (
          <i className={index < stats.cash ? "is-filled" : index < stats.maxCash ? "is-empty" : ""} key={index} />
        ))}
      </div>
      <span>Kontrolle {stats.control}/10</span>
    </div>
  );
}

function HandFan({
  cardIds,
  selectedCardId,
  stats,
  onHoverCard,
  onSelect,
}: {
  cardIds: string[];
  selectedCardId: string | null;
  stats: PlayerStats;
  onHoverCard: (card: InspectedCard | null) => void;
  onSelect: (cardId: string) => void;
}) {
  const center = (cardIds.length - 1) / 2;

  return (
    <section className="hand-fan" aria-label="Handkarten">
      {cardIds.map((cardId, index) => {
        const card = cardById.get(cardId);
        if (!card) return null;
        const playable = canPlayCard(card, stats);
        const offset = index - center;
        const rotate = offset * 5;

        return (
          <button
            className={`fan-card ${selectedCardId === card.id ? "is-selected" : ""} ${playable ? "is-playable" : "is-locked"} art-${card.id}`}
            key={`${cardId}-${index}`}
            onClick={() => onSelect(card.id)}
            draggable={playable}
            onDragStart={(event) => {
              if (!playable) return;
              event.dataTransfer.setData("text/plain", card.id);
              event.dataTransfer.effectAllowed = "move";
              onSelect(card.id);
            }}
            onDragEnd={() => {
              onHoverCard(null);
            }}
            onMouseEnter={() => onHoverCard({ card })}
            onMouseLeave={() => onHoverCard(null)}
            style={{
              transform: `translateX(${offset * -10}px) rotate(${rotate}deg)`,
              zIndex: 20 + index,
            }}
            type="button"
          >
            <span className="card-cost">{card.cost}</span>
            <strong>{card.name}</strong>
            <span className="fan-card-art">{card.image ? <img alt="" src={card.image} /> : iconFor(card.id)}</span>
            <span className="fan-card-kind">{card.kind}</span>
            <small>{card.effect}</small>
            {card.kind === "person" ? (
              <b className="card-combat-value">
                <span>{card.attack} AP</span>
                <span>{card.stability} HP</span>
              </b>
            ) : null}
          </button>
        );
      })}
    </section>
  );
}

function getDraggedCardId(event: DragEvent<HTMLElement>) {
  return event.dataTransfer.getData("text/plain");
}

function canDropInCenter(cardId: string) {
  const card = cardById.get(cardId);
  return Boolean(card) && card?.kind !== "person" && !targetForCard(cardId);
}

function canDropOnBoardCard(cardId: string, owner: "player" | "opponent") {
  const target = targetForCard(cardId);
  if (target === "anyPerson") return true;
  if (target === "ownPerson") return owner === "player";
  if (target === "enemyPerson") return owner === "opponent";
  return false;
}

function iconFor(cardId: string) {
  const icons: Record<string, string> = {
    heroin: "!",
    kokain: ">>",
    mdma: "+/-",
    cannabis: "?",
    benzodiazepine: "zz",
    substanztest: "OK",
    streetworker: "+",
    therapieplatz: "H",
    razzia: "!",
    craving: "!",
    entzug: "-",
  };

  return icons[cardId] ?? "!";
}
