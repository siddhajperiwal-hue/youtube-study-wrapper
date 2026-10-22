// Neutral placeholder for a top-deck card whose data is still loading (instead of flashing an
// "unlocks with completed chapters" empty state the user may not actually be in)
export function DeckCardSkeleton({ label, boxed = false }: { label: string; boxed?: boolean }) {
  return (
    <div className={`deck-card-loading ${boxed ? "boxed" : ""}`} aria-busy="true" aria-label={label}>
      <span className="skeleton-bar" style={{ width: "55%" }} />
      <span className="skeleton-bar tall" style={{ width: "92%" }} />
      <span className="skeleton-bar tall" style={{ width: "70%" }} />
      <span className="skeleton-block" />
      <span className="skeleton-block" />
      <span className="skeleton-block" />
    </div>
  );
}
