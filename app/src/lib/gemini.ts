import { GoogleGenAI } from "@google/genai";
import { YoutubeTranscript } from "youtube-transcript";
import { z } from "zod";
import { createAdminClient } from "./supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;
import { shuffleQuestionOptions } from "./quiz-shuffle";

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables");
  }
  return new GoogleGenAI({ apiKey });
}

const QuestionSchema = z.object({
  topic: z.string().default("General"),
  text: z.string(),
  options: z.array(z.string()).length(4),
  correct_index: z.number().int().min(0).max(3),
  explanation: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  timestamp_sec: z.number().int().optional().default(0),
});

const FlashcardSchema = z.object({
  topic: z.string().default("General"),
  front: z.string(),
  back: z.string(),
});

const GeneratedContentSchema = z.object({
  summary: z.string(),
  topics: z.array(z.string()).default([]),
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
});

const TopUpSchema = z.object({
  questions: z.array(QuestionSchema),
});

export type GeneratedContent = z.infer<typeof GeneratedContentSchema>;

/**
 * - `ready`: generated and saved by this call
 * - `skipped`: nothing to do (already ready, being generated elsewhere, or out of attempts)
 * - `failed`: this attempt failed (the error is logged in `generation_jobs`)
 */
export type GenerationResult =
  | { status: "ready"; content: GeneratedContent }
  | { status: "skipped" }
  | { status: "failed" };

/** Like GenerationResult, for topUpQuestionsForVideo: `added` = questions saved by this call */
export type TopUpResult = { status: "ready"; added: number } | { status: "skipped" } | { status: "failed" };

export interface GenerationOptions {
  /** Don't try a video that already failed this many times (background runs; chapter visits omit it) */
  maxFailedAttempts?: number;
}

/**
 * `video_content.prompt_version`: "v2" = the video has its full question set (questionTarget).
 * "v1" videos were generated with 5-15 questions and are topped up by topUpQuestionsForVideo;
 * "v2-topup" marks a top-up in progress (the claim; `generated_at` then holds the claim time).
 */
const PROMPT_VERSION = "v2";
const LEGACY_PROMPT_VERSION = "v1";
const TOPUP_PROMPT_VERSION = "v2-topup";

/** Every video gets at least this many questions; the chapter quiz asks a few at a time */
export const MIN_QUESTIONS_PER_VIDEO = 20;
const MAX_QUESTIONS_PER_VIDEO = 30;

/** About 1 question per 2 minutes of video, at least MIN_QUESTIONS_PER_VIDEO */
export function questionTarget(durationSec: number): number {
  return Math.max(MIN_QUESTIONS_PER_VIDEO, Math.min(MAX_QUESTIONS_PER_VIDEO, Math.floor(durationSec / 120)));
}

/** True for a ready video whose question set predates v2 (fewer questions than the target) */
export function needsQuestionTopUp(content: { status?: string; prompt_version?: string | null } | null | undefined): boolean {
  return content?.status === "ready" && content.prompt_version !== PROMPT_VERSION;
}

/** A pending claim older than this was abandoned (e.g. the server restarted mid-run) */
const STALE_CLAIM_MS = 10 * 60 * 1000;

/**
 * Generates summary, topics, active recall questions, and flashcards for a video.
 * Uses YouTube transcript if available, falls back to metadata (title/description).
 * Content is shared: every user enrolled in the playlist sees the same questions.
 */
// Generation runs in flight in this server process, keyed by video DB id, so a chapter opened
// repeatedly while pending doesn't even query the claim. The DB claim (claimVideo) is what
// prevents duplicate generation across server processes.
const inFlightGenerations = new Map<string, Promise<GenerationResult>>();
const inFlightTopUps = new Map<string, Promise<TopUpResult>>();

export function generateContentForVideo(
  videoDbId: string,
  youtubeVideoId: string,
  title: string,
  description: string,
  durationSec: number,
  options: GenerationOptions = {}
): Promise<GenerationResult> {
  const existing = inFlightGenerations.get(videoDbId);
  if (existing) return existing;

  const run = runGeneration(videoDbId, youtubeVideoId, title, description, durationSec, options).finally(
    () => inFlightGenerations.delete(videoDbId)
  );
  inFlightGenerations.set(videoDbId, run);
  return run;
}

