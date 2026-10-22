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

export interface GenerationOptions {
  /** Don't try a video that already failed this many times (background runs; chapter visits omit it) */
  maxFailedAttempts?: number;
}

const PROMPT_VERSION = "v1";

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
  let source: "transcript_api" | "pasted" | "gemini_url" | "none" = "none";
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
    let inputContext = "";

    try {
      const transcript = await YoutubeTranscript.fetchTranscript(youtubeVideoId);
      if (transcript && transcript.length > 0) {
        source = "transcript_api";
        // Convert transcript items into timestamped text (sample every 15-30s to keep it compact and readable)
        inputContext = transcript
          .map((item) => `[${Math.floor(item.offset / 1000)}s] ${item.text}`)
          .join("\n");
      }
    } catch {
      // Transcript unavailable (disabled by creator or music only)
    }

    if (!inputContext) {
      source = "none";
      inputContext = `Video Title: ${title}\nDuration: ${Math.floor(
        durationSec / 60
      )} minutes\nDescription:\n${description}`;
    }

    // Determine how many questions to generate (about 1 per 2 minutes of video, capped at 15 for fast MVP)
    const targetQuestionCount = Math.max(5, Math.min(15, Math.floor(durationSec / 120)));

    const prompt = `You are an expert curriculum designer and educator creating an active recall study system for students.
Analyze this video content and generate:
1. A concise, structured 2-3 paragraph study summary of the video.
2. A list of 3-6 core topics/concepts covered.
3. Exactly ${targetQuestionCount} high quality, challenging Multiple Choice Questions (MCQs) for end-of-chapter active recall:
   - Each question must test comprehension, practical syntax, or problem-solving (avoid trivial trivia).
   - Each question MUST have exactly 4 plausible options.
   - correct_index must be the 0-based index (0, 1, 2, or 3) of the correct option.
   - explanation must clearly explain why the correct option is right and the others are wrong.
   - Options are shuffled after generation: never prefix options with letters ("A)", "B.") and never refer to options by letter or position in the explanation ("Option B", "the first option") — refer to them by their content instead. Do not use "All of the above" / "None of the above" options.
   - timestamp_sec: the second mark in the video where this concept is taught (estimate from context if not exact).
4. Exactly 5 flashcards (front: conceptual prompt or question, back: concise, clear answer).

Return ONLY valid JSON matching this exact structure:
{
  "summary": "...",
  "topics": ["topic 1", "topic 2"],
  "questions": [
    {
      "topic": "topic name",
      "text": "Question text?",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0,
      "explanation": "...",
      "difficulty": "medium",
      "timestamp_sec": 120
    }
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
${inputContext.slice(0, 80000)}
`;

    // 3. Call Gemini with cascade fallback across active models
    const CANDIDATE_MODELS = [
      "gemini-3-flash-preview",
      "gemini-3.5-flash",
      "gemini-2.5-flash",
    ];

    let responseText = "";
    let usedModel = CANDIDATE_MODELS[0];
    // Kept in the final error, so the admin page can tell quota/rate-limit failures (429) apart
    const modelErrors: string[] = [];
    const ai = getAIClient();

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });
        if (response?.text) {
          responseText = response.text;
          usedModel = model;
          const meta = response.usageMetadata;
          usage = {
            model,
            input_tokens: meta?.promptTokenCount ?? 0,
            // Thinking tokens are billed as output
            output_tokens: (meta?.candidatesTokenCount ?? 0) + (meta?.thoughtsTokenCount ?? 0),
          };
          break;
        }
      } catch (err: any) {
        modelErrors.push(`${model}: ${err.status ?? ""} ${String(err.message ?? "").slice(0, 120)}`.trim());
        console.warn(`Model ${model} failed for ${youtubeVideoId} (${err.status || err.message?.slice(0, 80)}). Trying fallback...`);
      }
    }

    if (!responseText) {
      throw new Error(
        `All candidate Gemini models failed for video ${youtubeVideoId}${modelErrors.length ? ` (${modelErrors.join("; ")})` : ""}`
      );
    }
    let parsedJson = JSON.parse(responseText);

    // If Gemini wrapped it in markdown code blocks, clean it
    if (typeof parsedJson === "string") {
      parsedJson = JSON.parse(parsedJson);
    }

    const validated = GeneratedContentSchema.parse(parsedJson);

    // 4. Save questions and flashcards, then mark the content ready. A video only ever gets one
    //    set: if an earlier, interrupted run already saved questions or flashcards, keep those.
    const [hasQuestions, hasFlashcards] = await Promise.all([
      hasRows(supabase, "questions", videoDbId),
      hasRows(supabase, "flashcards", videoDbId),
    ]);

    if (!hasQuestions && validated.questions.length > 0) {
      // Randomize option order: the model puts the correct answer first far more often than chance
      const questionsToInsert = validated.questions.map((q) => shuffleQuestionOptions(q)).map((q) => ({
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
      const { error: qErr } = await supabase.from("questions").insert(questionsToInsert);
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
        model: usedModel,
        prompt_version: PROMPT_VERSION,
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
