import { cardById } from "../game/cards";

interface MulliganScreenProps {
  hand: string[];
  isWaiting?: boolean;
  selectedIndexes: number[];
  onConfirm: () => void;
  onToggleCard: (index: number) => void;
}

export function MulliganScreen({
  hand,
  isWaiting = false,
  selectedIndexes,
  onConfirm,
  onToggleCard,
}: MulliganScreenProps) {
  const selected = new Set(selectedIndexes);

  return (
    <main className="mulligan-shell">
      <section className="mulligan-header">
        <span>Mulligan</span>
        <h1>Karten tauschen</h1>
        <p>Klicke Karten an, die du zurueck ins Deck mischen willst. Nicht markierte Karten bleiben in deiner Hand.</p>
      </section>

      <section className="mulligan-cards" aria-label="Starthand">
        {hand.map((cardId, index) => {
          const card = cardById.get(cardId);
          if (!card) return null;

          return (
            <button
              className={`mulligan-card ${selected.has(index) ? "is-marked" : ""}`}
              disabled={isWaiting}
              key={`${cardId}-${index}`}
              onClick={() => onToggleCard(index)}
              type="button"
            >
              <span className="card-cost">{card.cost}</span>
              <em>{selected.has(index) ? "Tauschen" : "Behalten"}</em>
              <strong>{card.name}</strong>
              <small className="mulligan-kind">{card.kind}</small>
              <div>{card.image ? <img alt="" src={card.image} /> : card.kind}</div>
              {card.kind === "person" ? (
                <span className="mulligan-stats">
                  {card.attack ?? 0} AP / {card.stability ?? 0} HP
                </span>
              ) : null}
              <p>{card.effect}</p>
            </button>
          );
        })}
      </section>

      <aside className="mulligan-actions">
        <strong>{selectedIndexes.length} zum Tauschen</strong>
        <span>
          {isWaiting
            ? "Deine Starthand ist bestaetigt. Warte auf den anderen Spieler."
            : "Behaltene Karten bleiben in deiner Hand. Getauschte Karten werden eingemischt."}
        </span>
        <button disabled={isWaiting} onClick={onConfirm} type="button">
          {isWaiting ? "Warte auf Spieler" : "Karten tauschen bestaetigen"}
        </button>
      </aside>
    </main>
  );
}