/**
 * Adds questions to a ready video generated before v2 until it has questionTarget() of them,
 * asking Gemini for new ones that don't repeat the existing set. Summary and flashcards are
 * untouched. Claimed in the DB like a full generation (claimTopUp), so it never runs twice.
 */
export function topUpQuestionsForVideo(
  videoDbId: string,
  youtubeVideoId: string,
  title: string,
  description: string,
  durationSec: number,
  options: GenerationOptions = {}
): Promise<TopUpResult> {
  const existing = inFlightTopUps.get(videoDbId);
  if (existing) return existing;

  const run = runTopUp(videoDbId, youtubeVideoId, title, description, durationSec, options).finally(
    () => inFlightTopUps.delete(videoDbId)
  );
  inFlightTopUps.set(videoDbId, run);
  return run;
}

/** Failed generation attempts per video, from the `generation_jobs` log */
export async function countFailedAttempts(supabase: AdminClient, videoIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (videoIds.length === 0) return counts;
  const { data, error } = await supabase
    .from("generation_jobs")
    .select("video_id")
    .in("video_id", videoIds)
    .eq("status", "failed");
  if (error) throw error;
  for (const row of data || []) counts.set(row.video_id, (counts.get(row.video_id) ?? 0) + 1);
  return counts;
}

/**
 * Atomically claims a video for generation, so concurrent requests and other server processes
 * never generate it (and insert its questions) twice. Claimable: no content row yet, a failed
 * run, or a pending run abandoned for over STALE_CLAIM_MS. While pending, `generated_at` holds
 * the claim time.
 */
async function claimVideo(supabase: AdminClient, videoDbId: string): Promise<boolean> {
  const now = new Date().toISOString();

  // No row yet: insert-or-ignore on the unique video_id returns the row only if we inserted it
  const { data: inserted, error: insertErr } = await supabase
    .from("video_content")
    .upsert(
      { video_id: videoDbId, status: "pending", prompt_version: PROMPT_VERSION, generated_at: now },
      { onConflict: "video_id", ignoreDuplicates: true }
    )
    .select("video_id");
  if (insertErr) throw insertErr;
  if (inserted && inserted.length > 0) return true;

  // Existing row: a conditional update only returns the row if it matched (and so was claimed)
  const staleBefore = new Date(Date.now() - STALE_CLAIM_MS).toISOString();
  const { data: reclaimed, error: updateErr } = await supabase
    .from("video_content")
    .update({ status: "pending", generated_at: now })
    .eq("video_id", videoDbId)
    .or(
      `status.eq.failed,and(status.eq.pending,generated_at.is.null),and(status.eq.pending,generated_at.lt."${staleBefore}")`
    )
    .select("video_id");
  if (updateErr) throw updateErr;
  return !!reclaimed && reclaimed.length > 0;
}

/**
 * Claims a ready pre-v2 video for a question top-up. `status` stays ready (its quiz keeps
 * working); only `prompt_version` moves to TOPUP_PROMPT_VERSION. A top-up abandoned for over
 * STALE_CLAIM_MS can be claimed again.
 */
async function claimTopUp(supabase: AdminClient, videoDbId: string): Promise<boolean> {
  const staleBefore = new Date(Date.now() - STALE_CLAIM_MS).toISOString();
  const { data, error } = await supabase
    .from("video_content")
    .update({ prompt_version: TOPUP_PROMPT_VERSION, generated_at: new Date().toISOString() })
    .eq("video_id", videoDbId)
    .eq("status", "ready")
    .or(
      `prompt_version.is.null,prompt_version.eq.${LEGACY_PROMPT_VERSION},and(prompt_version.eq."${TOPUP_PROMPT_VERSION}",generated_at.lt."${staleBefore}")`
    )
    .select("video_id");
  if (error) throw error;
  return !!data && data.length > 0;
}

