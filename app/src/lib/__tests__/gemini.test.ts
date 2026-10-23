import { describe, it, expect, vi, beforeEach } from "vitest";

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));

vi.mock("youtube-transcript", () => ({
  YoutubeTranscript: { fetchTranscript: vi.fn().mockRejectedValue(new Error("offline")) },
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(function () {
    return { models: { generateContent } };
  }),
}));

vi.mock("../supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "../supabase/admin";
import { countFailedAttempts, generateContentForVideo, questionTarget, topUpQuestionsForVideo } from "../gemini";

type Call = { table: string; ops: string[]; args: unknown[][] };

/**
 * Chainable PostgREST-style mock that records each query (table + methods called) and resolves
 * it with `respond(call)`, so tests can answer the claim, counts and inserts differently.
 */
function mockSupabase(respond: (call: Call) => { data?: unknown; error?: unknown; count?: number }) {
  const calls: Call[] = [];
  const from = vi.fn((table: string) => {
    const call: Call = { table, ops: [], args: [] };
    calls.push(call);
    const builder: any = {
      then: (resolve: any, reject: any) =>
        Promise.resolve({ data: null, error: null, ...respond(call) }).then(resolve, reject),
    };
    for (const m of ["select", "insert", "upsert", "update", "eq", "in", "or", "single", "maybeSingle"]) {
      builder[m] = vi.fn((...args: unknown[]) => {
        call.ops.push(m);
        call.args.push(args);
        return builder;
      });
    }
    return builder;
  });
  (createAdminClient as any).mockReturnValue({ from });
  return calls;
}

const validResponse = JSON.stringify({
  summary: "Summary",
  topics: ["Topic"],
  questions: [
    { topic: "T", text: "Q?", options: ["a", "b", "c", "d"], correct_index: 0, explanation: "E", difficulty: "easy" },
  ],
  flashcards: [{ topic: "T", front: "F", back: "B" }],
});

const isClaimInsert = (c: Call) => c.table === "video_content" && c.ops[0] === "upsert" && c.ops.includes("select");
const inserts = (calls: Call[], table: string) => calls.filter((c) => c.table === table && c.ops[0] === "insert");

process.env.GEMINI_API_KEY ||= "test-key";

describe("generateContentForVideo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateContent.mockRejectedValue(new Error("offline"));
  });

  it("reuses the in-flight run for the same video instead of starting a duplicate", async () => {
    mockSupabase(() => ({ data: [] }));

    const first = generateContentForVideo("vid-1", "yt-1", "Title", "", 600);
    const second = generateContentForVideo("vid-1", "yt-1", "Title", "", 600);

    expect(second).toBe(first);
    expect(createAdminClient).toHaveBeenCalledTimes(1);

    // Once the run finishes, a new call starts a fresh run
    await first;
    const third = generateContentForVideo("vid-1", "yt-1", "Title", "", 600);
    expect(third).not.toBe(first);
    await third;
  });

  it("skips the video without calling Gemini when another run holds the claim", async () => {
    // Both claim queries match nothing: the content is ready or being generated elsewhere
    const calls = mockSupabase(() => ({ data: [] }));

    const result = await generateContentForVideo("vid-2", "yt-2", "Title", "", 600);

    expect(result).toEqual({ status: "skipped" });
    expect(generateContent).not.toHaveBeenCalled();
    expect(calls.some((c) => c.table === "video_content" && c.ops.includes("update"))).toBe(true);
    // A run that never held the claim must not mark the video failed
    expect(calls.filter((c) => c.table === "video_content" && c.ops[0] === "upsert" && !c.ops.includes("select"))).toHaveLength(0);
  });

  it("saves questions and flashcards, then marks the content ready", async () => {
    generateContent.mockResolvedValue({ text: validResponse });
    const calls = mockSupabase((call) => {
      if (isClaimInsert(call)) return { data: [{ video_id: "vid-3" }] };
      if (call.table === "generation_jobs" && call.ops[0] === "insert") return { data: { id: "job-1" } };
      if (call.ops[0] === "select" && (call.table === "questions" || call.table === "flashcards")) return { count: 0 };
      return {};
    });

    const result = await generateContentForVideo("vid-3", "yt-3", "Title", "", 600);

    expect(result.status).toBe("ready");
    expect(inserts(calls, "questions")).toHaveLength(1);
    expect(inserts(calls, "flashcards")).toHaveLength(1);
    const readyIdx = calls.findIndex((c) => c.table === "video_content" && (c.args[0]?.[0] as any)?.status === "ready");
    expect(readyIdx).toBeGreaterThan(calls.indexOf(inserts(calls, "questions")[0]));
    const jobUpdate = calls.find((c) => c.table === "generation_jobs" && c.ops[0] === "update");
    expect(jobUpdate?.args[0][0]).toMatchObject({ status: "completed" });
  });

  it("keeps questions saved by an interrupted earlier run instead of adding a second set", async () => {
    generateContent.mockResolvedValue({ text: validResponse });
    const calls = mockSupabase((call) => {
      if (isClaimInsert(call)) return { data: [{ video_id: "vid-4" }] };
      if (call.ops[0] === "select" && call.table === "questions") return { count: 5 };
      if (call.ops[0] === "select" && call.table === "flashcards") return { count: 0 };
      return {};
    });

    const result = await generateContentForVideo("vid-4", "yt-4", "Title", "", 600);

    expect(result.status).toBe("ready");
    expect(inserts(calls, "questions")).toHaveLength(0);
    expect(inserts(calls, "flashcards")).toHaveLength(1);
  });

  it("records the error and marks the video failed when generation fails", async () => {
    const calls = mockSupabase((call) => {
      if (isClaimInsert(call)) return { data: [{ video_id: "vid-5" }] };
      if (call.table === "generation_jobs" && call.ops[0] === "insert") return { data: { id: "job-5" } };
      return {};
    });

    const result = await generateContentForVideo("vid-5", "yt-5", "Title", "", 600);

    expect(result).toEqual({ status: "failed" });
    const failedUpsert = calls.find((c) => c.table === "video_content" && (c.args[0]?.[0] as any)?.status === "failed");
    expect(failedUpsert).toBeDefined();
    const jobUpdate = calls.find((c) => c.table === "generation_jobs" && c.ops[0] === "update");
    expect(jobUpdate?.args[0][0]).toMatchObject({ status: "failed", error: expect.stringContaining("All candidate Gemini models failed") });
  });

  it("reports a quota / rate-limit failure as rate_limited, still logging it", async () => {
    generateContent.mockRejectedValue(Object.assign(new Error("You exceeded your current quota"), { status: 429 }));
    const calls = mockSupabase((call) => {
      if (isClaimInsert(call)) return { data: [{ video_id: "vid-rl" }] };
      if (call.table === "generation_jobs" && call.ops[0] === "insert") return { data: { id: "job-rl" } };
      return {};
    });

    const result = await generateContentForVideo("vid-rl", "yt-rl", "Title", "", 600);

    expect(result).toEqual({ status: "rate_limited" });
    const jobUpdate = calls.find((c) => c.table === "generation_jobs" && c.ops[0] === "update");
    expect(jobUpdate?.args[0][0]).toMatchObject({ status: "failed", error: expect.stringContaining("429") });
  });

  it("doesn't retry a video that has used up its background attempts", async () => {
    const calls = mockSupabase((call) =>
      call.table === "generation_jobs" ? { data: [{ video_id: "vid-6" }, { video_id: "vid-6" }, { video_id: "vid-6" }] } : {}
    );

    const result = await generateContentForVideo("vid-6", "yt-6", "Title", "", 600, { maxFailedAttempts: 3 });

    expect(result).toEqual({ status: "skipped" });
    expect(calls.some((c) => c.table === "video_content")).toBe(false);
  });
});

