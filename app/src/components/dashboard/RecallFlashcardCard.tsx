"use client";

import { useRef } from "react";
import { useHasTruncatedText } from "@/hooks/useHasTruncatedText";
import { flashcardBackLabel, flashcardEyebrow } from "./cardLabels";
import { DeckCardSkeleton } from "./DeckCardSkeleton";
import type { ReportItemType } from "./types";
import type { RecallFlashcardState } from "./useRecallFlashcard";

interface RecallFlashcardCardProps {
  flashcard: RecallFlashcardState;
  cardsLoaded: boolean;
  onReport: (type: ReportItemType, itemId: string) => void;
  onShowFullText: () => void;
  showToast: (msg: string) => void;
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

// Shared look of the card's empty states (deck reviewed / nothing unlocked yet)
const emptyFaceStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  minHeight: "220px",
  textAlign: "center",
  padding: "20px 14px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface-muted)",
};

/** Top deck card 3: 3D rotating active-recall flashcard from completed chapters. */
export function RecallFlashcardCard({ flashcard: f, cardsLoaded, onReport, onShowFullText, showToast }: RecallFlashcardCardProps) {
  const { card, isFlipped, seenIds, total, exhausted, isCycling } = f;
  const cardRef = useRef<HTMLElement>(null);
  const truncated = useHasTruncatedText(cardRef, [card?.id, cardsLoaded]);

  const fullTextButton = truncated && (
    <button
      className="report-btn-tag full-text-btn"
      type="button"
      title="View the full flashcard"
      onClick={(e) => {
        e.stopPropagation(); // don't flip the card
        onShowFullText();
      }}
    >
      ⤢ Full text
    </button>
  );

  return (
    <article
      className="deck-card"
      id="recallFlashcardCard"
      ref={cardRef}
      style={{ padding: 0, background: "transparent", border: "none", boxShadow: "none" }}
    >
      {!cardsLoaded ? (
        <DeckCardSkeleton label="Loading recall flashcard" boxed />
      ) : exhausted || (!card && total > 0) ? (
        <div className="flashcard-face flashcard-front" style={emptyFaceStyle}>
          <div style={{ fontSize: "28px", marginBottom: "6px" }}>🎯</div>
          <h4 style={{ fontFamily: "var(--font-serif)", fontSize: "16px", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "4px" }}>
            All Flashcards Reviewed!
          </h4>
          <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", lineHeight: 1.4, marginBottom: "12px", maxWidth: "260px" }}>
            You&apos;ve reviewed all {total} flashcards from your completed chapters without repetition.
          </p>
          <button
            className="btn btn-primary"
            type="button"
            style={{ height: "32px", fontSize: "12px", padding: "0 14px" }}
            onClick={() => f.next(true)}
          >
            Review Deck Again ⟳
          </button>
          <span style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "8px" }}>
            Complete more chapters to unlock new flashcards.
          </span>
        </div>
      ) : card ? (
        <div
          key={card.id}
          className="flashcard-perspective"
          id="flashcardContainer"
          tabIndex={0}
          role="button"
          aria-label="Flip flashcard"
          onClick={f.toggleFlip}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              f.toggleFlip();
            }
          }}
        >
          <div
            className="flashcard-inner"
            id="recallRotatingCard"
            style={{
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              transition: "transform 250ms ease-out",
            }}
          >
            {/* Front Face */}
            <div className="flashcard-face flashcard-front">
              <div className="deck-card-body">
                <div className="deck-card-header">
                  <span className="eyebrow-tag" title={flashcardEyebrow(card)}>
                    <svg className="icon" viewBox="0 0 24 24">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    <span className="eyebrow-text">{flashcardEyebrow(card)}</span>
                  </span>
                  <div className="deck-card-header-actions">
                    {fullTextButton}
                    {total > 0 && (
                      <span style={countPillStyle} title="Drawn strictly from completed chapters across your enrolled courses">
                        {seenIds.length} of {total}
                      </span>
                    )}
                    <button
                      className="report-btn-tag"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // Event isolation rule (Section 2.4)
                        onReport("Flashcard", card.id);
                      }}
                    >
                      ⚑ Report
                    </button>
                  </div>
                </div>
                <h3 className="flashcard-prompt-title clamp-text" data-clamp title={card.front}>
                  {card.front}
                </h3>
                <p className="flashcard-prompt-sub clamp-text">
                  Explain the concept in your own words before revealing the answer.
                </p>
              </div>

              <div className="flashcard-hint">
                <svg className="icon" viewBox="0 0 24 24">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                </svg>
                Click card to rotate & reveal answer
              </div>
            </div>

            {/* Back Face (Rotated 180deg) */}
            <div className="flashcard-face flashcard-back">
              <div className="deck-card-body">
                <div className="deck-card-header" style={{ marginBottom: "6px" }}>
                  <span
                    className="eyebrow-text"
                    title={flashcardBackLabel(card)}
                    style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-success)", textTransform: "uppercase" }}
                  >
                    {flashcardBackLabel(card)}
                  </span>
                  <div className="deck-card-header-actions">
                    {fullTextButton}
                    <button
                      className="report-btn-tag"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // Event isolation rule
                        onReport("Flashcard", card.id);
                      }}
                    >
                      ⚑ Report
                    </button>
                  </div>
                </div>
                <p className="flashcard-explanation clamp-text" data-clamp title={card.back} style={{ marginTop: "8px" }}>
                  {card.back}
                </p>
              </div>

              <div>
                <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                  <button
                    className="btn btn-primary"
                    type="button"
                    style={{ flex: 1, height: "32px", fontSize: "12px" }}
                    disabled={isCycling}
                    onClick={(e) => {
                      e.stopPropagation();
                      showToast("Marked as reviewed ✓");
                      f.next();
                    }}
                  >
                    Got it ✓
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    style={{ flex: 1, height: "32px", fontSize: "12px", background: "var(--color-surface-muted)" }}
                    disabled={isCycling}
                    onClick={(e) => {
                      e.stopPropagation();
                      f.reviewLater(card.id);
                      f.next();
                    }}
                  >
                    Review Later ⟳
                  </button>
                </div>
                <div style={{ textAlign: "center", fontSize: "11px", color: "var(--color-text-secondary)" }}>
                  Click card again to flip back
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flashcard-face flashcard-front" style={emptyFaceStyle}>
          <div style={{ fontSize: "24px", marginBottom: "6px" }}>🔄</div>
          <h4 style={{ fontFamily: "var(--font-serif)", fontSize: "15px", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "4px" }}>
            Flashcards Unlock with Completed Chapters
          </h4>
          <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
            Complete chapters in your courses to review active recall flashcards here.
          </p>
        </div>
      )}
    </article>
  );
}