async function startJob(supabase: AdminClient, videoDbId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("generation_jobs")
    .insert({ video_id: videoDbId, status: "processing", attempts: 1, started_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error) console.error(`Could not log generation job for video ${videoDbId}:`, error.message);
  return data?.id ?? null;
}

/** Gemini token usage of the call whose response was used (billed even if the run later fails) */
interface TokenUsage {
  model: string;
  input_tokens: number;
  output_tokens: number;
}

async function finishJob(
  supabase: AdminClient,
  jobId: string | null,
  fields: { status: "completed" | "failed"; source_tried?: string; error?: string },
  usage: TokenUsage | null
) {
  if (!jobId) return;
  const update = { ...fields, finished_at: new Date().toISOString() };
  let { error } = await supabase
    .from("generation_jobs")
    .update(usage ? { ...update, ...usage } : update)
    .eq("id", jobId);
  // Token columns come from the admin-page migration; still record the outcome without them
  if (error && usage && /input_tokens|output_tokens|model/.test(error.message)) {
    ({ error } = await supabase.from("generation_jobs").update(update).eq("id", jobId));
  }
  if (error) console.error(`Could not update generation job ${jobId}:`, error.message);
}

async function hasRows(supabase: AdminClient, table: "questions" | "flashcards", videoDbId: string) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("video_id", videoDbId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

type VideoSource = "transcript_api" | "pasted" | "gemini_url" | "none";

/** The video's timestamped transcript, or its title/description when there is none */
async function loadVideoContext(
  youtubeVideoId: string,
  title: string,
  description: string,
  durationSec: number
): Promise<{ source: VideoSource; inputContext: string }> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(youtubeVideoId);
    if (transcript && transcript.length > 0) {
      return {
        source: "transcript_api",
        inputContext: transcript.map((item) => `[${Math.floor(item.offset / 1000)}s] ${item.text}`).join("\n"),
      };
    }
  } catch {
    // Transcript unavailable (disabled by creator or music only)
  }
  return {
    source: "none",
    inputContext: `Video Title: ${title}\nDuration: ${Math.floor(durationSec / 60)} minutes\nDescription:\n${description}`,
  };
}

/** MCQ rules shared by the full-generation and top-up prompts */
const QUESTION_RULES = `   - Each question must test comprehension, practical syntax, or problem-solving (avoid trivial trivia).
   - Each question MUST have exactly 4 plausible options.
   - correct_index must be the 0-based index (0, 1, 2, or 3) of the correct option.
   - explanation must clearly explain why the correct option is right and the others are wrong.
   - Options are shuffled after generation: never prefix options with letters ("A)", "B.") and never refer to options by letter or position in the explanation ("Option B", "the first option") — refer to them by their content instead. Do not use "All of the above" / "None of the above" options.
   - timestamp_sec: the second mark in the video where this concept is taught (estimate from context if not exact).
   - Every question must test something different, and together they should cover the whole video, not just its start.`;

const QUESTION_JSON_EXAMPLE = `    {
      "topic": "topic name",
      "text": "Question text?",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0,
      "explanation": "...",
      "difficulty": "medium",
      "timestamp_sec": 120
    }`;

const CANDIDATE_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
];

/** Calls Gemini with a fallback cascade over CANDIDATE_MODELS and returns the parsed JSON */
async function callGemini(prompt: string, youtubeVideoId: string): Promise<{ json: unknown; usage: TokenUsage }> {
  // Kept in the final error, so the admin page can tell quota/rate-limit failures (429) apart
  const modelErrors: string[] = [];
  const ai = getAIClient();

  for (const model of CANDIDATE_MODELS) {
    let text: string | undefined;
    let usage: TokenUsage;
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });
      text = response?.text;
      const meta = response?.usageMetadata;
      usage = {
        model,
        input_tokens: meta?.promptTokenCount ?? 0,
        // Thinking tokens are billed as output
        output_tokens: (meta?.candidatesTokenCount ?? 0) + (meta?.thoughtsTokenCount ?? 0),
      };
    } catch (err: any) {
      modelErrors.push(`${model}: ${err.status ?? ""} ${String(err.message ?? "").slice(0, 120)}`.trim());
      console.warn(`Model ${model} failed for ${youtubeVideoId} (${err.status || err.message?.slice(0, 80)}). Trying fallback...`);
      continue;
    }
    if (!text) continue;

    let json = JSON.parse(text);
    // If Gemini wrapped it in markdown code blocks, clean it
    if (typeof json === "string") {
      json = JSON.parse(json);
    }
    return { json, usage };
  }

  throw new Error(
    `All candidate Gemini models failed for video ${youtubeVideoId}${modelErrors.length ? ` (${modelErrors.join("; ")})` : ""}`
  );
}

