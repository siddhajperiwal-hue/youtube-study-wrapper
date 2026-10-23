import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("../gemini", () => ({
  countFailedAttempts: vi.fn().mockResolvedValue(new Map()),
  generateContentForVideo: vi.fn(),
  topUpQuestionsForVideo: vi.fn(),
  needsQuestionTopUp: (c: { status?: string; prompt_version?: string } | null) => c?.status === "ready" && c.prompt_version !== "v2",
}));

import { createAdminClient } from "../supabase/admin";
import { generateContentForVideo } from "../gemini";
import { generatePlaylistContent, MAX_RATE_LIMIT_WAITS } from "../generation-queue";

const video = (id: string, position: number) => ({
  id,
  youtube_video_id: `yt-${id}`,
  title: id,
  description: "",
  duration_sec: 600,
  position,
  video_content: null,
});

function mockVideos(videos: ReturnType<typeof video>[]) {
  const builder: any = { then: (resolve: any) => Promise.resolve({ data: videos, error: null }).then(resolve) };
  for (const m of ["select", "eq", "order"]) builder[m] = vi.fn(() => builder);
  (createAdminClient as any).mockReturnValue({ from: vi.fn(() => builder) });
}

const calledIds = () => (generateContentForVideo as any).mock.calls.map((c: unknown[]) => c[0]);

describe("generatePlaylistContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("waits and retries the same video when rate limited, instead of moving on", async () => {
    mockVideos([video("v1", 1), video("v2", 2)]);
    (generateContentForVideo as any)
      .mockResolvedValueOnce({ status: "rate_limited" })
      .mockResolvedValueOnce({ status: "rate_limited" })
      .mockResolvedValue({ status: "ready" });

    const run = generatePlaylistContent("pl-1");
    await vi.runAllTimersAsync();
    await run;

    expect(calledIds()).toEqual(["v1", "v1", "v1", "v2"]);
  });

  it("stops the run after too many rate-limit waits in a row", async () => {
    mockVideos([video("v1", 1), video("v2", 2)]);
    (generateContentForVideo as any).mockResolvedValue({ status: "rate_limited" });

    const run = generatePlaylistContent("pl-2");
    await vi.runAllTimersAsync();
    await run;

    expect(calledIds()).toEqual(Array(MAX_RATE_LIMIT_WAITS + 1).fill("v1"));
  });
});
