import { useRef, useState } from "react";
import type { QuizQuestion } from "./types";

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
  durationSec: number;
  currentTimeSec: number;
  /** Pause the video when the quiz opens */
  onOpen: () => void;
  /** After "Skip Quiz" (chapter marked watched): continue to the next chapter */
  onSkipped: () => void;
  showToast: (msg: string) => void;
}

/** End-of-chapter quiz (one MCQ card at a time). Completing it marks the chapter Mastered. */
export function useChapterQuiz({ courseId, videoId, durationSec, currentTimeSec, onOpen, onSkipped, showToast }: ChapterQuizOptions) {
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
    setShow(false);
  };

  // No quiz questions available: complete the chapter without a quiz (spec Rule 2)
  const completeWithoutQuiz = () =>
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        videoId,
        positionSec: durationSec || currentTimeSec,
        durationSec: durationSec || currentTimeSec,
        watchedSecondsDelta: 1,
      }),
    }).catch(() => {});

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

  const trigger = async () => {
    if (triggeredRef.current && show) return;
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
    try {
      const userAnswers = Object.entries(answers).map(([qId, sIdx]) => ({
        questionId: qId,
        selectedIndex: sIdx,
        timeTakenSec: 10,
      }));
      const res = await fetch(`/api/courses/${courseId}/quiz/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, userAnswers, skipped: false }),
      });
      if (res.ok) {
        const data = await res.json();
        setScore(data.score);
        setSubmitted(true);
        showToast("Chapter Mastered! Performance saved.");
      }
    } catch {
      alert("Failed to submit quiz.");
    }
  };

  const skip = async () => {
    triggeredRef.current = true;
    waitTokenRef.current++;
    setGenerating(false);
    await fetch(`/api/courses/${courseId}/quiz/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, skipped: true }),
    });
    setShow(false);
    showToast("Chapter marked as Watched (Quiz Skipped)");
    onSkipped();
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
    /** Has the quiz already fired for this viewing? */
    hasTriggered: () => triggeredRef.current,
    /** Let the quiz fire again (the user rewound away from the end) */
    allowRetrigger: () => {
      triggeredRef.current = false;
    },
    reset,
    trigger,
    selectAnswer,
    submit,
    skip,
    continueWithoutQuiz,
  };
}

export type ChapterQuiz = ReturnType<typeof useChapterQuiz>;
