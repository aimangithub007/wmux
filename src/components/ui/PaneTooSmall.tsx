/**
 * PaneTooSmall — placeholder shown when a pane is below the minimum usable size.
 * Wrap pane content in this guard via ResizeObserver.
 */
export function PaneTooSmall() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        background: "var(--color-background-primary)",
        color: "var(--color-text-tertiary)",
        fontSize: 11,
      }}
    >
      ···
    </div>
  );
}
