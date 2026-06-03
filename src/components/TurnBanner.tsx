interface TurnBannerProps {
  message: string;
  tone: "player" | "opponent" | "victory" | "defeat";
  visible: boolean;
}

export function TurnBanner({ message, tone, visible }: TurnBannerProps) {
  if (!visible) return null;

  return (
    <section className={`turn-banner turn-banner-${tone}`} aria-live="assertive">
      <div>
        <span>{tone === "player" ? "Bereit" : tone === "opponent" ? "Warten" : "Ende"}</span>
        <strong>{message}</strong>
      </div>
    </section>
  );
}
