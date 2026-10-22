import { padChapterNumber, type GuardedTarget } from "./types";

interface GuardedNavModalProps {
  target: GuardedTarget | null;
  currentChapterPosition: number;
  onCancel: () => void;
  onConfirm: (target: GuardedTarget) => void;
}

/** Confirmation before jumping to a timestamp that belongs to another chapter ("Option C" guarded seeking). */
export function GuardedNavModal({ target, currentChapterPosition, onCancel, onConfirm }: GuardedNavModalProps) {
  return (
    <div className={`modal-backdrop ${target ? "open" : ""}`} id="guardedModalBackdrop">
      <div className="modal-sheet">
        <h3>Switch Chapter Playback?</h3>
        <p id="guardedModalBodyText">
          You clicked a timestamp belonging to <strong>Chapter {target ? padChapterNumber(target.position) : ""}</strong>.
          Switching chapters will pause your current session in Chapter {padChapterNumber(currentChapterPosition)}.
        </p>
        <div className="modal-actions-row">
          <button className="btn-ch-nav" id="btnGuardedCancel" onClick={onCancel}>
            Stay on Current Chapter
          </button>
          <button className="btn-ch-nav primary" id="btnGuardedConfirm" onClick={() => target && onConfirm(target)}>
            Switch to Chapter
          </button>
        </div>
      </div>
    </div>
  );
}

interface PrototypeStripProps {
  onRecall: () => void;
  onQuiz: () => void;
  onBreak: () => void;
}

/**
 * Dev-only buttons to trigger the recall / quiz / break overlays without waiting.
 * (To be removed before launch — see docs/production-readiness.md.)
 */
export function PrototypeStrip({ onRecall, onQuiz, onBreak }: PrototypeStripProps) {
  return (
    <div className="test-simulation-strip">
      <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>PROTOTYPE TRIGGERS:</span>
      <button className="btn-test-trigger" id="testBtnRecall" title="Simulate 24h absence" onClick={onRecall}>
        24h Recall
      </button>
      <button className="btn-test-trigger" id="testBtnQuiz" title="Simulate video end" onClick={onQuiz}>
        100% Quiz
      </button>
      <button className="btn-test-trigger" id="testBtnBreak" title="Simulate 20m interval" onClick={onBreak}>
        20m Break
      </button>
    </div>
  );
}
