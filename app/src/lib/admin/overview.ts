import { isQuotaError } from "../ai-errors";
import { tokenCostUsd, type AdminSettings } from "./settings";
import type { AdminFeedbackRow, AdminOverview, AdminReportRow, AdminUserRow, InboxStatus } from "./types";

/** Raw rows fetched by GET /api/admin/overview (one parallel wave), aggregated here */
export interface OverviewInput {
  now: Date;
  setupNeeded: string[];
  settings: AdminSettings;
  authUsers: {
    id: string;
    email?: string;
    created_at: string;
    last_sign_in_at?: string | null;
    email_confirmed_at?: string | null;
    app_metadata?: { providers?: string[]; provider?: string };
  }[];
  courses: { id: string; user_id: string; playlist_id: string; playlists?: { title?: string; video_count?: number } | null }[];
  dailyStudy: { user_id: string; local_date: string; active_seconds: number; updated_at: string | null }[];
  chapterProgress: { user_id: string; status: string }[];
  quizAttempts: { user_id: string; skipped: boolean; score: number | null }[];
  counts: {
    playlists: number;
    videos: number;
    questions: number;
    flashcards: number;
    notes: number;
    bookmarks: number;
    answers: number;
    answersCorrect: number;
  };
  videoContentStatuses: string[];
  jobs: {
    status: string;
    error?: string | null;
    model?: string | null;
    input_tokens?: number | null;
    output_tokens?: number | null;
    started_at: string | null;
    videos?: { title?: string; playlists?: { title?: string } | null } | null;
  }[];
  reports: RawReport[];
  feedback: {
    id: string;
    email: string | null;
    category: string | null;
    message: string;
    page: string | null;
    status: string | null;
    created_at: string;
  }[];
  dbStats: { database_bytes: number; tables: { name: string; rows: number; bytes: number }[] } | null;
}

export interface RawReport {
  id: string;
  question_id: string | null;
  flashcard_id?: string | null;
  item_type?: string | null;
  category: string | null;
  reason: string | null;
  status?: string | null;
  created_at: string;
  user_id: string;
  questions?: { text?: string; options?: string[]; correct_index?: number; status?: string; videos?: { title?: string } | null } | null;
  flashcards?: { front?: string; back?: string; status?: string; videos?: { title?: string } | null } | null;
}

const DAY_MS = 86_400_000;
const STUDYING_NOW_MS = 2 * 60_000;
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const round2 = (n: number) => Math.round(n * 100) / 100;
const inboxStatus = (s: string | null | undefined): InboxStatus => (s === "seen" || s === "resolved" ? s : "new");

