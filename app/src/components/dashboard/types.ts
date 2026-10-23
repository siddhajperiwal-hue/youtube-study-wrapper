export interface Course {
  id: string;
  name: string;
  playlistId: string;
  thumbnailUrl?: string | null;
  quizzesEnabled: boolean;
  flashcardsEnabled: boolean;
  deadlineDate: string | null;
  daysRemaining: number | null;
  priorityScore: number;
  lastAccessedAt: string;
  totalChapters: number;
  completedChapters: number;
  progressPercent: number;
  totalDurationMinutes: number;
  remainingMinutes: number;
  /** Chapter (videos.id) the Resume buttons open: first not-started chapter, else chapter 1 */
  resumeChapterId: string | null;
}

export interface QuickQuiz {
  id: string;
  topic: string;
  text: string;
  options: string[];
  correct_index: number;
  explanation: string;
  video_id: string;
  course_name?: string;
  chapter_num?: number;
  chapter_title?: string;
}

export interface RecallFlashcard {
  id: string;
  topic: string;
  front: string;
  back: string;
  video_id: string;
  course_name?: string;
  chapter_num?: number;
  chapter_title?: string;
}

export interface StreakData {
  streak: number;
  todayMinutes: number;
  thresholdMinutes: number;
  todayQualifies: boolean;
}

/** Response of GET /api/dashboard/cards */
export interface CardsResponse {
  quickQuiz: QuickQuiz | null;
  recallFlashcard: RecallFlashcard | null;
  totalCompletedChapters?: number;
  totalCompletedQuestions?: number;
  remainingQuestions?: number;
  quickQuizExhausted?: boolean;
  totalCompletedFlashcards?: number;
  remainingFlashcards?: number;
  flashcardExhausted?: boolean;
  hasCompletedChapters?: boolean;
}

export type { ReportItemType } from "@/components/ReportModal";
