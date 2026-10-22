export interface Chapter {
  id: string;
  youtubeVideoId: string;
  position: number;
  title: string;
  durationSec: number;
  description: string;
  status: "not_started" | "completed" | "completed_without_quiz";
  lastPositionSec: number;
  watchedSeconds: number;
  completedAt: string | null;
  quizStatus: string;
  notes?: unknown; // TipTap JSON document
}

export interface Resource {
  id: string;
  videoId?: string;
  video_id?: string;
  url: string;
  label: string;
  domain: string;
  category: "github" | "drive" | "pdf" | "web" | "other" | string;
}

export interface CourseData {
  id: string;
  name: string;
  playlistTitle: string;
  youtubePlaylistId: string;
  thumbnailUrl?: string | null;
  quizzesEnabled: boolean;
  flashcardsEnabled: boolean;
  deadlineDate: string | null;
  totalChapters: number;
  completedChapters: number;
  progressPercent: number;
}

/** Response of GET /api/courses/[id] */
export interface CourseResponse {
  course: CourseData;
  chapters: Chapter[];
  resources: Resource[];
}

export interface ReviewQuestion {
  id: string;
  topic?: string;
  text: string;
  options: string[];
  correct_index: number;
  explanation?: string;
}

export interface ReviewFlashcard {
  id: string;
  topic?: string;
  front: string;
  back: string;
}

/** Response of GET /api/courses/[id]/review */
export interface ReviewResponse {
  questions?: ReviewQuestion[];
  flashcards?: ReviewFlashcard[];
}

export const COURSE_TABS = ["overview", "resources", "review", "notes", "settings"] as const;
export type CourseTab = (typeof COURSE_TABS)[number];

/** Progress breakdown shown in the hero and the chapter filter pills */
export interface ChapterStats {
  mastered: number;
  watched: number;
  remaining: number;
  masteredPct: number;
  watchedPct: number;
}

export const isChapterDone = (ch: Chapter) => ch.status === "completed" || ch.status === "completed_without_quiz";

/** "01", "02", … "10" */
export const padChapterNumber = (position: number) => (position < 10 ? `0${position}` : `${position}`);

/** 125 → "2:05" */
export const formatSeconds = (sec: number) => {
  const mins = Math.floor(sec / 60);
  const s = sec % 60;
  return `${mins}:${s < 10 ? "0" : ""}${s}`;
};