export function buildOverview(input: OverviewInput): AdminOverview {
  const { now, settings } = input;
  const nowMs = now.getTime();
  const today = isoDate(now);
  const monthStart = `${today.slice(0, 7)}-01`;
  const dateDaysAgo = (n: number) => isoDate(new Date(nowMs - n * DAY_MS));
  const since7 = dateDaysAgo(6);
  const since30 = dateDaysAgo(29);
  const emailById = new Map(input.authUsers.map((u) => [u.id, u.email ?? "(no email)"]));

  // ---- Users
  const activeSince = (since: string) =>
    new Set(input.dailyStudy.filter((d) => d.active_seconds > 0 && d.local_date >= since).map((d) => d.user_id)).size;

  const perUser = new Map<string, Omit<AdminUserRow, "id" | "email" | "providers" | "createdAt" | "lastSignInAt" | "confirmed">>();
  const userStats = (id: string) => {
    let s = perUser.get(id);
    if (!s) {
      s = { courses: 0, studyMinutes30d: 0, studyMinutesTotal: 0, lastActiveDate: null, chaptersCompleted: 0, quizAttempts: 0 };
      perUser.set(id, s);
    }
    return s;
  };
  for (const c of input.courses) userStats(c.user_id).courses++;
  for (const d of input.dailyStudy) {
    const s = userStats(d.user_id);
    const minutes = d.active_seconds / 60;
    s.studyMinutesTotal += minutes;
    if (d.local_date >= since30) s.studyMinutes30d += minutes;
    if (d.active_seconds > 0 && (!s.lastActiveDate || d.local_date > s.lastActiveDate)) s.lastActiveDate = d.local_date;
  }
  for (const p of input.chapterProgress) {
    if (p.status === "completed" || p.status === "completed_without_quiz") userStats(p.user_id).chaptersCompleted++;
  }
  for (const q of input.quizAttempts) userStats(q.user_id).quizAttempts++;

  const list: AdminUserRow[] = input.authUsers
    .map((u) => {
      const s = userStats(u.id);
      return {
        id: u.id,
        email: u.email ?? "(no email)",
        providers: u.app_metadata?.providers ?? (u.app_metadata?.provider ? [u.app_metadata.provider] : []),
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        confirmed: !!u.email_confirmed_at,
        ...s,
        studyMinutes30d: Math.round(s.studyMinutes30d),
        studyMinutesTotal: Math.round(s.studyMinutesTotal),
      };
    })
    .sort((a, b) => (b.lastSignInAt ?? b.createdAt).localeCompare(a.lastSignInAt ?? a.createdAt));

  const createdSince = (n: number) => input.authUsers.filter((u) => nowMs - Date.parse(u.created_at) < n * DAY_MS).length;

  // ---- AI usage
  const prices = settings.gemini_prices;
  const jobCost = (j: OverviewInput["jobs"][number]) =>
    j.input_tokens != null || j.output_tokens != null
      ? tokenCostUsd(prices, j.model, j.input_tokens ?? 0, j.output_tokens ?? 0)
      : 0;
  const tracked = input.jobs.filter((j) => j.input_tokens != null || j.output_tokens != null);
  const monthJobs = input.jobs.filter((j) => (j.started_at ?? "") >= monthStart);
  const monthTracked = monthJobs.filter((j) => j.input_tokens != null || j.output_tokens != null);
  const spendMonth = monthTracked.reduce((sum, j) => sum + jobCost(j), 0);
  const spendAll = tracked.reduce((sum, j) => sum + jobCost(j), 0);

  const perModelMap = new Map<string, AdminOverview["ai"]["perModel"][number]>();
  for (const j of monthTracked) {
    const key = j.model || "unknown";
    const m = perModelMap.get(key) ?? { model: key, calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    m.calls++;
    m.inputTokens += j.input_tokens ?? 0;
    m.outputTokens += j.output_tokens ?? 0;
    m.costUsd += jobCost(j);
    perModelMap.set(key, m);
  }

  const completedTracked = tracked.filter((j) => j.status === "completed");
  const statusCount = (s: string) => input.videoContentStatuses.filter((x) => x === s).length;
  const content = {
    ready: statusCount("ready"),
    pending: statusCount("pending"),
    failed: statusCount("failed") + statusCount("unavailable"),
    notStarted: Math.max(0, input.counts.videos - input.videoContentStatuses.length),
    total: input.counts.videos,
  };

  // ---- Daily series (last 30 days)
  const days = Array.from({ length: 30 }, (_, i) => dateDaysAgo(29 - i));
  const daily = days.map((date) => {
    const studyRows = input.dailyStudy.filter((d) => d.local_date === date && d.active_seconds > 0);
    return {
      date,
      activeUsers: new Set(studyRows.map((d) => d.user_id)).size,
      studyMinutes: Math.round(studyRows.reduce((sum, d) => sum + d.active_seconds, 0) / 60),
      signups: input.authUsers.filter((u) => u.created_at.slice(0, 10) === date).length,
      aiCostUsd: round2(
        input.jobs.filter((j) => (j.started_at ?? "").slice(0, 10) === date).reduce((sum, j) => sum + jobCost(j), 0)
      ),
    };
  });

  // ---- Learning
  const totalStudySeconds = input.dailyStudy.reduce((sum, d) => sum + d.active_seconds, 0);
  const activeDays = input.dailyStudy.filter((d) => d.active_seconds > 0).length;
  const finishedQuizzes = input.quizAttempts.filter((q) => !q.skipped);
  const enrolled = new Map<string, { title: string; enrolled: number; videos: number }>();
  for (const c of input.courses) {
    const e = enrolled.get(c.playlist_id) ?? {
      title: c.playlists?.title ?? "Untitled playlist",
      enrolled: 0,
      videos: c.playlists?.video_count ?? 0,
    };
    e.enrolled++;
    enrolled.set(c.playlist_id, e);
  }

  // ---- Infra
  const monthlyFixed = settings.supabase_plan.monthly_usd + settings.hosting.monthly_usd;

  // ---- Inboxes
  const reportKey = (r: RawReport) => r.question_id ?? r.flashcard_id ?? r.id;
  const reportsPerItem = new Map<string, number>();
  for (const r of input.reports) reportsPerItem.set(reportKey(r), (reportsPerItem.get(reportKey(r)) ?? 0) + 1);
  const reports: AdminReportRow[] = input.reports.map((r) => {
    const isFlashcard = r.item_type === "flashcard" || (!r.question_id && !!r.flashcard_id);
    const q = r.questions;
    const f = r.flashcards;
    return {
      id: r.id,
      itemType: isFlashcard ? "flashcard" : "question",
      itemId: isFlashcard ? (r.flashcard_id ?? null) : r.question_id,
      itemText: (isFlashcard ? f?.front : q?.text) ?? "(item no longer exists)",
      itemAnswer: isFlashcard ? (f?.back ?? "") : (q?.options?.[q.correct_index ?? -1] ?? ""),
      itemStatus: (isFlashcard ? f?.status : q?.status) ?? "active",
      videoTitle: (isFlashcard ? f?.videos?.title : q?.videos?.title) ?? "",
      category: r.category ?? "Other",
      reason: r.reason ?? "",
      status: inboxStatus(r.status),
      reporterEmail: emailById.get(r.user_id) ?? "(deleted user)",
      createdAt: r.created_at,
      reportsForItem: reportsPerItem.get(reportKey(r)) ?? 1,
    };
  });
  const feedback: AdminFeedbackRow[] = input.feedback.map((f) => ({
    id: f.id,
    email: f.email ?? "(unknown)",
    category: f.category ?? "other",
    message: f.message,
    page: f.page,
    status: inboxStatus(f.status),
    createdAt: f.created_at,
  }));

  return {
    generatedAt: now.toISOString(),
    setupNeeded: input.setupNeeded,
    settings,
    users: {
      total: input.authUsers.length,
      new7d: createdSince(7),
      new30d: createdSince(30),
      studyingNow: new Set(
        input.dailyStudy
          .filter((d) => d.updated_at && nowMs - Date.parse(d.updated_at) < STUDYING_NOW_MS)
          .map((d) => d.user_id)
      ).size,
      activeToday: activeSince(today),
      active7d: activeSince(since7),
      active30d: activeSince(since30),
      list,
    },
    daily,
    learning: {
      totalStudyHours: Math.round((totalStudySeconds / 3600) * 10) / 10,
      avgMinutesPerActiveDay: activeDays ? Math.round(totalStudySeconds / 60 / activeDays) : 0,
      courses: input.courses.length,
      playlists: input.counts.playlists,
      videos: input.counts.videos,
      questions: input.counts.questions,
      flashcards: input.counts.flashcards,
      notes: input.counts.notes,
      bookmarks: input.counts.bookmarks,
      chaptersCompleted: input.chapterProgress.filter((p) => p.status === "completed").length,
      chaptersCompletedWithoutQuiz: input.chapterProgress.filter((p) => p.status === "completed_without_quiz").length,
      quizAttempts: input.quizAttempts.length,
      quizzesSkipped: input.quizAttempts.length - finishedQuizzes.length,
      avgQuizScore: finishedQuizzes.length
        ? Math.round((finishedQuizzes.reduce((sum, q) => sum + (q.score ?? 0), 0) / finishedQuizzes.length) * 10) / 10
        : null,
      answers: input.counts.answers,
      accuracyPct: input.counts.answers ? Math.round((input.counts.answersCorrect / input.counts.answers) * 100) : null,
      topPlaylists: [...enrolled.values()].sort((a, b) => b.enrolled - a.enrolled).slice(0, 5),
    },
    ai: {
      spendMonthUsd: round2(spendMonth),
      spendAllTimeUsd: round2(spendAll),
      tokensInMonth: monthTracked.reduce((sum, j) => sum + (j.input_tokens ?? 0), 0),
      tokensOutMonth: monthTracked.reduce((sum, j) => sum + (j.output_tokens ?? 0), 0),
      budgetUsd: settings.gemini_monthly_budget_usd,
      budgetUsedPct: settings.gemini_monthly_budget_usd
        ? Math.round((spendMonth / settings.gemini_monthly_budget_usd) * 100)
        : 0,
      callsMonth: monthTracked.length,
      avgCostPerVideoUsd: completedTracked.length
        ? Math.round((completedTracked.reduce((sum, j) => sum + jobCost(j), 0) / completedTracked.length) * 10000) / 10000
        : null,
      quotaErrorsMonth: monthJobs.filter((j) => j.status === "failed" && isQuotaError(j.error)).length,
      untrackedJobs: input.jobs.length - tracked.length,
      perModel: [...perModelMap.values()]
        .map((m) => ({ ...m, costUsd: round2(m.costUsd) }))
        .sort((a, b) => b.costUsd - a.costUsd),
      content,
      jobs: {
        completed: input.jobs.filter((j) => j.status === "completed").length,
        failed: input.jobs.filter((j) => j.status === "failed").length,
        processing: input.jobs.filter((j) => j.status === "processing").length,
      },
      recentFailures: input.jobs
        .filter((j) => j.status === "failed")
        .sort((a, b) => (b.started_at ?? "").localeCompare(a.started_at ?? ""))
        .slice(0, 20)
        .map((j) => ({
          videoTitle: j.videos?.title ?? "(deleted video)",
          playlistTitle: j.videos?.playlists?.title ?? "",
          error: j.error ?? "Unknown error",
          at: j.started_at ?? "",
        })),
    },
    infra: {
      databaseBytes: input.dbStats?.database_bytes ?? null,
      databaseLimitBytes: settings.supabase_plan.db_limit_mb * 1024 * 1024,
      tables: input.dbStats?.tables ?? [],
      monthlyFixedUsd: round2(monthlyFixed),
      monthlyTotalUsd: round2(monthlyFixed + spendMonth),
    },
    reports,
    feedback,
  };
}
