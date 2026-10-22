import type { AdminSettings } from "./settings";

/** Response of GET /api/admin/overview */
export interface AdminOverview {
  generatedAt: string;
  /** Features waiting on the admin-page SQL migration (supabase/migrations/20261022_admin_page.sql) */
  setupNeeded: string[];
  settings: AdminSettings;

  users: {
    total: number;
    new7d: number;
    new30d: number;
    /** Sent a study heartbeat in the last 2 minutes */
    studyingNow: number;
    /** Studied (any heartbeat) today / in the last 7 / 30 days, by UTC date */
    activeToday: number;
    active7d: number;
    active30d: number;
    list: AdminUserRow[];
  };

  /** Last 30 days, oldest first (UTC dates) */
  daily: { date: string; activeUsers: number; studyMinutes: number; signups: number; aiCostUsd: number }[];

  learning: {
    totalStudyHours: number;
    avgMinutesPerActiveDay: number;
    courses: number;
    playlists: number;
    videos: number;
    questions: number;
    flashcards: number;
    notes: number;
    bookmarks: number;
    chaptersCompleted: number;
    chaptersCompletedWithoutQuiz: number;
    quizAttempts: number;
    quizzesSkipped: number;
    avgQuizScore: number | null;
    answers: number;
    accuracyPct: number | null;
    topPlaylists: { title: string; enrolled: number; videos: number }[];
  };

  ai: {
    /** Calendar month to date (UTC) */
    spendMonthUsd: number;
    spendAllTimeUsd: number;
    tokensInMonth: number;
    tokensOutMonth: number;
    budgetUsd: number;
    budgetUsedPct: number;
    callsMonth: number;
    avgCostPerVideoUsd: number | null;
    /** Failed attempts this month whose error looks like a quota / rate limit (HTTP 429) */
    quotaErrorsMonth: number;
    /** Attempts without token data (before token tracking existed) aren't in the spend */
    untrackedJobs: number;
    perModel: { model: string; calls: number; inputTokens: number; outputTokens: number; costUsd: number }[];
    content: { ready: number; pending: number; failed: number; notStarted: number; total: number };
    jobs: { completed: number; failed: number; processing: number };
    recentFailures: { videoTitle: string; playlistTitle: string; error: string; at: string }[];
  };

  infra: {
    databaseBytes: number | null;
    databaseLimitBytes: number;
    tables: { name: string; rows: number; bytes: number }[];
    monthlyFixedUsd: number;
    /** Fixed plans + AI spend this month */
    monthlyTotalUsd: number;
  };

  reports: AdminReportRow[];
  feedback: AdminFeedbackRow[];
}

export interface AdminUserRow {
  id: string;
  email: string;
  providers: string[];
  createdAt: string;
  lastSignInAt: string | null;
  confirmed: boolean;
  courses: number;
  studyMinutes30d: number;
  studyMinutesTotal: number;
  lastActiveDate: string | null;
  chaptersCompleted: number;
  quizAttempts: number;
}

export type InboxStatus = "new" | "seen" | "resolved";

export interface AdminReportRow {
  id: string;
  itemType: "question" | "flashcard";
  itemId: string | null;
  /** Question text, or flashcard front */
  itemText: string;
  /** Correct option, or flashcard back */
  itemAnswer: string;
  /** "active", or "removed" once taken out of circulation */
  itemStatus: string;
  videoTitle: string;
  category: string;
  reason: string;
  status: InboxStatus;
  reporterEmail: string;
  createdAt: string;
  /** How many reports this same item has */
  reportsForItem: number;
}

export interface AdminFeedbackRow {
  id: string;
  email: string;
  category: string;
  message: string;
  page: string | null;
  status: InboxStatus;
  createdAt: string;
}
