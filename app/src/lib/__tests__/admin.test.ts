import { describe, it, expect, afterEach } from "vitest";
import { buildOverview, type OverviewInput } from "../admin/overview";
import { DEFAULT_ADMIN_SETTINGS, mergeSettings, tokenCostUsd } from "../admin/settings";
import { isAdminEmail } from "../admin/auth";

const NOW = new Date("2026-10-22T12:00:00Z");

function input(overrides: Partial<OverviewInput> = {}): OverviewInput {
  return {
    now: NOW,
    setupNeeded: [],
    settings: DEFAULT_ADMIN_SETTINGS,
    authUsers: [],
    courses: [],
    dailyStudy: [],
    chapterProgress: [],
    quizAttempts: [],
    counts: { playlists: 0, videos: 0, questions: 0, flashcards: 0, notes: 0, bookmarks: 0, answers: 0, answersCorrect: 0 },
    videoContentStatuses: [],
    jobs: [],
    reports: [],
    feedback: [],
    dbStats: null,
    ...overrides,
  };
}

describe("tokenCostUsd", () => {
  it("prices input and output tokens per million", () => {
    expect(tokenCostUsd({ m: { input: 0.5, output: 3 } }, "m", 1_000_000, 100_000)).toBeCloseTo(0.8);
  });

  it("prices an unknown model at the most expensive known rate (never under-reports)", () => {
    const prices = { cheap: { input: 0.1, output: 0.4 }, pricey: { input: 1.5, output: 9 } };
    expect(tokenCostUsd(prices, "mystery", 1_000_000, 0)).toBe(1.5);
  });
});

describe("mergeSettings", () => {
  it("overlays valid stored keys on the defaults and ignores invalid or unknown ones", () => {
    const s = mergeSettings([
      { key: "gemini_monthly_budget_usd", value: 25 },
      { key: "hosting", value: { name: "Vercel Pro", monthly_usd: 20 } },
      { key: "usd_to_inr", value: "lots" },
      { key: "something_else", value: 1 },
    ]);
    expect(s.gemini_monthly_budget_usd).toBe(25);
    expect(s.hosting).toEqual({ name: "Vercel Pro", monthly_usd: 20 });
    expect(s.usd_to_inr).toBe(DEFAULT_ADMIN_SETTINGS.usd_to_inr);
    expect(s.gemini_prices).toEqual(DEFAULT_ADMIN_SETTINGS.gemini_prices);
  });
});

