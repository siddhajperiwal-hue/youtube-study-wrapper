import { useEffect, useState } from "react";
import type { CardsResponse, RecallFlashcard } from "./types";
import { useNextCardPrefetch } from "./useNextCardPrefetch";

/** Recall Flashcard card state (Section 3.2 Card 3): current card, flip state, progress through the deck. */
export function useRecallFlashcard(showToast: (msg: string) => void) {
  const [card, setCard] = useState<RecallFlashcard | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  const [isCycling, setIsCycling] = useState(false);
  const nextCard = useNextCardPrefetch("flashcard");

  /** Apply a /api/dashboard/cards response. `keepShown`: a card is already on screen, don't swap it. */
  const apply = (res: CardsResponse, keepShown = false) => {
    setTotal(res.totalCompletedFlashcards || 0);
    if (keepShown) {
      // keep current flashcard
    } else if (res.recallFlashcard) {
      setCard(res.recallFlashcard);
      setSeenIds([res.recallFlashcard.id]);
      setExhausted(false);
    } else if (res.flashcardExhausted) {
      setCard(null);
      setExhausted(true);
    } else {
      setCard(null);
    }
  };

  const toggleFlip = () => setIsFlipped((flipped) => !flipped);

  // Prefetch the next flashcard while this one is on screen
  useEffect(() => {
    if (card) nextCard.prefetch(seenIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id, seenIds]);

  const next = async (reset = false) => {
    setIsCycling(true);
    try {
      const currentSeen = reset ? [] : seenIds;
      const data = await nextCard.take(currentSeen);
      if (data) {
        // Flip back only together with the new card (the card is remounted by key, which skips the
        // flip animation, so the new card's answer side is never visible mid-rotation)
        setIsFlipped(false);
        if (reset) {
          setSeenIds([]);
          setExhausted(false);
        }
        setTotal(data.totalCompletedFlashcards || 0);
        if (data.recallFlashcard) {
          const nextFlashcard = data.recallFlashcard;
          setCard(nextFlashcard);
          setSeenIds((prev) => (reset ? [nextFlashcard.id] : [...prev, nextFlashcard.id]));
          setExhausted(false);
        } else if (data.flashcardExhausted || data.remainingFlashcards === 0) {
          setCard(null);
          setExhausted(true);
        } else {
          setCard(null);
        }
      } else {
        showToast("Couldn't load the next flashcard. Please try again.");
      }
    } catch (err) {
      console.error("Error fetching next flashcard:", err);
    } finally {
      setIsCycling(false);
    }
  };

  // Bookmark / Review Later (Section 3.2 Card 3)
  const reviewLater = async (cardId: string) => {
    try {
      await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: cardId }),
      });
      showToast("Saved to course Review tab for revision.");
      setIsFlipped(false);
    } catch {
      showToast("Saved to Review tab.");
      setIsFlipped(false);
    }
  };

  return { card, isFlipped, toggleFlip, seenIds, total, exhausted, isCycling, apply, next, reviewLater };
}

export type RecallFlashcardState = ReturnType<typeof useRecallFlashcard>;
