export interface ChapterSummary {
  id: string;
  position: number;
  title: string;
  durationSec: number;
  description: string;
  status: string;
  notes?: unknown; // TipTap JSON document
}

export interface ChapterDetail {
  id: string;
  youtubeVideoId: string;
  position: number;
  totalChapters: number;
  title: string;
  durationSec: number;
  description: string;
  status: string;
  lastPositionSec: number;
  watchedSeconds: number;
  quizReady: boolean;
  summary: string | null;
  topics: string[];
}

export interface LearningCourse {
  id: string;
  name: string;
  quizzesEnabled: boolean;
}

/** Previous / next chapter (as returned by the chapter API) */
export interface NavChapter {
  id: string;
  position: number;
  title: string;
}

export interface ChapterNavigation {
  prev: NavChapter | null;
  next: NavChapter | null;
}

export interface ChapterResource {
  id: string;
  url: string;
  label: string;
  domain: string;
  category: string;
}

export interface QuizQuestion {
  id: string;
  topic?: string;
  text: string;
  options: string[];
  correct_index?: number;
  explanation?: string;
}

/** Response of GET /api/courses/[id]/chapters/[videoId] */
export interface ChapterResponse {
  course: LearningCourse;
  chapter: ChapterDetail;
  chaptersList: ChapterSummary[];
  navigation: ChapterNavigation;
  resources: ChapterResource[];
  notes?: { content: unknown; version: number };
  recall?: { eligible: boolean; timeAwayText?: string; questions: QuizQuestion[] };
}

/** A timestamp clicked in another chapter's notes, awaiting "switch chapter?" confirmation */
export interface GuardedTarget {
  chapterId: string;
  position: number;
  seconds: number;
}

/** Player clock: 125 → "02:05" */
export function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

/** "01", "02", … "10" */
export const padChapterNumber = (position: number) => (position < 10 ? `0${position}` : `${position}`);
