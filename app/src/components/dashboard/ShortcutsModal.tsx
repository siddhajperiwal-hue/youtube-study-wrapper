// Keyboard Shortcuts Modal (Section 7.5)

const SHORTCUTS: { action: string; keys: string[] }[] = [
  { action: "Play / Pause Lecture", keys: ["Space / K"] },
  { action: "Rewind / Forward 5s", keys: ["J / ←", "L / →"] },
  { action: "Capture Timestamped Note", keys: ["T / Alt + T"] },
  { action: "Toggle Floating Notes Drawer", keys: ["N / Alt + N"] },
  { action: "Full-Screen Focus Mode", keys: ["F"] },
  { action: "Select MCQ Option", keys: ["1, 2, 3"] },
  { action: "Rotate 3D Flashcard", keys: ["Enter / Space"] },
  { action: "Close Modals / Drawers", keys: ["Esc"] },
];

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "6px 0",
  borderBottom: "1px solid var(--color-border-subtle)",
  fontSize: "14px",
};

const kbdStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "12px",
  padding: "3px 8px",
  background: "var(--color-surface-muted)",
  border: "1px solid var(--color-border)",
  borderRadius: "4px",
};

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      className={`modal-backdrop ${open ? "open" : ""}`}
      id="shortcutsModal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-sheet">
        <h3 className="modal-title">Keyboard Shortcuts</h3>
        <p className="modal-desc">Essential shortcuts for distraction-free study and video navigation.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {SHORTCUTS.map(({ action, keys }) => (
            <div key={action} style={rowStyle}>
              <span>{action}</span>
              {keys.length === 1 ? (
                <kbd style={kbdStyle}>{keys[0]}</kbd>
              ) : (
                <div style={{ display: "flex", gap: "4px" }}>
                  {keys.map((k) => (
                    <kbd key={k} style={kbdStyle}>
                      {k}
                    </kbd>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