describe("isAdminEmail", () => {
  const original = process.env.ADMIN_EMAILS;
  afterEach(() => {
    process.env.ADMIN_EMAILS = original;
  });

  it("matches the ADMIN_EMAILS list case-insensitively and rejects everything else", () => {
    process.env.ADMIN_EMAILS = " Admin@Example.com , second@example.com";
    expect(isAdminEmail("admin@example.com")).toBe(true);
    expect(isAdminEmail("SECOND@example.com")).toBe(true);
    expect(isAdminEmail("someone@example.com")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    process.env.ADMIN_EMAILS = "";
    expect(isAdminEmail("")).toBe(false);
  });
});

describe("buildOverview", () => {
  it("counts users, sign-ups and activity windows", () => {
    const o = buildOverview(
      input({
        authUsers: [
          { id: "u1", email: "a@x.com", created_at: "2026-10-21T10:00:00Z", last_sign_in_at: "2026-10-22T11:00:00Z" },
          { id: "u2", email: "b@x.com", created_at: "2026-09-01T10:00:00Z" },
        ],
        dailyStudy: [
          { user_id: "u1", local_date: "2026-10-22", active_seconds: 1800, updated_at: "2026-10-22T11:59:30Z" },
          { user_id: "u2", local_date: "2026-10-18", active_seconds: 600, updated_at: "2026-10-18T09:00:00Z" },
          { user_id: "u2", local_date: "2026-08-01", active_seconds: 600, updated_at: "2026-08-01T09:00:00Z" },
        ],
        courses: [
          { id: "c1", user_id: "u1", playlist_id: "p1", playlists: { title: "Flask", video_count: 10 } },
          { id: "c2", user_id: "u2", playlist_id: "p1", playlists: { title: "Flask", video_count: 10 } },
        ],
      })
    );

    expect(o.users).toMatchObject({ total: 2, new7d: 1, new30d: 1, studyingNow: 1, activeToday: 1, active7d: 2, active30d: 2 });
    expect(o.users.list[0]).toMatchObject({ email: "a@x.com", courses: 1, studyMinutesTotal: 30, lastActiveDate: "2026-10-22" });
    expect(o.learning.topPlaylists).toEqual([{ title: "Flask", enrolled: 2, videos: 10 }]);
    expect(o.daily).toHaveLength(30);
    expect(o.daily[29]).toMatchObject({ date: "2026-10-22", activeUsers: 1, studyMinutes: 30 });
    expect(o.daily.find((d) => d.date === "2026-10-21")?.signups).toBe(1);
  });

  it("totals this month's Gemini spend from token usage and flags quota errors", () => {
    const o = buildOverview(
      input({
        settings: { ...DEFAULT_ADMIN_SETTINGS, gemini_prices: { m: { input: 1, output: 10 } }, gemini_monthly_budget_usd: 2 },
        jobs: [
          { status: "completed", model: "m", input_tokens: 1_000_000, output_tokens: 100_000, started_at: "2026-10-05T00:00:00Z" },
          { status: "failed", error: "All candidate Gemini models failed (m: 429 RESOURCE_EXHAUSTED)", started_at: "2026-10-06T00:00:00Z" },
          { status: "completed", model: "m", input_tokens: 1_000_000, output_tokens: 0, started_at: "2026-09-30T00:00:00Z" },
          { status: "completed", started_at: "2026-09-01T00:00:00Z" },
        ],
      })
    );

    expect(o.ai.spendMonthUsd).toBe(2);
    expect(o.ai.spendAllTimeUsd).toBe(3);
    expect(o.ai.budgetUsedPct).toBe(100);
    expect(o.ai.quotaErrorsMonth).toBe(1);
    expect(o.ai.untrackedJobs).toBe(2);
    expect(o.ai.perModel).toEqual([{ model: "m", calls: 1, inputTokens: 1_000_000, outputTokens: 100_000, costUsd: 2 }]);
    expect(o.infra.monthlyTotalUsd).toBe(2);
  });

  it("splits content generation status, counting videos with no content row as not started", () => {
    const o = buildOverview(
      input({
        counts: { ...input().counts, videos: 5 },
        videoContentStatuses: ["ready", "ready", "failed", "pending"],
      })
    );
    expect(o.ai.content).toEqual({ ready: 2, pending: 1, failed: 1, notStarted: 1, total: 5 });
  });

  it("shapes question and flashcard reports, counting repeat reports of the same item", () => {
    const o = buildOverview(
      input({
        authUsers: [{ id: "u1", email: "a@x.com", created_at: "2026-10-01T00:00:00Z" }],
        reports: [
          {
            id: "r1", question_id: "q1", category: "Incorrect Answer Key", reason: "B is right", created_at: "2026-10-22T10:00:00Z", user_id: "u1",
            questions: { text: "What is 2+2?", options: ["3", "4", "5", "6"], correct_index: 1, status: "active", videos: { title: "Ch 1" } },
          },
          { id: "r2", question_id: "q1", category: "Other", reason: "", status: "resolved", created_at: "2026-10-21T10:00:00Z", user_id: "u1", questions: null },
          {
            id: "r3", question_id: null, flashcard_id: "f1", item_type: "flashcard", category: "Typo", reason: "", created_at: "2026-10-20T10:00:00Z", user_id: "gone",
            flashcards: { front: "Front", back: "Back", status: "removed", videos: { title: "Ch 2" } },
          },
        ],
      })
    );

    expect(o.reports[0]).toMatchObject({
      itemType: "question", itemId: "q1", itemText: "What is 2+2?", itemAnswer: "4", videoTitle: "Ch 1",
      status: "new", reporterEmail: "a@x.com", reportsForItem: 2,
    });
    expect(o.reports[1]).toMatchObject({ status: "resolved", itemText: "(item no longer exists)" });
    expect(o.reports[2]).toMatchObject({
      itemType: "flashcard", itemId: "f1", itemText: "Front", itemAnswer: "Back", itemStatus: "removed", reporterEmail: "(deleted user)",
    });
  });
});
