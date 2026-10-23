/** Questions asked per end-of-chapter quiz; a video has far more, rotated across attempts */
export const CHAPTER_QUIZ_SIZE = 5;

/**
 * Picks the questions for one chapter-quiz attempt so repeat attempts don't repeat questions:
 * ones the learner has never answered first (in random order), then the ones answered longest
 * ago. `lastAnsweredAt` maps question id → the learner's latest chapter-quiz answer (ISO time).
 * The picked questions come back in video order (by `timestamp_sec`).
 */
export function pickQuizQuestions<Q extends { id: string; timestamp_sec?: number | null }>(
  questions: Q[],
  lastAnsweredAt: Map<string, string>,
  count = CHAPTER_QUIZ_SIZE,
  random: () => number = Math.random
): Q[] {
  const keyed = questions.map((q) => ({ q, last: lastAnsweredAt.get(q.id) ?? "", tiebreak: random() }));
  keyed.sort((a, b) => (a.last < b.last ? -1 : a.last > b.last ? 1 : a.tiebreak - b.tiebreak));
  return keyed
    .slice(0, count)
    .map((k) => k.q)
    .sort((a, b) => (a.timestamp_sec ?? 0) - (b.timestamp_sec ?? 0));
}
