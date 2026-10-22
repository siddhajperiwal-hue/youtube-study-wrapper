import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-helpers")>()),
  getEffectiveUserId: vi.fn().mockResolvedValue("user-1"),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { POST } from "../courses/[id]/quiz/submit/route";

const VIDEO = "11111111-1111-4111-8111-111111111111";
const Q1 = "22222222-2222-4222-8222-222222222222";
const Q2 = "33333333-3333-4333-8333-333333333333";

/** Chainable mock: each table answers with its canned result; writes are recorded */
function mockSupabase(results: Record<string, { data: unknown }>) {
  const writes: { table: string; method: string; row: any }[] = [];
  const from = vi.fn((table: string) => {
    const builder: any = {
      then: (resolve: any, reject: any) =>
        Promise.resolve({ error: null, ...(results[table] ?? { data: null }) }).then(resolve, reject),
    };
    for (const m of ["select", "eq", "in", "maybeSingle"]) builder[m] = vi.fn(() => builder);
    for (const m of ["insert", "upsert"]) {
      builder[m] = vi.fn((row: unknown) => {
        writes.push({ table, method: m, row });
        return builder;
      });
    }
    return builder;
  });
  (createAdminClient as any).mockReturnValue({ from });
  return writes;
}

const submit = (body: unknown) =>
  POST(new NextRequest("http://x/api/courses/c1/quiz/submit", { method: "POST", body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: "c1" }),
  });

const savedStatus = (writes: { table: string; row: any }[]) =>
  writes.find((w) => w.table === "chapter_progress")?.row.status;

describe("POST /api/courses/[id]/quiz/submit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks a skipped quiz as Watched (completed_without_quiz) and records a skipped attempt", async () => {
    const writes = mockSupabase({ courses: { data: { id: "c1" } }, chapter_progress: { data: { status: "not_started" } } });
    const res = await submit({ videoId: VIDEO, skipped: true });

    expect(res.status).toBe(200);
    expect(savedStatus(writes)).toBe("completed_without_quiz");
    expect(writes.find((w) => w.table === "quiz_attempts")?.row).toMatchObject({ skipped: true, score: 0 });
    expect(writes.some((w) => w.table === "answers")).toBe(false);
  });

  it("never downgrades a chapter that was already mastered", async () => {
    const writes = mockSupabase({ courses: { data: { id: "c1" } }, chapter_progress: { data: { status: "completed" } } });
    await submit({ videoId: VIDEO, skipped: true });
    expect(savedStatus(writes)).toBe("completed");
  });

  it("marks a chapter with no quiz as Watched without recording a quiz attempt", async () => {
    const writes = mockSupabase({ courses: { data: { id: "c1" } }, chapter_progress: { data: null } });
    await submit({ videoId: VIDEO, noQuiz: true });
    expect(savedStatus(writes)).toBe("completed_without_quiz");
    expect(writes.some((w) => w.table === "quiz_attempts")).toBe(false);
  });

  it("grades a submitted quiz, saves all answers in one insert, and marks the chapter Mastered", async () => {
    const writes = mockSupabase({
      courses: { data: { id: "c1" } },
      chapter_progress: { data: null },
      questions: { data: [{ id: Q1, correct_index: 2, explanation: "x" }, { id: Q2, correct_index: 0, explanation: "y" }] },
    });
    const res = await submit({
      videoId: VIDEO,
      userAnswers: [{ questionId: Q1, selectedIndex: 2 }, { questionId: Q2, selectedIndex: 1 }],
    });
    const body = await res.json();

    expect(body.score).toBe(1);
    expect(savedStatus(writes)).toBe("completed");
    const answerInserts = writes.filter((w) => w.table === "answers");
    expect(answerInserts).toHaveLength(1);
    expect(answerInserts[0].row.map((a: any) => a.is_correct)).toEqual([true, false]);
  });

  it("refuses a course that isn't the user's, without writing anything", async () => {
    const writes = mockSupabase({ courses: { data: null } });
    const res = await submit({ videoId: VIDEO, skipped: true });
    expect(res.status).toBe(404);
    expect(writes).toHaveLength(0);
  });
});
