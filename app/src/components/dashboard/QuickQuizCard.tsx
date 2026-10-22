"use client";

import { useRef } from "react";
import { useHasTruncatedText } from "@/hooks/useHasTruncatedText";
import { quizEyebrow } from "./cardLabels";
import { DeckCardSkeleton } from "./DeckCardSkeleton";
import type { ReportItemType } from "./types";
import type { QuickQuizState } from "./useQuickQuiz";

interface QuickQuizCardProps {
  quiz: QuickQuizState;
  cardsLoaded: boolean;
  onReport: (type: ReportItemType, itemId: string) => void;
  onShowFullText: () => void;
}

const countPillStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "var(--color-text-secondary)",
  background: "var(--color-surface-muted)",
  padding: "2px 7px",
  borderRadius: "9999px",
  border: "1px solid var(--color-border-subtle)",
  whiteSpace: "nowrap",
};

/** Top deck card 2: a question drawn from completed chapters, answered with instant feedback. */
export function QuickQuizCard({ quiz: q, cardsLoaded, onReport, onShowFullText }: QuickQuizCardProps) {
  const { quiz, selectedAnswer, showResult, seenIds, total, exhausted, stats, isCycling } = q;
  const cardRef = useRef<HTMLElement>(null);
  const truncated = useHasTruncatedText(cardRef, [quiz?.id, showResult, cardsLoaded]);

  return (
    <article className="deck-card" id="quickQuizCard" ref={cardRef}>
      {!cardsLoaded ? (
        <DeckCardSkeleton label="Loading quick quiz" />
      ) : exhausted || (!quiz && total > 0) ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "180px", textAlign: "center", padding: "12px 8px" }}>
          <div style={{ fontSize: "28px", marginBottom: "6px" }}>🎉</div>
          <h4 style={{ fontFamily: "var(--font-serif)", fontSize: "16px", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "4px" }}>
            All Completed Questions Reviewed!
          </h4>
          <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", lineHeight: 1.4, marginBottom: "12px", maxWidth: "260px" }}>
            You&apos;ve answered all {total} questions across your completed chapters without repetition ({stats.correct} of {stats.totalAnswered} correct).
          </p>
          <button
            className="btn btn-primary"
            type="button"
            style={{ height: "32px", fontSize: "12px", padding: "0 14px" }}
            onClick={() => q.next(true)}
          >
            Practice Deck Again ⟳
          </button>
          <span style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "8px" }}>
            Complete more chapters across your courses to unlock new questions.
          </span>
        </div>
      ) : quiz ? (
        <>
          <div className="deck-card-body">
            <div className="deck-card-header">
              <span className="eyebrow-tag" title={quizEyebrow(quiz)}>
                <svg className="icon" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span className="eyebrow-text">{quizEyebrow(quiz)}</span>
              </span>
              <div className="deck-card-header-actions">
                {truncated && (
                  <button className="report-btn-tag full-text-btn" type="button" title="View the full question" onClick={onShowFullText}>
                    ⤢ Full text
                  </button>
                )}
                {total > 0 && (
                  <span style={countPillStyle} title="Drawn strictly from completed chapters across your enrolled courses">
                    {seenIds.length} of {total}
                  </span>
                )}
                <button className="report-btn-tag" type="button" onClick={() => onReport("Question", quiz.id)}>
                  ⚑ Report
                </button>
              </div>
            </div>

            <h3 className="quiz-question-title clamp-text" data-clamp title={quiz.text}>
              {quiz.text}
            </h3>

            {/* Instant verification options (Section 3.2 Card 2) */}
            <div className="quiz-options-group">
              {quiz.options.map((opt, idx) => {
                const isSelected = selectedAnswer === idx;
                const isCorrect = quiz.correct_index === idx;
                let stateClass = "";
                if (showResult) {
                  if (isCorrect) stateClass = "correct";
                  else if (isSelected) stateClass = "incorrect";
                } else if (isSelected) {
                  stateClass = "selected";
                }

                return (
                  <button key={idx} className={`quiz-choice ${stateClass}`} type="button" onClick={() => q.answer(idx)}>
                    <strong>{String.fromCharCode(65 + idx)}</strong>
                    <span className="quiz-choice-text clamp-text" data-clamp title={opt}>
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>

            {showResult && quiz.explanation && (
              <p className="quiz-feedback clamp-text" id="quizFeedbackText" data-clamp title={quiz.explanation}>
                {selectedAnswer === quiz.correct_index ? "✓ Correct! " : "✗ Incorrect. "}
                {quiz.explanation}
              </p>
            )}
          </div>

          <div className="card-footer-row" style={{ justifyContent: "flex-end" }}>
            <button
              className="btn btn-ghost"
              style={{ height: "28px", padding: "0 10px", fontSize: "12px" }}
              disabled={isCycling}
              onClick={() => q.next()}
            >
              {isCycling ? "Loading..." : "Next Question →"}
            </button>
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "180px", textAlign: "center", padding: "12px 8px" }}>
          <div style={{ fontSize: "24px", marginBottom: "6px" }}>📖</div>
          <h4 style={{ fontFamily: "var(--font-serif)", fontSize: "15px", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "4px" }}>
            Questions Unlock with Completed Chapters
          </h4>
          <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
            Complete your lessons and quizzes to practice questions here.
          </p>
        </div>
      )}
    </article>
  );
}