describe("questionTarget", () => {
  it("asks for at least 20 questions, about 1 per 2 minutes for long videos, at most 30", () => {
    expect(questionTarget(300)).toBe(20);
    expect(questionTarget(50 * 60)).toBe(25);
    expect(questionTarget(3 * 3600)).toBe(30);
  });
});

describe("topUpQuestionsForVideo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateContent.mockRejectedValue(new Error("offline"));
  });

  const question = (text: string) => ({ topic: "T", text, options: ["a", "b", "c", "d"], correct_index: 0, explanation: "E", difficulty: "easy" });
  const isTopUpClaim = (c: Call) => c.table === "video_content" && c.ops[0] === "update" && c.ops.includes("select");
  const promptVersionUpdates = (calls: Call[]) =>
    calls.filter((c) => c.table === "video_content" && c.ops[0] === "update").map((c) => (c.args[0][0] as any).prompt_version);

  it("skips without calling Gemini when it can't claim the video", async () => {
    const calls = mockSupabase(() => ({ data: [] }));
    const result = await topUpQuestionsForVideo("vid-t1", "yt-t1", "Title", "", 600);
    expect(result).toEqual({ status: "skipped" });
    expect(generateContent).not.toHaveBeenCalled();
    expect(inserts(calls, "questions")).toHaveLength(0);
  });

  it("adds only the missing questions, drops repeats of existing ones, then marks the set complete", async () => {
    const existing = Array.from({ length: 17 }, (_, i) => ({ text: `Existing ${i}?` }));
    generateContent.mockResolvedValue({
      text: JSON.stringify({ questions: [question("existing 3"), question("New A?"), question("New B?"), question("New C?"), question("New D?")] }),
    });
    const calls = mockSupabase((call) => {
      if (isTopUpClaim(call)) return { data: [{ video_id: "vid-t2" }] };
      if (call.table === "questions" && call.ops[0] === "select") return { data: existing };
      if (call.table === "generation_jobs" && call.ops[0] === "insert") return { data: { id: "job-t2" } };
      return {};
    });

    const result = await topUpQuestionsForVideo("vid-t2", "yt-t2", "Title", "", 600);

    expect(result).toEqual({ status: "ready", added: 3 });
    const inserted = inserts(calls, "questions")[0].args[0][0] as any[];
    expect(inserted.map((q) => q.text)).toEqual(["New A?", "New B?", "New C?"]);
    expect(promptVersionUpdates(calls)).toEqual(["v2-topup", "v2"]);
  });

  it("marks a video that already has enough questions complete without calling Gemini", async () => {
    const calls = mockSupabase((call) => {
      if (isTopUpClaim(call)) return { data: [{ video_id: "vid-t3" }] };
      if (call.table === "questions") return { data: Array.from({ length: 30 }, (_, i) => ({ text: `Q${i}` })) };
      return {};
    });
    const result = await topUpQuestionsForVideo("vid-t3", "yt-t3", "Title", "", 600);
    expect(result).toEqual({ status: "ready", added: 0 });
    expect(generateContent).not.toHaveBeenCalled();
    expect(promptVersionUpdates(calls)).toEqual(["v2-topup", "v2"]);
  });

  it("releases the claim back to v1 when Gemini fails, so a later run retries", async () => {
    const calls = mockSupabase((call) => {
      if (isTopUpClaim(call)) return { data: [{ video_id: "vid-t4" }] };
      if (call.table === "questions") return { data: [{ text: "Q?" }] };
      if (call.table === "generation_jobs" && call.ops[0] === "insert") return { data: { id: "job-t4" } };
      return {};
    });
    const result = await topUpQuestionsForVideo("vid-t4", "yt-t4", "Title", "", 600);
    expect(result).toEqual({ status: "failed" });
    expect(promptVersionUpdates(calls)).toEqual(["v2-topup", "v1"]);
    const jobUpdate = calls.find((c) => c.table === "generation_jobs" && c.ops[0] === "update");
    expect(jobUpdate?.args[0][0]).toMatchObject({ status: "failed" });
    // The video's content stays ready: its existing quiz keeps working
    expect(calls.some((c) => c.table === "video_content" && (c.args[0]?.[0] as any)?.status === "failed")).toBe(false);
  });
});

describe("countFailedAttempts", () => {
  it("doesn't count quota / rate-limit failures against a video", async () => {
    mockSupabase(() => ({
      data: [
        { video_id: "v1", error: "All candidate Gemini models failed for video yt (gemini-3-flash-preview: 429 You exceeded your current quota)" },
        { video_id: "v1", error: "Saving questions failed: boom" },
        { video_id: "v2", error: "All candidate Gemini models failed for video yt (gemini-2.5-flash: 429 RESOURCE_EXHAUSTED)" },
      ],
    }));
    const counts = await countFailedAttempts(createAdminClient(), ["v1", "v2"]);
    expect(counts.get("v1")).toBe(1);
    expect(counts.get("v2")).toBeUndefined();
  });
});
