import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-helpers")>()),
  getEffectiveUserId: vi.fn().mockResolvedValue("test-user-id-123"),
}));

vi.mock("@/lib/gemini", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/gemini")>()),
  generateContentForVideo: vi.fn().mockResolvedValue({ status: "skipped" }),
}));

vi.mock("@/lib/generation-queue", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/generation-queue")>()),
  generatePlaylistContent: vi.fn().mockResolvedValue(undefined),
}));

import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveUserId } from "@/lib/auth-helpers";
import { generateContentForVideo } from "@/lib/gemini";
import { generatePlaylistContent } from "@/lib/generation-queue";
import { GET as getCourse } from "../courses/[id]/route";
import { GET as getChapter } from "../courses/[id]/chapters/[videoId]/route";
import { GET as getQuiz } from "../courses/[id]/quiz/route";

/** Run the callbacks the route handed to after() */
const runAfterCallbacks = () => (after as any).mock.calls.forEach(([callback]: [() => unknown]) => callback());

// Chainable PostgREST-style query builder: every filter returns the builder, and awaiting it
// resolves to the canned result for that table.
function mockSupabase(results: Record<string, { data: any; error?: any }>) {
  const from = vi.fn((table: string) => {
    const result = { error: null, ...(results[table] || { data: null }) };
    const builder: any = {
      then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
    };
    for (const m of ["select", "eq", "in", "order", "limit", "single", "maybeSingle", "update"]) {
      builder[m] = vi.fn(() => builder);
    }
    return builder;
  });
  (createAdminClient as any).mockReturnValue({ from });
  return from;
}

const video = (id: string, position: number, extra: Record<string, any> = {}) => ({
  id,
  youtube_video_id: `yt-${id}`,
  position,
  title: `Chapter ${position}`,
  duration_sec: 600,
  description: "",
  status: "active",
  ...extra,
});

