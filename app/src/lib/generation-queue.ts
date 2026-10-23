import { createAdminClient } from "./supabase/admin";
import { countFailedAttempts, generateContentForVideo, needsQuestionTopUp, topUpQuestionsForVideo } from "./gemini";

/**
 * Background runs give up on a video after this many failed attempts (a chapter visit still
 * retries it). Quota / rate-limit failures don't count (countFailedAttempts skips them).
 */
export const MAX_BACKGROUND_ATTEMPTS = 3;

/** Pause between videos so a whole playlist doesn't run into Gemini's per-minute rate limits */
const DELAY_BETWEEN_VIDEOS_MS = 5_000;

/** Longer pause after a failed video */
const DELAY_AFTER_FAILURE_MS = 60_000;

/**
 * Out of quota / rate limited (429): wait, then retry the same video (moving on would only hit
 * the same limit). The wait doubles each time up to the cap; after MAX_RATE_LIMIT_WAITS in a row
 * (~45 min, likely a daily quota) the run stops. The next course or chapter visit starts a new one.
 */
export const RATE_LIMIT_WAIT_MS = 60_000;
const RATE_LIMIT_MAX_WAIT_MS = 15 * 60_000;
export const MAX_RATE_LIMIT_WAITS = 6;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// One run per playlist in this server process; across processes the per-video claim in
// generateContentForVideo keeps two runs from generating the same video.
const runningPlaylists = new Map<string, Promise<void>>();

/**
 * Generates content for every video in a playlist that doesn't have it yet, one video at a time,
 * so each chapter's quiz exists before the learner reaches it. Starts at `startPosition` (the
 * chapter being watched) and wraps around to the earlier chapters. Ready videos generated
 * before the 20-question set (prompt v1) get their questions topped up in the same walk.
 * Content is shared by every user enrolled in the playlist.
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
    .select("id, youtube_video_id, title, description, duration_sec, position, video_content ( status, prompt_version )")
    .eq("playlist_id", playlistDbId)
    .order("position", { ascending: true });
  if (error) throw error;

  const todo = (videos || []).filter(videoNeedsWork);
  if (todo.length === 0) return;

  const failedAttempts = await countFailedAttempts(supabase, todo.map((v) => v.id));
  const queue = todo
    .filter((v) => (failedAttempts.get(v.id) ?? 0) < MAX_BACKGROUND_ATTEMPTS)
    // From the current chapter onward first, then the chapters before it
    .sort((a, b) => Number(a.position < startPosition) - Number(b.position < startPosition) || a.position - b.position);

  let rateLimitWaits = 0;
  for (let i = 0; i < queue.length; ) {
    const v = queue[i];
    const generate = contentOf(v)?.status === "ready" ? topUpQuestionsForVideo : generateContentForVideo;
    const result = await generate(
      v.id,
      v.youtube_video_id,
      v.title,
      v.description || "",
      v.duration_sec,
      { maxFailedAttempts: MAX_BACKGROUND_ATTEMPTS }
    );
    if (result.status === "rate_limited") {
      if (rateLimitWaits >= MAX_RATE_LIMIT_WAITS) {
        console.warn(`Playlist ${playlistDbId}: still rate limited after ${rateLimitWaits} waits, stopping for now`);
        return;
      }
      await sleep(Math.min(RATE_LIMIT_WAIT_MS * 2 ** rateLimitWaits, RATE_LIMIT_MAX_WAIT_MS));
      rateLimitWaits++;
      continue;
    }
    rateLimitWaits = 0;
    i++;
    if (i < queue.length && result.status !== "skipped") {
      await sleep(result.status === "failed" ? DELAY_AFTER_FAILURE_MS : DELAY_BETWEEN_VIDEOS_MS);
    }
  }
}

type ContentRow = { status?: string; prompt_version?: string | null };

/** `video_content` from a nested `videos ( video_content ( status, prompt_version ) )` select */
function contentOf(video: { video_content?: unknown }): ContentRow | null | undefined {
  const content = Array.isArray(video.video_content) ? video.video_content[0] : video.video_content;
  return content as ContentRow | null | undefined;
}

/** Content missing or not ready, or ready with a pre-v2 question set that needs topping up */
function videoNeedsWork(video: { video_content?: unknown }): boolean {
  const content = contentOf(video);
  return content?.status !== "ready" || needsQuestionTopUp(content);
}

/** True when any video from a nested `videos ( video_content ( status, prompt_version ) )` select still needs work */
export function playlistNeedsContent(videos: { video_content?: unknown }[]): boolean {
  return videos.some(videoNeedsWork);
}
