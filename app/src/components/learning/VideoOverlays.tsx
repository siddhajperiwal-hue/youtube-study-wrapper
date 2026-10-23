"use client";

import { useState, type CSSProperties } from "react";
import type { ChapterQuiz } from "./useChapterQuiz";
import { formatClock, padChapterNumber, type NavChapter, type QuizQuestion } from "./types";

/** Inline `--clamp-lines` for `.clamp-text` */
const clampLines = (lines: number) => ({ "--clamp-lines": lines }) as CSSProperties;

/**
 * Click layer over the video whenever no other overlay is open: shows a big play button while
 * paused and is invisible while playing. It always covers the iframe because a click that reaches
 * YouTube's player pauses it there and YouTube draws its own paused screen (play button, title,
 * "More videos") under ours; clicks here go through the IFrame API instead, which draws nothing.
 */
export function PlayOverlay({ paused, onToggle }: { paused: boolean; onToggle: () => void }) {
  return (
    <div
      className="video-click-play-overlay"
      onClick={onToggle}
      title={paused ? "Click to play video (Space / K)" : "Click to pause video (Space / K)"}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "calc(100% - 50px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 20,
        background: paused ? "rgba(0, 0, 0, 0.15)" : "transparent",
      }}
    >
      {paused && (
        <div
          style={{
            width: "68px",
            height: "68px",
            borderRadius: "50%",
            backgroundColor: "rgba(18, 17, 16, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            border: "1.5px solid rgba(255,255,255,0.2)",
            transition: "transform 0.15s ease",
          }}
        >
          <svg className="icon" style={{ width: "28px", height: "28px", fill: "#FFFFFF", stroke: "none" }} viewBox="0 0 24 24">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </div>
      )}
    </div>
  );
}

interface RecallOverlayProps {
  visible: boolean;
  questions: QuizQuestion[];
  timeAwayText: string;
  onReport: (questionId: string) => void;
  /** Dismiss the refresher and start the video */
  onContinue: () => void;
}