/** Rows for `questions`, with options shuffled (the model puts the correct answer first far more often than chance) */
function questionRows(videoDbId: string, questions: z.infer<typeof QuestionSchema>[]) {
  return questions.map((q) => shuffleQuestionOptions(q)).map((q) => ({
    video_id: videoDbId,
    topic: q.topic,
    text: q.text,
    options: q.options,
    correct_index: q.correct_index,
    explanation: q.explanation,
    difficulty: q.difficulty,
    timestamp_sec: q.timestamp_sec,
    status: "active",
  }));
}

/** Question text compared loosely, to drop a top-up question that repeats an existing one */
const normalizeQuestionText = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

async function runGeneration(
  videoDbId: string,
  youtubeVideoId: string,
  title: string,
  description: string,
  durationSec: number,
  options: GenerationOptions
): Promise<GenerationResult> {
  const supabase = createAdminClient();
  let claimed = false;
  let jobId: string | null = null;
  let source: VideoSource = "none";
  let usage: TokenUsage | null = null;

  try {
    if (options.maxFailedAttempts !== undefined) {
      const failed = (await countFailedAttempts(supabase, [videoDbId])).get(videoDbId) ?? 0;
      if (failed >= options.maxFailedAttempts) return { status: "skipped" };
    }

    // 1. Claim the video (marks video_content pending); skip if it's ready or being generated
    claimed = await claimVideo(supabase, videoDbId);
    if (!claimed) return { status: "skipped" };
    jobId = await startJob(supabase, videoDbId);

    // 2. Fetch transcript if available
    const context = await loadVideoContext(youtubeVideoId, title, description, durationSec);
    source = context.source;

    const prompt = `You are an expert curriculum designer and educator creating an active recall study system for students.
Analyze this video content and generate:
1. A concise, structured 2-3 paragraph study summary of the video.
2. A list of 3-6 core topics/concepts covered.
3. Exactly ${questionTarget(durationSec)} high quality, challenging Multiple Choice Questions (MCQs) for end-of-chapter active recall:
${QUESTION_RULES}
4. Exactly 5 flashcards (front: conceptual prompt or question, back: concise, clear answer).

Return ONLY valid JSON matching this exact structure:
{
  "summary": "...",
  "topics": ["topic 1", "topic 2"],
  "questions": [
${QUESTION_JSON_EXAMPLE}
  ],
  "flashcards": [
    {
      "topic": "topic name",
      "front": "...",
      "back": "..."
    }
  ]
}

Content Input:
${context.inputContext.slice(0, 80000)}
`;

    // 3. Call Gemini with cascade fallback across active models
    const gemini = await callGemini(prompt, youtubeVideoId);
    usage = gemini.usage;
    const validated = GeneratedContentSchema.parse(gemini.json);

    // 4. Save questions and flashcards, then mark the content ready. A video only ever gets one
    //    set: if an earlier, interrupted run already saved questions or flashcards, keep those.
    const [hasQuestions, hasFlashcards] = await Promise.all([
      hasRows(supabase, "questions", videoDbId),
      hasRows(supabase, "flashcards", videoDbId),
    ]);

    if (!hasQuestions && validated.questions.length > 0) {
      const { error: qErr } = await supabase.from("questions").insert(questionRows(videoDbId, validated.questions));
      if (qErr) throw new Error(`Saving questions failed: ${qErr.message}`);
    }

    if (!hasFlashcards && validated.flashcards.length > 0) {
      const flashcardsToInsert = validated.flashcards.map((f) => ({
        video_id: videoDbId,
        topic: f.topic,
        front: f.front,
        back: f.back,
        status: "active",
      }));
      const { error: fErr } = await supabase.from("flashcards").insert(flashcardsToInsert);
      if (fErr) throw new Error(`Saving flashcards failed: ${fErr.message}`);
    }

    const { error: contentErr } = await supabase.from("video_content").upsert(
      {
        video_id: videoDbId,
        summary: validated.summary,
        topics: validated.topics,
        source,
        status: "ready",
        model: usage.model,
        // Questions kept from an interrupted earlier run may be fewer than the target: top them up later
        prompt_version: hasQuestions ? LEGACY_PROMPT_VERSION : PROMPT_VERSION,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "video_id" }
    );
    if (contentErr) throw new Error(`Saving summary failed: ${contentErr.message}`);

    await finishJob(supabase, jobId, { status: "completed", source_tried: source }, usage);
    return { status: "ready", content: validated };
  } catch (error: any) {
    console.error(`Failed to generate content for video ${youtubeVideoId}:`, error);
    if (!claimed) return { status: "failed" };

    await supabase.from("video_content").upsert(
      {
        video_id: videoDbId,
        status: "failed",
        source: "none",
        prompt_version: PROMPT_VERSION,
      },
      { onConflict: "video_id" }
    );
    await finishJob(supabase, jobId, {
      status: "failed",
      source_tried: source,
      error: String(error?.message || error).slice(0, 1000),
    }, usage);

    return { status: "failed" };
  }
}

