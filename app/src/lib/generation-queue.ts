import { createAdminClient } from "./supabase/admin";
import { countFailedAttempts, generateContentForVideo } from "./gemini";

/** Background runs give up on a video after this many failed attempts (a chapter visit still retries it) */
export const MAX_BACKGROUND_ATTEMPTS = 3;

/** Pause between videos so a whole playlist doesn't run into Gemini's per-minute rate limits */
const DELAY_BETWEEN_VIDEOS_MS = 5_000;

/** Longer pause after a failed video: failures are often rate limits */
const DELAY_AFTER_FAILURE_MS = 60_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// One run per playlist in this server process; across processes the per-video claim in
// generateContentForVideo keeps two runs from generating the same video.
const runningPlaylists = new Map<string, Promise<void>>();

/**
 * Generates content for every video in a playlist that doesn't have it yet, one video at a time,
 * so each chapter's quiz exists before the learner reaches it. Starts at `startPosition` (the
 * chapter being watched) and wraps around to the earlier chapters. Content is shared by every
 * user enrolled in the playlist.
 */
export function generatePlaylistContent(playlistDbId: string, startPosition = 1): Promise<void> {
  const existing = runningPlaylists.get(playlistDbId);
  if (existing) return existing;

  const run = runPlaylist(playlistDbId, startPosition)
    .catch((err) => console.error(`Playlist generation failed for ${playlistDbId}:`, err))
    .finally(() => runningPlaylists.delete(playlistDbId));
  runningPlaylists.set(playlistDbId, run);
  return run;
}

async function runPlaylist(playlistDbId: string, startPosition: number) {
  const supabase = createAdminClient();
  const { data: videos, error } = await supabase
    .from("videos")
    .select("id, youtube_video_id, title, description, duration_sec, position, video_content ( status )")
    .eq("playlist_id", playlistDbId)
    .order("position", { ascending: true });
  if (error) throw error;

  const todo = (videos || []).filter((v) => contentStatus(v) !== "ready");
  if (todo.length === 0) return;

  const failedAttempts = await countFailedAttempts(supabase, todo.map((v) => v.id));
  const queue = todo
    .filter((v) => (failedAttempts.get(v.id) ?? 0) < MAX_BACKGROUND_ATTEMPTS)
    // From the current chapter onward first, then the chapters before it
    .sort((a, b) => Number(a.position < startPosition) - Number(b.position < startPosition) || a.position - b.position);

  for (const [i, v] of queue.entries()) {
    const result = await generateContentForVideo(
      v.id,
      v.youtube_video_id,
      v.title,
      v.description || "",
      v.duration_sec,
      { maxFailedAttempts: MAX_BACKGROUND_ATTEMPTS }
    );
    if (i < queue.length - 1 && result.status !== "skipped") {
      await sleep(result.status === "failed" ? DELAY_AFTER_FAILURE_MS : DELAY_BETWEEN_VIDEOS_MS);
    }
  }
}

/** `video_content.status` from a nested `videos ( video_content ( status ) )` select */
function contentStatus(video: { video_content?: unknown }): string | undefined {
  const content = Array.isArray(video.video_content) ? video.video_content[0] : video.video_content;
  return (content as { status?: string } | null | undefined)?.status;
}

/** True when any video from a nested `videos ( video_content ( status ) )` select still needs content */
export function playlistNeedsContent(videos: { video_content?: unknown }[]): boolean {
  return videos.some((v) => contentStatus(v) !== "ready");
}