/** Overlay 1: "Welcome back" active-recall question after >= 24h away. */
export function RecallOverlay({ visible, questions, timeAwayText, onReport, onContinue }: RecallOverlayProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const question = questions[0];

  return (
    <div className={`video-overlay-scrim ${visible && questions.length > 0 ? "active" : ""}`} id="overlayResumeRecall">
      {question && (
        <div className="overlay-card overlay-card-fixed">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
            <span className="overlay-eyebrow" style={{ marginBottom: 0 }}>
              <svg className="icon" viewBox="0 0 24 24">
                <path d="M12 2c0 4-4 6-4 10a6 6 0 0 0 12 0c0-6-6-8-6-10Z"></path>
              </svg>
              Welcome Back • Quick Recall Refresher
            </span>
            <button className="report-btn-tag" type="button" onClick={() => onReport(question.id)}>
              ⚑ Report
            </button>
          </div>

          <h2 className="overlay-title overlay-recall-title clamp-text" style={clampLines(2)}>It&apos;s been {timeAwayText} since your last session. Can you recall:</h2>
          <div className="overlay-scroll-body">
          <p
            className="overlay-body overlay-question clamp-text"
            title={question.text}
            style={{ fontWeight: 600, color: "var(--color-text-primary)" }}
          >
            {question.text}
          </p>

          <div className="overlay-options-list" id="recallOptionsList">
            {question.options.map((opt, idx) => {
              const isCorrect = idx === question.correct_index;
              const isSelected = selectedIdx === idx;
              let stateClass = "";
              if (showResult) {
                if (isCorrect) stateClass = "correct";
                else if (isSelected) stateClass = "incorrect";
              } else if (isSelected) {
                stateClass = "selected";
              }

              return (
                <button
                  key={idx}
                  className={`overlay-opt-btn ${stateClass}`}
                  onClick={() => {
                    if (!showResult) {
                      setSelectedIdx(idx);
                      setShowResult(true);
                    }
                  }}
                >
                  <span className="clamp-text" title={opt}>{opt}</span>
                  <span className="check-slot">{showResult ? (isCorrect ? "✓" : isSelected ? "✕" : "") : ""}</span>
                </button>
              );
            })}
          </div>

          <div>
            {showResult && (
              <div
                className="overlay-explanation"
                id="recallExplanation"
                title={question.explanation || undefined}
                style={{ display: "block" }}
              >
                <div className="clamp-text" style={clampLines(3)}>
                  {question.explanation || "Active recall reinforces neural pathways for long-term retention."}
                </div>
              </div>
            )}
          </div>
          </div>

          <div className="overlay-actions-row">
            <button className="btn-ch-nav" id="btnDismissRecall" style={{ color: "var(--color-text-secondary)", border: "none" }} onClick={onContinue}>
              Skip to Video ↗
            </button>
            {showResult && (
              <button className="btn-ch-nav primary" id="btnResumeVideoFromRecall" onClick={onContinue}>
                Start Video Playback →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface QuizOverlayProps {
  quiz: ChapterQuiz;
  chapterPosition: number;
  nextChapter: NavChapter | null;
  onReport: (questionId: string | null) => void;
  onNextChapterHover: (chapterId: string) => void;
  onGoToChapter: (chapterId: string) => void;
  /** Jump the video to where a question's topic was taught */
  onRewatch: (seconds: number) => void;
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E"];

/** Overlay 2: end-of-chapter quiz, one MCQ card at a time. */
export function QuizOverlay({ quiz, chapterPosition, nextChapter, onReport, onNextChapterHover, onGoToChapter, onRewatch }: QuizOverlayProps) {
  const { show, questions, currentIdx, answers, submitted, score } = quiz;
  const currentQ = questions[currentIdx];
  const selectedIdx = currentQ ? answers[currentQ.id] : undefined;
  const disabledStyle = (disabled: boolean) => ({
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  });

  return (
    <div className={`video-overlay-scrim ${show ? "active" : ""}`} id="overlayChapterQuiz">
      <div className="overlay-card overlay-card-fixed" style={{ maxWidth: "560px", width: "100%", borderRadius: "12px" }}>
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <span className="overlay-eyebrow" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg className="icon" viewBox="0 0 24 24" style={{ width: "15px", height: "15px" }}>
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 14 14"></polyline>
            </svg>
            Chapter {padChapterNumber(chapterPosition)} Complete • Knowledge Check
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button className="report-btn-tag" type="button" onClick={() => onReport(currentQ?.id || null)}>
              ⚑ Report
            </button>
          </div>
        </div>

        {!submitted && questions.length > 0 ? (
          <div className="overlay-fill">
            {/* Stepper Header & Progress Segments */}
            <div className="overlay-quiz-stepper" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-primary)", letterSpacing: "0.5px" }}>
                QUESTION {currentIdx + 1} OF {questions.length}
              </span>
              {currentQ?.topic && (
                <span style={{ fontSize: "11px", color: "var(--color-text-secondary)", background: "var(--color-surface-muted)", padding: "2px 8px", borderRadius: "10px", fontWeight: 500 }}>
                  {currentQ.topic}
                </span>
              )}
            </div>

            <div className="overlay-quiz-segments" style={{ display: "flex", gap: "5px" }}>
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined;
                const isCurrent = idx === currentIdx;
                const answeredColor =
                  q.correct_index === undefined || answers[q.id] === q.correct_index ? "var(--color-success)" : "var(--color-error)";
                return (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      height: "4px",
                      borderRadius: "2px",
                      backgroundColor: isCurrent ? "var(--color-primary)" : isAnswered ? answeredColor : "var(--color-border)",
                      transition: "background-color 0.2s ease",
                    }}
                  />
                );
              })}
            </div>

            {/* Single MCQ Question Card */}
            {currentQ && (
              <div key={currentQ.id || currentIdx} className="overlay-fill">
                <div className="overlay-scroll-body">
                <h2 className="overlay-title overlay-question clamp-text" title={currentQ.text} style={{ fontWeight: 600, lineHeight: 1.4, color: "var(--color-text-primary)" }}>
                  {currentQ.text}
                </h2>

                <div className="overlay-options-list" style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                  {currentQ.options.map((opt, optIdx) => {
                    const isSelected = selectedIdx === optIdx;
                    const isAnswered = selectedIdx !== undefined;
                    const hasKey = currentQ.correct_index !== undefined;
                    // After answering: the correct option turns green, a wrong pick red
                    const state = isAnswered && hasKey
                      ? optIdx === currentQ.correct_index ? "correct" : isSelected ? "incorrect" : "dimmed"
                      : isSelected ? "selected" : "idle";
                    const accent =
                      state === "correct" ? "var(--color-success)"
                      : state === "incorrect" ? "var(--color-error)"
                      : state === "selected" ? "var(--color-primary)"
                      : "var(--color-border)";
                    const highlighted = state === "correct" || state === "incorrect" || state === "selected";
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={isAnswered}
                        className={`overlay-opt-btn ${state === "idle" || state === "dimmed" ? "" : state}`}
                        style={{
                          borderColor: accent,
                          backgroundColor:
                            state === "correct" ? "var(--color-success-bg)"
                            : state === "incorrect" ? "var(--color-error-bg)"
                            : state === "selected" ? "var(--color-surface-muted)"
                            : "var(--color-surface)",
                          boxShadow: highlighted ? `0 0 0 1px ${accent}` : "none",
                          opacity: state === "dimmed" ? 0.6 : 1,
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          textAlign: "left",
                          cursor: isAnswered ? "default" : "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onClick={() => quiz.selectAnswer(currentQ.id, optIdx)}
                      >
                        <span
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            border: `1.5px solid ${accent}`,
                            backgroundColor: highlighted ? accent : "transparent",
                            color: highlighted ? "#ffffff" : "var(--color-text-secondary)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {OPTION_LETTERS[optIdx] || optIdx + 1}
                        </span>
                        <span className="clamp-text" title={opt} style={{ ...clampLines(2), flex: 1, fontSize: "14px", lineHeight: 1.35 }}>
                          {opt}
                        </span>
                        <span className="check-slot" style={{ fontWeight: 700, color: accent, minWidth: "16px", textAlign: "right" }}>
                          {state === "correct" ? "✓" : state === "incorrect" ? "✗" : isSelected ? "●" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ marginBottom: "12px" }}>
                  {selectedIdx !== undefined && currentQ.correct_index !== undefined && (
                    <div
                      className="overlay-explanation"
                      title={currentQ.explanation || undefined}
                      style={{
                        display: "block",
                        borderLeftColor: selectedIdx === currentQ.correct_index ? "var(--color-success)" : "var(--color-error)",
                      }}
                    >
                      <div className="clamp-text" style={clampLines(2)} title={currentQ.options[currentQ.correct_index]}>
                        <strong style={{ color: selectedIdx === currentQ.correct_index ? "var(--color-success)" : "var(--color-error)" }}>
                          {selectedIdx === currentQ.correct_index ? "✓ Correct!" : "✗ Incorrect."}
                        </strong>
                        {selectedIdx !== currentQ.correct_index && currentQ.options[currentQ.correct_index] && (
                          <> The answer is {OPTION_LETTERS[currentQ.correct_index] || currentQ.correct_index + 1}: {currentQ.options[currentQ.correct_index]}.</>
                        )}
                      </div>
                      {currentQ.explanation && (
                        <div className="clamp-text" style={{ ...clampLines(3), marginTop: "6px", lineHeight: 1.45 }}>
                          {currentQ.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                </div>

                {/* Action Row */}
                <div className="overlay-actions-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid var(--color-border-subtle)" }}>
                  <button
                    type="button"
                    className="btn-ch-nav"
                    id="btnSkipChapterQuiz"
                    style={{ color: "var(--color-text-secondary)", border: "none", padding: "6px 0", background: "transparent", cursor: "pointer", fontSize: "13px" }}
                    onClick={quiz.skip}
                  >
                    Skip Quiz
                  </button>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {/* In the action row (always visible), not under the explanation, which can scroll out of view */}
                    {selectedIdx !== undefined && !!currentQ.timestamp_sec && currentQ.timestamp_sec > 0 && (
                      <button
                        type="button"
                        className="overlay-taught-at"
                        title={`Taught at ${formatClock(currentQ.timestamp_sec)}: close the quiz for now and replay this part of the video`}
                        onClick={() => onRewatch(currentQ.timestamp_sec!)}
                      >
                        ▶ Rewatch {formatClock(currentQ.timestamp_sec)}
                      </button>
                    )}
                    {currentIdx > 0 && (
                      <button
                        type="button"
                        className="btn-ch-nav"
                        onClick={() => quiz.setCurrentIdx((prev) => Math.max(0, prev - 1))}
                        style={{ padding: "8px 14px", fontSize: "13px" }}
                      >
                        ← Back
                      </button>
                    )}

                    {currentIdx < questions.length - 1 ? (
                      <button
                        type="button"
                        className="btn-ch-nav primary"
                        disabled={selectedIdx === undefined}
                        style={{ ...disabledStyle(selectedIdx === undefined), padding: "8px 16px", fontSize: "13px", fontWeight: 600 }}
                        onClick={() => quiz.setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                      >
                        Next Question →
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-ch-nav primary"
                        id="btnSubmitChapterQuiz"
                        disabled={selectedIdx === undefined}
                        style={{ ...disabledStyle(selectedIdx === undefined), padding: "8px 18px", fontSize: "13px", fontWeight: 600 }}
                        onClick={quiz.submit}
                      >
                        Submit Quiz ✓
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : submitted ? (
          <div className="overlay-scroll-body" style={{ textAlign: "center", padding: "20px 0" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                backgroundColor: "var(--color-success-bg, rgba(46, 125, 79, 0.12))",
                color: "var(--color-success)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                margin: "0 auto 12px",
              }}
            >
              ✓
            </div>
            <h2 className="overlay-title" style={{ color: "var(--color-success)", marginBottom: "8px" }}>
              Chapter Mastered!
            </h2>
            <p className="overlay-body" style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "4px" }}>
              Score: {score ?? questions.filter((q) => answers[q.id] === q.correct_index).length} / {questions.length} Correct
            </p>
            <p className="overlay-body" style={{ fontSize: "13px", marginBottom: "20px" }}>
              Your performance has been permanently saved to your learning progress.
            </p>
            <div className="overlay-actions-row" style={{ justifyContent: "center", borderTop: "none" }}>
              {nextChapter ? (
                <button
                  type="button"
                  className="btn-ch-nav primary"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", padding: "10px 22px", fontWeight: 600, cursor: "pointer" }}
                  onMouseEnter={() => onNextChapterHover(nextChapter.id)}
                  onClick={() => onGoToChapter(nextChapter.id)}
                >
                  Next Chapter →
                </button>
              ) : (
                <button type="button" className="btn-ch-nav primary" onClick={() => quiz.setShow(false)} style={{ padding: "10px 22px", fontWeight: 600 }}>
                  Complete Course ✓
                </button>
              )}
            </div>
          </div>
        ) : quiz.generating ? (
          <div className="overlay-scroll-body" style={{ textAlign: "center", padding: "24px 0" }}>
            <div className="quiz-generating-spinner" aria-hidden="true" />
            <h2 className="overlay-title" style={{ fontSize: "17px", marginBottom: "6px" }}>
              Generating your quiz…
            </h2>
            <p className="overlay-body" style={{ fontSize: "13px", marginBottom: "18px" }}>
              The questions for this chapter are still being made. This usually takes under a minute.
            </p>
            <button
              type="button"
              className="btn-ch-nav"
              style={{ color: "var(--color-text-secondary)", border: "none", background: "transparent", cursor: "pointer", fontSize: "13px" }}
              onClick={quiz.skip}
            >
              Skip Quiz
            </button>
          </div>
        ) : (
          <div className="overlay-scroll-body" style={{ textAlign: "center", padding: "24px 0" }}>
            <p className="overlay-body">
              {quiz.unavailable
                ? "We couldn't generate a quiz for this chapter right now."
                : "No quiz questions available for this chapter."}
            </p>
            <button
              type="button"
              className="btn-ch-nav primary"
              style={{ marginTop: "14px" }}
              onClick={quiz.unavailable ? quiz.continueWithoutQuiz : () => quiz.setShow(false)}
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface BreakOverlayProps {
  visible: boolean;
  breakMinutes: number;
  remainingSec: number;
  onResume: () => void;
}

/** Overlay 3: scientific rest break (resuming auto-rewinds 5s). */
export function BreakOverlay({ visible, breakMinutes, remainingSec, onResume }: BreakOverlayProps) {
  return (
    <div className={`video-overlay-scrim ${visible ? "active" : ""}`} id="overlayScientificBreak">
      <div className="overlay-card" style={{ textAlign: "center", alignItems: "center" }}>
        <span className="overlay-eyebrow">
          <svg className="icon" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M16 12l-4-4-4 4M12 16V9"></path>
          </svg>
          <span>Scientific Focus Rest • {breakMinutes} Minutes</span>
        </span>
        <h2 className="overlay-title" style={{ marginTop: "4px" }}>
          Rest your eyes and step away from your desk
        </h2>
        <div className="break-timer-display" id="breakTimerCountdown">
          {formatClock(remainingSec)}
        </div>
        <p className="overlay-body" style={{ textAlign: "center" }}>
          Continuous cramming reduces synaptic consolidation. Stretch, grab water, or look out a window.
        </p>
        <div style={{ marginTop: "14px", width: "100%" }}>
          <button className="btn-ch-nav primary" id="btnResumeFromBreak" style={{ width: "100%", justifyContent: "center", height: "42px" }} onClick={onResume}>
            <span>Resume Video (Auto-Rewinds 5s) →</span>
          </button>
        </div>
      </div>
    </div>
  );
}
