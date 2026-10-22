import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { mergeSettings } from "@/lib/admin/settings";
import { buildOverview, type OverviewInput, type RawReport } from "@/lib/admin/overview";

type Admin = ReturnType<typeof createAdminClient>;
type Result<T> = { data: T[] | null; error: { message: string } | null };

/** PostgREST returns at most 1000 rows per request: page through bigger tables */
async function selectAll<T>(query: (from: number, to: number) => PromiseLike<Result<T>>): Promise<Result<T>> {
  const PAGE = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return { data: rows, error: null };
  }
}

/** Exact row count, optionally where `column = value` */
const count = async (supabase: Admin, table: string, where?: [column: string, value: string | boolean]) => {
  const q = supabase.from(table).select("id", { count: "exact", head: true });
  const { count: n } = await (where ? q.eq(where[0], where[1]) : q);
  return n ?? 0;
};

/** Nested selects make PostgREST's inferred row type unwieldy; rows are typed by the caller */
const rows = <T>(query: PromiseLike<unknown>) => query as PromiseLike<Result<T>>;

async function listAuthUsers(supabase: Admin) {
  const users: OverviewInput["authUsers"] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...(data.users as OverviewInput["authUsers"]));
    if (data.users.length < 1000) return users;
  }
}

/**
 * Everything on the admin page in one parallel wave. Parts that depend on the admin-page SQL
 * migration fall back to what exists and are listed in `setupNeeded` instead of failing.
 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  try {
    const supabase = createAdminClient();
    const setupNeeded: string[] = [];

    const jobsQuery = (columns: string) =>
      selectAll<OverviewInput["jobs"][number]>((from, to) =>
        rows(supabase.from("generation_jobs").select(columns).order("started_at", { ascending: false }).range(from, to))
      );
    const reportsQuery = (columns: string) =>
      selectAll<RawReport>((from, to) =>
        rows(supabase.from("question_reports").select(columns).order("created_at", { ascending: false }).range(from, to))
      );

    const [
      authUsers,
      courses,
      dailyStudy,
      chapterProgress,
      quizAttempts,
      videoContent,
      jobsFull,
      reportsFull,
      feedbackRes,
      settingsRes,
      dbStatsRes,
      counts,
    ] = await Promise.all([
      listAuthUsers(supabase),
      selectAll<OverviewInput["courses"][number]>((from, to) =>
        rows(supabase.from("courses").select("id, user_id, playlist_id, playlists ( title, video_count )").range(from, to))
      ),
      selectAll<OverviewInput["dailyStudy"][number]>((from, to) =>
        supabase.from("daily_study").select("user_id, local_date, active_seconds, updated_at").range(from, to)
      ),
      selectAll<OverviewInput["chapterProgress"][number]>((from, to) =>
        supabase
          .from("chapter_progress")
          .select("user_id, status")
          .in("status", ["completed", "completed_without_quiz"])
          .range(from, to)
      ),
      selectAll<OverviewInput["quizAttempts"][number]>((from, to) =>
        supabase.from("quiz_attempts").select("user_id, skipped, score").range(from, to)
      ),
      selectAll<{ status: string }>((from, to) => supabase.from("video_content").select("status").range(from, to)),
      jobsQuery("status, error, model, input_tokens, output_tokens, started_at, videos ( title, playlists ( title ) )"),
      reportsQuery(
        `id, question_id, flashcard_id, item_type, category, reason, status, created_at, user_id,
         questions ( text, options, correct_index, status, videos ( title ) ),
         flashcards ( front, back, status, videos ( title ) )`
      ),
      supabase
        .from("feedback")
        .select("id, email, category, message, page, status, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("admin_settings").select("key, value"),
      supabase.rpc("admin_database_stats"),
      Promise.all([
        count(supabase, "playlists"),
        count(supabase, "videos"),
        count(supabase, "questions", ["status", "active"]),
        count(supabase, "flashcards", ["status", "active"]),
        count(supabase, "notes"),
        count(supabase, "bookmarks"),
        count(supabase, "answers"),
        count(supabase, "answers", ["is_correct", true]),
      ]),
    ]);

    // Fallbacks for a database without the admin-page migration
    let jobs = jobsFull;
    if (jobs.error) {
      setupNeeded.push("AI token & cost tracking");
      jobs = await jobsQuery("status, error, started_at, videos ( title, playlists ( title ) )");
    }
    let reports = reportsFull;
    if (reports.error) {
      setupNeeded.push("Flashcard reports and report status");
      reports = await reportsQuery(
        "id, question_id, category, reason, created_at, user_id, questions ( text, options, correct_index, status, videos ( title ) )"
      );
    }
    if (feedbackRes.error) setupNeeded.push("Feedback inbox");
    if (settingsRes.error) setupNeeded.push("Editable prices & plan costs");
    if (dbStatsRes.error) setupNeeded.push("Database size");

    for (const [name, res] of Object.entries({ courses, dailyStudy, chapterProgress, quizAttempts, videoContent, jobs, reports })) {
      if (res.error) throw new Error(`${name}: ${res.error.message}`);
    }

    const [playlists, videos, questions, flashcards, notes, bookmarks, answers, answersCorrect] = counts;
    const overview = buildOverview({
      now: new Date(),
      setupNeeded,
      settings: mergeSettings(settingsRes.data ?? []),
      authUsers,
      courses: courses.data ?? [],
      dailyStudy: dailyStudy.data ?? [],
      chapterProgress: chapterProgress.data ?? [],
      quizAttempts: quizAttempts.data ?? [],
      counts: { playlists, videos, questions, flashcards, notes, bookmarks, answers, answersCorrect },
      videoContentStatuses: (videoContent.data ?? []).map((v) => v.status),
      jobs: jobs.data ?? [],
      reports: reports.data ?? [],
      feedback: feedbackRes.data ?? [],
      dbStats: dbStatsRes.error ? null : (dbStatsRes.data as OverviewInput["dbStats"]),
    });

    return NextResponse.json(overview, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Admin overview error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
