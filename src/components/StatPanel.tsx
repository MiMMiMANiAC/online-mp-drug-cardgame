import { dangerLabel, rauschLabel } from "../game/rules";
import type { CardDefinition, PlayerStats } from "../game/types";

interface StatPanelProps {
  title: string;
  opponentTitle: string;
  stats: PlayerStats;
  opponentStats: PlayerStats;
  selectedCard: CardDefinition | null;
  canPlaySelected: boolean;
  turn: number;
  onPlaySelected: () => void;
  onEndTurn: () => void;
}

export function StatPanel({
  title,
  opponentTitle,
  stats,
  opponentStats,
  selectedCard,
  canPlaySelected,
  turn,
  onPlaySelected,
  onEndTurn,
}: StatPanelProps) {
  return (
    <aside className="stats-panel" aria-label="Spielerstatus und Aktionen">
      <section className="status-card opponent-status">
        <h2>{opponentTitle}</h2>
        <Meter label="Gesundheit" value={opponentStats.health} max={30} tone="health" />
        <Meter label="Stabilität" value={opponentStats.stability} max={30} tone="stability" />
      </section>

      <section className="status-card">
        <h2>{title}</h2>
        <Meter label="Gesundheit" value={stats.health} max={30} tone="health" />
        <Meter label="Stabilität" value={stats.stability} max={30} tone="stability" />
        <Meter label="Fahndungsdruck" value={stats.fahndungsdruck} max={10} tone="danger" hint={`${dangerLabel(stats)} - Razzia bei 9+`} />
        <Meter label="Rausch" value={stats.rausch} max={10} tone="rausch" hint={rauschLabel(stats.rausch)} />
        <Meter label="Abhängigkeit" value={stats.abhaengigkeit} max={5} tone="addiction" dots />
      </section>

      <section className="status-card resources">
        <h2>Ressourcen</h2>
        <Meter label="Cash" value={stats.cash} max={10} tone="cash" />
        <small className="resource-note">Max Cash: {stats.maxCash} / 10</small>
        <Meter label="Kontrolle" value={stats.control} max={10} tone="control" />
      </section>

      <section className="selected-card-panel">
        {selectedCard ? (
          <>
            <div className="selected-card-thumb">
              {selectedCard.image ? <img alt="" src={selectedCard.image} /> : null}
            </div>
            <div>
              <span>{selectedCard.kind}</span>
              <h3>{selectedCard.name}</h3>
              <p>{selectedCard.effect}</p>
              {selectedCard.drawback ? <small>{selectedCard.drawback}</small> : null}
            </div>
            <button className="play-card-button" type="button" disabled={!canPlaySelected} onClick={onPlaySelected}>
              Erneut ausspielen
            </button>
          </>
        ) : (
          <p className="empty-selection">Klicke eine Handkarte, um sie direkt auszuspielen.</p>
        )}
      </section>

      <button className="end-turn" type="button" onClick={onEndTurn}>
        Zug beenden
      </button>
      <div className="round-clock">
        <strong>Runde {turn}</strong>
        <span>Gegner reagiert beim Zugende</span>
      </div>
    </aside>
  );
}

interface MeterProps {
  label: string;
  value: number;
  max: number;
  tone: string;
  hint?: string;
  dots?: boolean;
}

function Meter({ label, value, max, tone, hint, dots }: MeterProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`meter meter-${tone}`}>
      <div className="meter-row">
        <span>{label}</span>
        <strong>
          {value} / {max}
        </strong>
      </div>
      {dots ? (
        <div className="dot-meter">
          {Array.from({ length: max }).map((_, index) => (
            <i className={index < value ? "is-filled" : ""} key={index} />
          ))}
        </div>
      ) : (
        <div className="meter-track">
          <span style={{ width: `${percent}%` }} />
        </div>
      )}
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}
