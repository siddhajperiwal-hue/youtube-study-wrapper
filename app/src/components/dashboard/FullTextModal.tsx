import { flashcardEyebrow, quizEyebrow } from "./cardLabels";
import type { QuickQuizState } from "./useQuickQuiz";
import type { RecallFlashcardState } from "./useRecallFlashcard";

export type FullTextView = "quiz" | "flashcard" | null;

interface FullTextModalProps {
  view: FullTextView;
  quiz: QuickQuizState;
  flashcard: RecallFlashcardState;
  onClose: () => void;
}

/**
 * Complete, unclamped content of a top-deck card. Answers are only shown once revealed on the card
 * itself (quiz answered / flashcard flipped).
 */
export function FullTextModal({ view, quiz: q, flashcard: f, onClose }: FullTextModalProps) {
  const { quiz, showResult, selectedAnswer } = q;
  const { card, isFlipped } = f;

  return (
    <div
      className={`modal-backdrop ${view ? "open" : ""}`}
      id="fullTextModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fullTextModalTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-sheet full-text-sheet">
        {view === "quiz" && quiz && (
          <>
            <h3 className="modal-title" id="fullTextModalTitle">Quick Quiz</h3>
            <p className="modal-desc" style={{ marginBottom: 0 }}>{quizEyebrow(quiz)}</p>

            <div className="full-text-label">Question</div>
            <p className="full-text-body">{quiz.text}</p>

            <div className="full-text-label">Options</div>
            <div className="full-text-options">
              {quiz.options.map((opt, idx) => {
                let stateClass = "";
                if (showResult) {
                  if (idx === quiz.correct_index) stateClass = "correct";
                  else if (idx === selectedAnswer) stateClass = "incorrect";
                }
                return (
                  <div key={idx} className={`quiz-choice ${stateClass}`}>
                    <strong>{String.fromCharCode(65 + idx)}</strong>
                    <span>{opt}</span>
                  </div>
                );
              })}
            </div>

            {showResult && quiz.explanation && (
              <>
                <div className="full-text-label">
                  {selectedAnswer === quiz.correct_index ? "✓ Correct — Explanation" : "✗ Incorrect — Explanation"}
                </div>
                <p className="full-text-body">{quiz.explanation}</p>
              </>
            )}
          </>
        )}

        {view === "flashcard" && card && (
          <>
            <h3 className="modal-title" id="fullTextModalTitle">Recall Flashcard</h3>
            <p className="modal-desc" style={{ marginBottom: 0 }}>{flashcardEyebrow(card)}</p>

            <div className="full-text-label">Prompt</div>
            <p className="full-text-body">{card.front}</p>

            {isFlipped ? (
              <>
                <div className="full-text-label">Reference Explanation</div>
                <p className="full-text-body">{card.back}</p>
              </>
            ) : (
              <p className="modal-desc" style={{ marginTop: "16px", marginBottom: 0 }}>
                Flip the card to reveal the answer.
              </p>
            )}
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
