import { useState } from "react";
import type { CardDefinition, GameEvent } from "../game/types";
import { cardById } from "../game/cards";

interface EventLogProps {
  events: GameEvent[];
  opponentLabel: string;
  opponentPortrait: string;
  opponentSubLabel: string;
  playerLabel: string;
  playerPortrait: string;
  playerSubLabel: string;
}

export function EventLog({
  events,
  opponentLabel,
  opponentPortrait,
  opponentSubLabel,
  playerLabel,
  playerPortrait,
  playerSubLabel,
}: EventLogProps) {
  const [previewEvent, setPreviewEvent] = useState<GameEvent | null>(null);
  const previewCard = previewEvent?.cardId ? cardById.get(previewEvent.cardId) ?? null : null;

  return (
    <aside className="event-log" aria-label="Kampflog">
      <section className="player-badge opponent-badge">
        <div className="portrait">{opponentPortrait}</div>
        <div>
          <strong>{opponentLabel}</strong>
          <span>{opponentSubLabel}</span>
        </div>
      </section>

      <section className="log-card">
        <h2>Kampflog</h2>
        {events.map((event) => (
          <p className={`event event-${event.tone}`} key={event.id}>
            <span
              className="event-icon"
              onMouseEnter={() => setPreviewEvent(event)}
              onMouseLeave={() => setPreviewEvent(null)}
            >
              {iconFor(event.tone)}
            </span>
            {event.text}
          </p>
        ))}
      </section>
      {previewEvent ? <EventCardPreview card={previewCard} event={previewEvent} /> : null}

      <section className="risk-info-card">
        <h2>Risiken</h2>
        <RiskLine title="Rausch" text="4+: Kontrolle sinkt und Stabilitaet leidet. 8+: Absturz, -3 Stabilitaet und eigene Personen nehmen Schaden." />
        <RiskLine title="Fahndung" text="3+: Cash wird blockiert. 6+: mehr Cash- und Kontrollverlust. 9+: Razzia-Druck und Gesundheitsschaden." />
        <RiskLine title="Abhaengigkeit" text="Jeder Punkt kostet Stabilitaet am Zugbeginn. 4+: Entzug verursacht zusaetzlich Gesundheitsschaden." />
      </section>

      <section className="player-badge">
        <div className="portrait player-portrait">{playerPortrait}</div>
        <div>
          <strong>{playerLabel}</strong>
          <span>{playerSubLabel}</span>
        </div>
      </section>
    </aside>
  );
}

function EventCardPreview({ card, event }: { card: CardDefinition | null; event: GameEvent }) {
  const hasStats = card?.kind === "person" && card.attack !== undefined && card.stability !== undefined;

  return (
    <article className="event-card-preview">
      {card ? (
        <>
          <span className="event-preview-cost">{card.cost}</span>
          <strong>{card.name}</strong>
          <div className="event-preview-art">{card.image ? <img alt="" src={card.image} /> : card.kind}</div>
          <small>{card.kind}</small>
          <p>{card.effect}</p>
          {card.drawback ? <em>{card.drawback}</em> : null}
          {hasStats ? (
            <b className="card-combat-value">
              <span>{card.attack} AP</span>
              <span>{card.stability} HP</span>
            </b>
          ) : null}
        </>
      ) : (
        <strong>{event.text}</strong>
      )}
      {event.details ? <i>{event.details}</i> : null}
    </article>
  );
}

function RiskLine({ title, text }: { title: string; text: string }) {
  return (
    <p>
      <strong>{title}</strong>
      <span>{text}</span>
    </p>
  );
}

function iconFor(tone: GameEvent["tone"]) {
  if (tone === "danger") return "!";
  if (tone === "warning") return "!";
  if (tone === "recovery") return "+";
  return "i";
}
