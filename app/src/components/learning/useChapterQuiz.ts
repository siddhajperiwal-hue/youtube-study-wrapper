import { useRef, useState } from "react";
import type { QuizQuestion } from "./types";
import { invalidateCache } from "@/lib/cache";

/** How often to re-check while the chapter's quiz is still being generated */
const GENERATION_POLL_MS = 4_000;
/** Give up waiting after this long (a Gemini run normally takes well under a minute) */
const GENERATION_WAIT_MS = 3 * 60_000;
/** Ignore "unavailable" this early: the retry started by the first request may not have claimed the video yet */
const GENERATION_GRACE_MS = 15_000;

interface QuizResponse {
  questions?: QuizQuestion[];
  contentStatus?: "ready" | "generating" | "unavailable";
}

interface ChapterQuizOptions {
  courseId: string;
  videoId: string;
  /** Pause the video when the quiz opens */
  onOpen: () => void;
  /** After "Skip Quiz" (chapter marked watched): continue to the next chapter */
  onSkipped: () => void;
  showToast: (msg: string) => void;
}

/** End-of-chapter quiz (one MCQ card at a time). Completing it marks the chapter Mastered. */
export function useChapterQuiz({ courseId, videoId, onOpen, onSkipped, showToast }: ChapterQuizOptions) {
  const [show, setShow] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  /** The questions don't exist yet and are being generated: the overlay shows a waiting state */
  const [generating, setGenerating] = useState(false);
  /** Generation failed or timed out: the overlay offers to continue without a quiz */
  const [unavailable, setUnavailable] = useState(false);
  /** Quiz set aside to rewatch where a question's topic was taught; answers are kept */
  const [rewatching, setRewatching] = useState(false);
  // Set once the quiz has fired for this viewing, so it doesn't re-trigger on every time update
  const triggeredRef = useRef(false);
  // Bumped to cancel a running wait for generated questions (chapter change, skip, close)
  const waitTokenRef = useRef(0);

  const openWithQuestions = (qs: QuizQuestion[]) => {
    setQuestions(qs);
    setCurrentIdx(0);
    setAnswers({});
    setSubmitted(false);
    setScore(null);
    setGenerating(false);
    setUnavailable(false);
    setRewatching(false);
    setShow(true);
  };

  /** New chapter: clear everything */
  const reset = () => {
    triggeredRef.current = false;
    waitTokenRef.current++;
    setCurrentIdx(0);
    setAnswers({});
    setSubmitted(false);
    setScore(null);
    setGenerating(false);
    setUnavailable(false);
    setRewatching(false);
    setShow(false);
  };

  // No quiz questions available: complete the chapter without a quiz (spec Rule 2)
  /**
   * Marks the chapter done via the quiz route: `skipped` → Watched (Quiz Skipped), `noQuiz` →
   * Watched (no questions exist), otherwise graded. Then drops cached course/dashboard data so the
   * course page's Mastered / Watched counts are fresh. Returns the response, or null if offline.
   */
  const finishChapter = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/courses/${courseId}/quiz/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, ...body }),
    }).catch(() => null);
    invalidateCache("/api/courses");
    invalidateCache("/api/dashboard");
    return res;
  };

  const completeWithoutQuiz = () => finishChapter({ noQuiz: true });

  /** Poll until the chapter's questions have been generated, then show the quiz */
  const waitForQuestions = async (token: number) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < GENERATION_WAIT_MS) {
      await new Promise((resolve) => setTimeout(resolve, GENERATION_POLL_MS));
      if (waitTokenRef.current !== token) return;
      try {
        const res = await fetch(`/api/courses/${courseId}/quiz?videoId=${videoId}&poll=1`);
        if (waitTokenRef.current !== token) return;
        if (!res.ok) continue;
        const data: QuizResponse = await res.json();
        if (data.questions && data.questions.length > 0) {
          openWithQuestions(data.questions);
          return;
        }
        if (data.contentStatus === "unavailable" && Date.now() - startedAt > GENERATION_GRACE_MS) break;
      } catch {
        // Network blip: keep waiting
      }
    }
    if (waitTokenRef.current !== token) return;
    setGenerating(false);
    setUnavailable(true);
  };

  /** Hide the quiz (keeping progress) while the learner rewatches part of the video */
  const rewatch = () => {
    setShow(false);
    setRewatching(true);
  };

  /** Back to the quiz after rewatching, at the same question with the same answers */
  const resume = () => {
    triggeredRef.current = true;
    setRewatching(false);
    onOpen();
    setShow(true);
  };

  const trigger = async () => {
    if (triggeredRef.current && show) return;
    if (rewatching && questions.length > 0 && !submitted) {
      resume();
      return;
    }
    triggeredRef.current = true;
    try {
      const res = await fetch(`/api/courses/${courseId}/quiz?videoId=${videoId}`);
      if (res.ok) {
        const data: QuizResponse = await res.json();
        if (data.questions && data.questions.length > 0) {
          onOpen();
          openWithQuestions(data.questions);
          return;
        }
        if (data.contentStatus === "generating") {
          // The quiz is still being made: wait for it instead of skipping it
          onOpen();
          setQuestions([]);
          setUnavailable(false);
          setGenerating(true);
          setShow(true);
          waitForQuestions(++waitTokenRef.current);
          return;
        }
      }
      await completeWithoutQuiz();
    } catch (err) {
      console.error("Error triggering quiz:", err);
    }
  };

  /** "Continue" after generation failed: finish the chapter without a quiz */
  const continueWithoutQuiz = async () => {
    setShow(false);
    setUnavailable(false);
    await completeWithoutQuiz();
    showToast("Chapter completed (no quiz available)");
    onSkipped();
  };

  // First pick is final: the overlay reveals right/wrong and the explanation immediately
  const selectAnswer = (questionId: string, optionIdx: number) =>
    setAnswers((prev) => (prev[questionId] !== undefined ? prev : { ...prev, [questionId]: optionIdx }));

  const submit = async () => {
    triggeredRef.current = true;
    const userAnswers = Object.entries(answers).map(([qId, sIdx]) => ({
      questionId: qId,
      selectedIndex: sIdx,
      timeTakenSec: 10,
    }));
    const res = await finishChapter({ userAnswers, skipped: false });
    if (res?.ok) {
      const data = await res.json();
      setScore(data.score);
      setSubmitted(true);
      showToast("Chapter Mastered! Performance saved.");
    } else {
      showToast("Couldn't save your quiz. Please try again.");
    }
  };

  const skip = async () => {
    triggeredRef.current = true;
    waitTokenRef.current++;
    setGenerating(false);
    const res = await finishChapter({ skipped: true });
    setShow(false);
    showToast(res?.ok ? "Chapter marked as Watched (Quiz Skipped)" : "Couldn't save that the quiz was skipped. Please try again.");
    if (res?.ok) onSkipped();
  };

  return {
    show,
    setShow,
    questions,
    currentIdx,
    setCurrentIdx,
    answers,
    submitted,
    score,
    generating,
    unavailable,
    rewatching,
    /** Has the quiz already fired for this viewing? */
    hasTriggered: () => triggeredRef.current,
    /** Let the quiz fire again (the user rewound away from the end) */
    allowRetrigger: () => {
      triggeredRef.current = false;
    },
    reset,
    trigger,
    rewatch,
    resume,
    selectAnswer,
    submit,
    skip,
    continueWithoutQuiz,
  };
}

export type ChapterQuiz = ReturnType<typeof useChapterQuiz>;