async function runTopUp(
  videoDbId: string,
  youtubeVideoId: string,
  title: string,
  description: string,
  durationSec: number,
  options: GenerationOptions
): Promise<TopUpResult> {
  const supabase = createAdminClient();
  let claimed = false;
  let jobId: string | null = null;
  let source: VideoSource = "none";
  let usage: TokenUsage | null = null;

  /** Ends the claim: v2 once the set is complete, back to v1 (retry later) on failure */
  const release = async (promptVersion: string) => {
    const { error } = await supabase
      .from("video_content")
      .update({ prompt_version: promptVersion, generated_at: new Date().toISOString() })
      .eq("video_id", videoDbId);
    if (error) throw new Error(`Saving top-up state failed: ${error.message}`);
  };

  try {
    if (options.maxFailedAttempts !== undefined) {
      const failed = (await countFailedAttempts(supabase, [videoDbId])).get(videoDbId) ?? 0;
      if (failed >= options.maxFailedAttempts) return { status: "skipped" };
    }

    claimed = await claimTopUp(supabase, videoDbId);
    if (!claimed) return { status: "skipped" };

    const { data: existingRows, error: existingErr } = await supabase
      .from("questions")
      .select("text")
      .eq("video_id", videoDbId)
      .eq("status", "active");
    if (existingErr) throw existingErr;
    const existingTexts = (existingRows || []).map((q) => q.text as string);
    const missing = questionTarget(durationSec) - existingTexts.length;
    if (missing <= 0) {
      await release(PROMPT_VERSION);
      return { status: "ready", added: 0 };
    }

    jobId = await startJob(supabase, videoDbId);
    const context = await loadVideoContext(youtubeVideoId, title, description, durationSec);
    source = context.source;

    const prompt = `You are an expert curriculum designer and educator creating an active recall study system for students.
This video already has these quiz questions:
${existingTexts.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Write exactly ${missing} NEW high quality, challenging Multiple Choice Questions (MCQs) for end-of-chapter active recall about this video:
   - Do not repeat or rephrase any existing question above: test other concepts, or other aspects of the same concepts.
${QUESTION_RULES}

Return ONLY valid JSON matching this exact structure:
{
  "questions": [
${QUESTION_JSON_EXAMPLE}
  ]
}

Content Input:
${context.inputContext.slice(0, 80000)}
`;

    const gemini = await callGemini(prompt, youtubeVideoId);
    usage = gemini.usage;
    const validated = TopUpSchema.parse(gemini.json);

    const seen = new Set(existingTexts.map(normalizeQuestionText));
    const fresh = validated.questions
      .filter((q) => {
        const key = normalizeQuestionText(q.text);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, missing);
    if (fresh.length === 0) throw new Error("Top-up returned no new questions");

    const { error: qErr } = await supabase.from("questions").insert(questionRows(videoDbId, fresh));
    if (qErr) throw new Error(`Saving questions failed: ${qErr.message}`);
    // A short answer (fewer new questions than asked for) still counts: the set is close enough
    await release(PROMPT_VERSION);

    await finishJob(supabase, jobId, { status: "completed", source_tried: `topup:${source}` }, usage);
    return { status: "ready", added: fresh.length };
  } catch (error: any) {
    console.error(`Failed to top up questions for video ${youtubeVideoId}:`, error);
    if (!claimed) return { status: "failed" };

    await release(LEGACY_PROMPT_VERSION).catch((err) => console.error(err));
    await finishJob(supabase, jobId, {
      status: "failed",
      source_tried: `topup:${source}`,
      error: String(error?.message || error).slice(0, 1000),
    }, usage);

    return { status: "failed" };
  }
}
