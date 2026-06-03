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
        <h1>Starthand waehlen</h1>
        <p>Waehle Karten aus, die du zurueck ins Deck mischen willst.</p>
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
              <strong>{card.name}</strong>
              <div>{card.image ? <img alt="" src={card.image} /> : card.kind}</div>
              <p>{card.effect}</p>
              <small>{selected.has(index) ? "Wird getauscht" : "Behalten"}</small>
            </button>
          );
        })}
      </section>

      <aside className="mulligan-actions">
        <strong>{selectedIndexes.length} ausgewaehlt</strong>
        <span>
          {isWaiting
            ? "Deine Starthand ist bestaetigt. Warte auf den anderen Spieler."
            : "Behaltene Karten bleiben in deiner Hand. Getauschte Karten werden eingemischt."}
        </span>
        <button disabled={isWaiting} onClick={onConfirm} type="button">
          {isWaiting ? "Warte auf Spieler" : "Mulligan bestaetigen"}
        </button>
      </aside>
    </main>
  );
}
