import { useEffect, useState } from "react";
import type { CardsResponse, QuickQuiz } from "./types";
import { useNextCardPrefetch } from "./useNextCardPrefetch";

/** Quick Quiz card state (Section 3.2 Card 2): current question, answer, progress through the deck. */
export function useQuickQuiz(showToast: (msg: string) => void) {
  const [quiz, setQuiz] = useState<QuickQuiz | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  const [stats, setStats] = useState({ correct: 0, totalAnswered: 0 });
  const [isCycling, setIsCycling] = useState(false);
  const nextCard = useNextCardPrefetch("quiz");

  /** Apply a /api/dashboard/cards response. `keepShown`: a card is already on screen, don't swap it. */
  const apply = (res: CardsResponse, keepShown = false) => {
    setTotal(res.totalCompletedQuestions || 0);
    if (keepShown) {
      // keep current quiz card
    } else if (res.quickQuiz) {
      setQuiz(res.quickQuiz);
      setSeenIds([res.quickQuiz.id]);
      setExhausted(false);
    } else if (res.quickQuizExhausted) {
      setQuiz(null);
      setExhausted(true);
    } else {
      setQuiz(null);
    }
  };

  const answer = (idx: number) => {
    if (showResult || !quiz) return;
    setSelectedAnswer(idx);
    setShowResult(true);
    setStats((prev) => ({
      totalAnswered: prev.totalAnswered + 1,
      correct: idx === quiz.correct_index ? prev.correct + 1 : prev.correct,
    }));
  };

  // Prefetch the next question while this one is on screen
  useEffect(() => {
    if (quiz) nextCard.prefetch(seenIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz?.id, seenIds]);

  const next = async (reset = false) => {
    setIsCycling(true);
    try {
      const currentSeen = reset ? [] : seenIds;
      const data = await nextCard.take(currentSeen);
      if (data) {
        // Clear the previous answer in the same render that swaps in the new question,
        // so the old question is never shown again without its result
        setSelectedAnswer(null);
        setShowResult(false);
        if (reset) {
          setSeenIds([]);
          setExhausted(false);
          setStats({ correct: 0, totalAnswered: 0 });
        }
        setTotal(data.totalCompletedQuestions || 0);
        if (data.quickQuiz) {
          const nextQuiz = data.quickQuiz;
          setQuiz(nextQuiz);
          setSeenIds((prev) => (reset ? [nextQuiz.id] : [...prev, nextQuiz.id]));
          setExhausted(false);
        } else if (data.quickQuizExhausted || data.remainingQuestions === 0) {
          setQuiz(null);
          setExhausted(true);
        } else {
          setQuiz(null);
        }
      } else {
        showToast("Couldn't load the next question. Please try again.");
      }
    } catch (err) {
      console.error("Error fetching next quiz question:", err);
    } finally {
      setIsCycling(false);
    }
  };

  return { quiz, selectedAnswer, showResult, seenIds, total, exhausted, stats, isCycling, apply, answer, next };
}

export type QuickQuizState = ReturnType<typeof useQuickQuiz>;
