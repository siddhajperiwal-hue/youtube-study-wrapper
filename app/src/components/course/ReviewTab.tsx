"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReportItemType } from "@/components/ReportModal";
import type { ReviewFlashcard, ReviewQuestion } from "./types";

interface ReviewTabProps {
  courseId: string;
  firstChapterId: string | undefined;
  /** At least one chapter completed (mastered or watched) */
  hasProgress: boolean;
  questions: ReviewQuestion[];
  flashcards: ReviewFlashcard[];
  onReport: (type: ReportItemType, itemId: string) => void;
  showToast: (msg: string) => void;
}

/** Tab 3 (4.5): Active Revision Gym — practice questions and a flashcard deck from completed chapters. */
export function ReviewTab({ courseId, firstChapterId, hasProgress, questions, flashcards, onReport, showToast }: ReviewTabProps) {
  const [activeQIdx, setActiveQIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [activeFlashcardIdx, setActiveFlashcardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const activeQ = questions[activeQIdx] || null;
  const activeFlashcard = flashcards[activeFlashcardIdx] || null;

  const nextFlashcard = (toast: string) => {
    showToast(toast);
    setIsFlipped(false);
    setActiveFlashcardIdx((prev) => (prev + 1) % flashcards.length);
  };

  if (!hasProgress) {
    return (
      <section className="tab-pane active" id="tab-review" role="tabpanel">
        <div className="empty-state-card" style={{ display: "block", margin: "40px auto", maxWidth: "480px" }}>
          <div className="empty-icon-circle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
            </svg>
          </div>
          <h2 className="empty-state-title">Revision unlocks with progress.</h2>
          <p className="empty-state-desc">Complete your first chapter and quiz to unlock practice questions and flashcards here.</p>
          <Link
            href={`/course/${courseId}/learn/${firstChapterId}`}
            className="btn btn-primary"
            style={{ height: "40px", padding: "0 20px", display: "inline-flex", alignItems: "center" }}
          >
            Go to Chapter 1 →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="tab-pane active" id="tab-review" role="tabpanel">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "16px" }}>
        {/* Left Pane: Practice Question Card */}
        <div className="deck-card" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
            <span className="eyebrow-tag">PRACTICE QUESTION • {activeQ?.topic || "ACTIVE RECALL"}</span>
            {activeQ && (
              <button className="report-btn-tag" type="button" onClick={() => onReport("Question", activeQ.id)}>
                ⚑ Report
              </button>
            )}
          </div>

          <h3 className="quiz-question-title" style={{ fontSize: "16px", marginBottom: "16px" }}>
            {activeQ?.text || "No active questions found."}
          </h3>

          <div className="quiz-options-group">
            {activeQ?.options.map((opt, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = activeQ.correct_index === idx;
              let extraClass = "";
              if (showResult) {
                if (isCorrect) extraClass = "correct";
                else if (isSelected) extraClass = "incorrect";
              } else if (isSelected) {
                extraClass = "selected";
              }

              return (
                <button
                  key={idx}
                  className={`quiz-choice ${extraClass}`}
                  type="button"
                  onClick={() => {
                    if (!showResult) {
                      setSelectedAnswer(idx);
                      setShowResult(true);
                    }
                  }}
                >
                  <strong>{String.fromCharCode(65 + idx)}</strong>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          {showResult && activeQ?.explanation && (
            <p className="quiz-feedback" style={{ display: "block", marginTop: "12px" }}>
              {selectedAnswer === activeQ.correct_index ? "✓ Correct! " : "✗ Incorrect. "}
              {activeQ.explanation}
            </p>
          )}

          <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
            <button
              className="btn btn-ghost"
              style={{ fontSize: "13px" }}
              onClick={() => {
                setSelectedAnswer(null);
                setShowResult(false);
                setActiveQIdx((prev) => (prev + 1) % questions.length);
              }}
            >
              Next Practice Question →
            </button>
          </div>
        </div>

        {/* Right Pane: Saved Flashcard Deck */}
        <div style={{ perspective: "1000px" }}>
          {activeFlashcard ? (
            <div
              className="flashcard-inner"
              style={{
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                transition: "transform 250ms ease-out",
                minHeight: "320px",
                cursor: "pointer",
              }}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* Front Face */}
              <div className="flashcard-face flashcard-front" style={{ minHeight: "320px", padding: "24px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span className="eyebrow-tag">FLASHCARD • {activeFlashcard.topic}</span>
                    <button
                      className="report-btn-tag"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReport("Flashcard", activeFlashcard.id);
                      }}
                    >
                      ⚑ Report
                    </button>
                  </div>
                  <h3 className="flashcard-prompt-title" style={{ fontSize: "18px" }}>
                    {activeFlashcard.front}
                  </h3>
                </div>

                <div className="flashcard-hint">Click card to rotate & reveal answer</div>
              </div>

              {/* Back Face */}
              <div className="flashcard-face flashcard-back" style={{ minHeight: "320px", padding: "24px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-success)", textTransform: "uppercase" }}>
                      ✓ Reference Explanation
                    </span>
                    <button
                      className="report-btn-tag"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReport("Flashcard", activeFlashcard.id);
                      }}
                    >
                      ⚑ Report
                    </button>
                  </div>
                  <p className="flashcard-explanation" style={{ fontSize: "15px", lineHeight: "1.7" }}>
                    {activeFlashcard.back}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    className="btn btn-primary"
                    type="button"
                    style={{ flex: 1, height: "36px" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      nextFlashcard("Flashcard mastered ✓");
                    }}
                  >
                    Got It ✓
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    style={{ flex: 1, height: "36px", background: "var(--color-surface-muted)" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      nextFlashcard("Kept in review queue");
                    }}
                  >
                    Keep in Review ⟳
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px" }}>
              No flashcards in review queue.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
