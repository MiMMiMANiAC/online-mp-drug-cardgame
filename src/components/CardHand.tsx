import { cardById } from "../game/cards";
import { canPlayCard } from "../game/rules";
import type { PlayerStats } from "../game/types";

interface CardHandProps {
  cardIds: string[];
  selectedCardId: string | null;
  stats: PlayerStats;
  onSelect: (cardId: string) => void;
}

export function CardHand({ cardIds, selectedCardId, stats, onSelect }: CardHandProps) {
  return (
    <section className="hand" aria-label="Handkarten">
      {cardIds.map((cardId) => {
        const card = cardById.get(cardId);
        if (!card) return null;
        const playable = canPlayCard(card, stats);

        return (
          <button
            className={`card ${selectedCardId === card.id ? "is-selected" : ""} ${playable ? "is-playable" : "is-locked"} kind-${card.kind} art-${card.id}`}
            key={card.id}
            onClick={() => onSelect(card.id)}
            type="button"
          >
            <span className="card-cost">{card.cost}</span>
            <span className="card-kind">{card.kind}</span>
            <strong>{card.name}</strong>
            <span className="card-art" aria-hidden="true">
              {card.image ? <img alt="" src={card.image} /> : iconFor(card.id)}
            </span>
            <span className="card-effect">{card.effect}</span>
            {card.drawback ? <span className="card-drawback">{card.drawback}</span> : null}
          </button>
        );
      })}
    </section>
  );
}

function iconFor(cardId: string) {
  const icons: Record<string, string> = {
    heroin: "!",
    kokain: ">>",
    mdma: "+/-",
    cannabis: "?",
    benzodiazepine: "zz",
    substanztest: "ok",
    therapieplatz: "+",
  };

  return icons[cardId] ?? "*";
}