describe("GET /api/courses/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  const params = Promise.resolve({ id: "course-1" });

  it("returns 401 without querying the database when nobody is signed in", async () => {
    (getEffectiveUserId as any).mockResolvedValueOnce(null);
    const from = mockSupabase({});
    const res = await getCourse(new NextRequest("http://localhost/api/courses/course-1"), { params });
    expect(res.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("returns 404 when the course does not belong to the user", async () => {
    mockSupabase({ courses: { data: null, error: { message: "not found" } } });
    const res = await getCourse(new NextRequest("http://localhost/api/courses/course-1"), { params });
    expect(res.status).toBe(404);
  });

  it("builds chapters from the nested playlist query, sorted by position", async () => {
    mockSupabase({
      courses: {
        data: {
          id: "course-1",
          name: "Course",
          quizzes_enabled: true,
          flashcards_enabled: true,
          deadline_date: null,
          playlist_id: "pl-1",
          playlists: {
            title: "Playlist",
            youtube_playlist_id: "PL123",
            videos: [
              video("v2", 2, { description: "Line one\n\nLine   two", video_content: [{ status: "failed" }], video_resources: [] }),
              video("v1", 1, {
                video_content: { status: "ready", prompt_version: "v2" },
                video_resources: [
                  { id: "r1", video_id: "v1", url: "https://docs.example.com/guide", label: "Guide", domain: "docs.example.com", category: "docs" },
                ],
              }),
              video("v3", 3, { video_content: null, video_resources: [] }),
            ],
          },
        },
      },
      chapter_progress: { data: [{ video_id: "v1", status: "completed", last_position_sec: 600, watched_seconds: 600 }] },
      notes: { data: [{ video_id: "v2", content: { type: "doc" } }] },
    });

    const res = await getCourse(new NextRequest("http://localhost/api/courses/course-1"), { params });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.chapters.map((c: any) => c.id)).toEqual(["v1", "v2", "v3"]);
    expect(body.chapters.map((c: any) => c.quizStatus)).toEqual(["ready", "failed", "pending"]);
    expect(body.chapters[1].description).toBe("Line one Line two");
    expect(body.chapters[0].status).toBe("completed");
    expect(body.chapters[1].notes).toEqual({ type: "doc" });
    expect(body.course.thumbnailUrl).toBe("https://img.youtube.com/vi/yt-v1/hqdefault.jpg");
    expect(body.course).toMatchObject({ totalChapters: 3, completedChapters: 1, progressPercent: 33 });
    expect(body.resources.map((r: any) => r.id)).toEqual(["r1"]);

    // v2 failed and v3 has no content: the rest of the playlist is generated in the background
    expect(after).toHaveBeenCalledTimes(1);
    runAfterCallbacks();
    expect(generatePlaylistContent).toHaveBeenCalledWith("pl-1");
  });

  it("doesn't start playlist generation on a hover prefetch or when every chapter is ready", async () => {
    const course = (videos: any[]) => ({
      courses: { data: { id: "course-1", name: "Course", playlist_id: "pl-1", playlists: { title: "P", videos } } },
    });

    mockSupabase(course([video("v1", 1, { video_content: null, video_resources: [] })]));
    await getCourse(new NextRequest("http://localhost/api/courses/course-1", { headers: { "x-prefetch": "1" } }), { params });
    expect(after).not.toHaveBeenCalled();

    mockSupabase(course([video("v1", 1, { video_content: { status: "ready", prompt_version: "v2" }, video_resources: [] })]));
    await getCourse(new NextRequest("http://localhost/api/courses/course-1"), { params });
    expect(after).not.toHaveBeenCalled();
  });

  it("starts the playlist run for a ready video whose question set predates v2 (top-up)", async () => {
    mockSupabase({
      courses: {
        data: {
          id: "course-1",
          name: "Course",
          playlist_id: "pl-1",
          playlists: { title: "P", videos: [video("v1", 1, { video_content: { status: "ready", prompt_version: "v1" }, video_resources: [] })] },
        },
      },
    });
    await getCourse(new NextRequest("http://localhost/api/courses/course-1"), { params });
    expect(after).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/courses/[id]/chapters/[videoId]", () => {
  beforeEach(() => vi.clearAllMocks());

  const courseRow = {
    id: "course-1",
    name: "Course",
    quizzes_enabled: true,
    flashcards_enabled: true,
    playlist_id: "pl-1",
    last_accessed_at: new Date().toISOString(),
    playlists: {
      videos: [3, 1, 2].map((n) => video(`v${n}`, n, { video_content: { status: "ready", prompt_version: "v2" } })),
    },
  };

  const request = (videoId: string, headers?: Record<string, string>) =>
    getChapter(
      new NextRequest(`http://localhost/api/courses/course-1/chapters/${videoId}`, { headers }),
      { params: Promise.resolve({ id: "course-1", videoId }) }
    );

  it("returns 404 when the video is not part of the course", async () => {
    mockSupabase({ courses: { data: courseRow } });
    const res = await request("other-video");
    expect(res.status).toBe(404);
  });

  it("returns the chapter with prev/next navigation and its own note", async () => {
    mockSupabase({
      courses: { data: courseRow },
      chapter_progress: { data: [{ video_id: "v2", status: "in_progress", last_position_sec: 42, watched_seconds: 50 }] },
      notes: { data: [{ video_id: "v1", content: "a", version: 1 }, { video_id: "v2", content: "b", version: 3 }] },
      video_content: { data: { status: "ready", summary: "Summary", topics: [] } },
      video_resources: { data: [] },
    });

    const res = await request("v2");
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.chapter).toMatchObject({ id: "v2", position: 2, totalChapters: 3, lastPositionSec: 42, quizReady: true, contentStatus: "ready", summary: "Summary" });
    expect(body.navigation.prev).toMatchObject({ id: "v1", position: 1 });
    expect(body.navigation.next).toMatchObject({ id: "v3", position: 3 });
    expect(body.notes).toEqual({ content: "b", version: 3 });
    expect(body.chaptersList.map((c: any) => c.id)).toEqual(["v1", "v2", "v3"]);
    expect(after).not.toHaveBeenCalled();
  });

  it("schedules generation after the response when content is pending", async () => {
    mockSupabase({ courses: { data: courseRow }, video_content: { data: { status: "pending" } } });
    await request("v1");
    expect(after).toHaveBeenCalledTimes(1);
  });

  it("retries failed generation on a real visit but not on a prefetch", async () => {
    mockSupabase({ courses: { data: courseRow }, video_content: { data: { status: "failed" } } });

    await request("v1", { "x-prefetch": "1" });
    expect(after).not.toHaveBeenCalled();

    await request("v1");
    expect(after).toHaveBeenCalledTimes(1);
  });

  it("generates the rest of the playlist starting from the current chapter", async () => {
    const row = {
      ...courseRow,
      playlists: {
        videos: [
          video("v1", 1, { video_content: { status: "ready", prompt_version: "v2" } }),
          video("v2", 2, { video_content: { status: "ready", prompt_version: "v2" } }),
          video("v3", 3, { video_content: null }),
        ],
      },
    };
    mockSupabase({ courses: { data: row }, video_content: { data: { status: "ready" } } });

    await request("v2", { "x-prefetch": "1" });
    expect(after).not.toHaveBeenCalled();

    await request("v2");
    expect(after).toHaveBeenCalledTimes(1);
    runAfterCallbacks();
    expect(generatePlaylistContent).toHaveBeenCalledWith("pl-1", 2);
  });
});

describe("GET /api/courses/[id]/quiz", () => {
  beforeEach(() => vi.clearAllMocks());

  const videoRow = { id: "v1", youtube_video_id: "yt-v1", title: "Chapter 1", description: "", duration_sec: 600 };
  const request = (query: string) =>
    getQuiz(new NextRequest(`http://localhost/api/courses/course-1/quiz?${query}`), {
      params: Promise.resolve({ id: "course-1" }),
    });

  it("returns the questions with their answers and explanations", async () => {
    const q = { id: "q1", text: "Q?", options: ["a", "b", "c", "d"], correct_index: 2, explanation: "Because" };
    mockSupabase({ questions: { data: [q] }, video_content: { data: { status: "ready" } }, videos: { data: videoRow } });

    const body = await (await request("videoId=v1")).json();
    expect(body).toMatchObject({ contentStatus: "ready", count: 1 });
    expect(body.questions[0]).toMatchObject({ correct_index: 2, explanation: "Because" });
    expect(after).not.toHaveBeenCalled();
  });

  it("asks 5 questions, the ones this learner hasn't answered before first", async () => {
    const qs = Array.from({ length: 8 }, (_, i) => ({
      id: `q${i}`,
      text: `Q${i}?`,
      options: ["a", "b", "c", "d"],
      correct_index: 0,
      explanation: "E",
      timestamp_sec: 100 - i,
      // q0-q2 were answered in an earlier attempt
      answers: i < 3 ? [{ answered_at: "2026-10-01T00:00:00Z" }] : [],
    }));
    mockSupabase({ questions: { data: qs }, video_content: { data: { status: "ready" } }, videos: { data: videoRow } });

    const body = await (await request("videoId=v1")).json();
    expect(body.count).toBe(5);
    expect(body.questions.map((q: any) => q.id).sort()).toEqual(["q3", "q4", "q5", "q6", "q7"]);
    expect(body.questions[0]).not.toHaveProperty("answers");
  });

  it("retries a failed generation when the learner reaches the quiz, but polling only checks", async () => {
    mockSupabase({ questions: { data: [] }, video_content: { data: { status: "failed" } }, videos: { data: videoRow } });

    const body = await (await request("videoId=v1")).json();
    expect(body.contentStatus).toBe("generating");
    expect(after).toHaveBeenCalledTimes(1);
    runAfterCallbacks();
    expect(generateContentForVideo).toHaveBeenCalledWith("v1", "yt-v1", "Chapter 1", "", 600);

    vi.clearAllMocks();
    const polled = await (await request("videoId=v1&poll=1")).json();
    expect(polled.contentStatus).toBe("unavailable");
    expect(after).not.toHaveBeenCalled();
  });

  it("reports a pending generation as generating while polling", async () => {
    mockSupabase({ questions: { data: [] }, video_content: { data: { status: "pending" } }, videos: { data: videoRow } });
    const body = await (await request("videoId=v1&poll=1")).json();
    expect(body.contentStatus).toBe("generating");
  });
});
