import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { getClaims } = vi.hoisted(() => ({ getClaims: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getClaims } })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { GET as getOverview } from "../admin/overview/route";
import { PATCH as patchSettings } from "../admin/settings/route";
import { PATCH as patchReport } from "../admin/reports/[id]/route";
import { POST as postFeedback } from "../feedback/route";
import { POST as postReport } from "../questions/[id]/report/route";

process.env.ADMIN_EMAILS = "admin@example.com";

const session = (email: string | null) =>
  getClaims.mockResolvedValue(email ? { data: { claims: { sub: `id-${email}`, email } } } : { data: null });

/** Chainable PostgREST mock recording table + method calls; every query resolves to `result` */
function mockSupabase(result: { data?: unknown; error?: unknown } = {}) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const from = vi.fn((table: string) => {
    const builder: any = {
      then: (resolve: any, reject: any) => Promise.resolve({ data: null, error: null, ...result }).then(resolve, reject),
    };
    for (const m of ["select", "insert", "upsert", "update", "eq", "in", "order", "range", "limit", "maybeSingle"]) {
      builder[m] = vi.fn((...args: unknown[]) => {
        calls.push({ table, method: m, args });
        return builder;
      });
    }
    return builder;
  });
  (createAdminClient as any).mockReturnValue({ from, rpc: vi.fn(), auth: { admin: { listUsers: vi.fn() } } });
  return calls;
}

const json = (url: string, method: string, body: unknown) =>
  new NextRequest(url, { method, body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

describe("admin routes are admin-only", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401 when signed out, 403 for a non-admin, without touching the database", async () => {
    mockSupabase();

    session(null);
    expect((await getOverview()).status).toBe(401);

    session("someone@example.com");
    expect((await getOverview()).status).toBe(403);
    expect((await patchSettings(json("http://x/api/admin/settings", "PATCH", { usd_to_inr: 90 }))).status).toBe(403);
    expect(
      (await patchReport(json("http://x/api/admin/reports/r1", "PATCH", { status: "resolved" }), { params: Promise.resolve({ id: "r1" }) })).status
    ).toBe(403);

    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("lets an admin save settings, validating each key", async () => {
    session("Admin@Example.com");
    const calls = mockSupabase();

    const bad = await patchSettings(json("http://x/api/admin/settings", "PATCH", { usd_to_inr: -5 }));
    expect(bad.status).toBe(400);

    const ok = await patchSettings(json("http://x/api/admin/settings", "PATCH", { usd_to_inr: 90, gemini_monthly_budget_usd: 15 }));
    expect(ok.status).toBe(200);
    const upsert = calls.find((c) => c.table === "admin_settings" && c.method === "upsert");
    expect(Object.fromEntries((upsert?.args[0] as any[]).map((r) => [r.key, r.value]))).toEqual({
      usd_to_inr: 90,
      gemini_monthly_budget_usd: 15,
    });
  });
});

describe("POST /api/feedback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires a session and a non-empty message, then stores it with the user's email", async () => {
    session(null);
    mockSupabase();
    expect((await postFeedback(json("http://x/api/feedback", "POST", { message: "hi" }))).status).toBe(401);

    session("learner@example.com");
    const calls = mockSupabase();
    expect((await postFeedback(json("http://x/api/feedback", "POST", { message: "   " }))).status).toBe(400);

    const res = await postFeedback(json("http://x/api/feedback", "POST", { category: "bug", message: "Quiz froze", page: "/" }));
    expect(res.status).toBe(200);
    const insert = calls.find((c) => c.table === "feedback" && c.method === "insert");
    expect(insert?.args[0]).toMatchObject({ user_id: "id-learner@example.com", email: "learner@example.com", category: "bug", message: "Quiz froze" });
  });
});

describe("POST /api/questions/[id]/report", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores flashcard reports against flashcard_id (they used to fail the question foreign key)", async () => {
    session("learner@example.com");
    const calls = mockSupabase();

    const res = await postReport(json("http://x/api/questions/f1/report", "POST", { itemType: "Flashcard", category: "Typo" }), {
      params: Promise.resolve({ id: "f1" }),
    });
    expect(res.status).toBe(200);
    expect(calls.find((c) => c.method === "insert")?.args[0]).toMatchObject({
      question_id: null,
      flashcard_id: "f1",
      item_type: "flashcard",
      category: "Typo",
    });
  });

  it("reports a failed save instead of claiming success", async () => {
    session("learner@example.com");
    mockSupabase({ error: { message: "insert failed" } });
    const res = await postReport(json("http://x/api/questions/q1/report", "POST", {}), { params: Promise.resolve({ id: "q1" }) });
    expect(res.status).toBe(500);
  });
});
