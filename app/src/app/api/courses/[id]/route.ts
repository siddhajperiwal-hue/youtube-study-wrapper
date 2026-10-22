import { NextRequest, NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveUserId, unauthorized } from "@/lib/auth-helpers";
import { isPromotionalUrl } from "@/lib/youtube";
import { generatePlaylistContent, playlistNeedsContent } from "@/lib/generation-queue";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const userId = await getEffectiveUserId();
    if (!userId) return unauthorized();
    const supabase = createAdminClient();

    // Single round-trip: the course with its playlist, chapters, content statuses and
    // resources (nested select), fetched in parallel with progress and notes.
    // Progress/notes are keyed by course_id and only returned once the course is
    // confirmed to belong to this user.
    const [courseRes, progressRes, notesRes] = await Promise.all([
      supabase
        .from("courses")
        .select(
          `
          id,
          name,
          quizzes_enabled,
          flashcards_enabled,
          deadline_date,
          last_accessed_at,
          playlist_id,
          playlists (
            id,
            youtube_playlist_id,
            title,
            video_count,
            videos (
              id,
              youtube_video_id,
              position,
              title,
              duration_sec,
              description,
              status,
              video_content ( status ),
              video_resources ( id, video_id, url, label, domain, category )
            )
          )
        `
        )
        .eq("id", courseId)
        .eq("user_id", userId)
        .single(),
      supabase
        .from("chapter_progress")
        .select("video_id, status, last_position_sec, watched_seconds, completed_at")
        .eq("course_id", courseId),
      supabase
        .from("notes")
        .select("video_id, content, updated_at")
        .eq("course_id", courseId)
        .eq("user_id", userId),
    ]);

    const course = courseRes.data;
    if (courseRes.error || !course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const videos: any[] = [...((course.playlists as any)?.videos || [])].sort(
      (a, b) => a.position - b.position
    );
    const progress = progressRes.data || [];
    const courseNotes = notesRes.data || [];

    // Fill in quizzes/flashcards for chapters that don't have them yet (not on hover prefetches)
    if (req.headers.get("x-prefetch") !== "1" && playlistNeedsContent(videos)) {
      after(() => generatePlaylistContent(course.playlist_id));
    }

    // video_content is one-to-one (unique video_id), so PostgREST may return an object or an array
    const contentStatuses = videos.flatMap((v) => {
      const vc = Array.isArray(v.video_content) ? v.video_content[0] : v.video_content;
      return vc ? [{ video_id: v.id, status: vc.status }] : [];
    });
    const rawResources: any[] = videos.flatMap((v) => v.video_resources || []);

    const progressMap = new Map<string, any>();
    progress.forEach((p) => progressMap.set(p.video_id, p));

    const contentMap = new Map<string, string>();
    contentStatuses.forEach((cs) => contentMap.set(cs.video_id, cs.status));

    // Combine chapters
    const chapters = videos.map((v) => {
      const p = progressMap.get(v.id);
      return {
        id: v.id,
        youtubeVideoId: v.youtube_video_id,
        position: v.position,
        title: v.title,
        durationSec: v.duration_sec,
        status: p?.status || "not_started",
        lastPositionSec: p?.last_position_sec || 0,
        watchedSeconds: p?.watched_seconds || 0,
        completedAt: p?.completed_at || null,
        quizStatus: contentMap.get(v.id) || "pending",
      };
    });

    const resources = rawResources
      .filter((r) => !isPromotionalUrl(r.url, r.domain))
      .map((r) => ({
        id: r.id,
        videoId: r.video_id,
        video_id: r.video_id,
        url: r.url,
        label: r.label,
        domain: r.domain,
        category: r.category,
      }));

    const notesMap = new Map<string, any>();
    courseNotes.forEach((n) => notesMap.set(n.video_id, n.content));

    // Compute progress stats
    const totalChapters = chapters.length;
    const completedChapters = chapters.filter(
      (ch) => ch.status === "completed" || ch.status === "completed_without_quiz"
    ).length;
    const progressPercent =
      totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

    return NextResponse.json({
      course: {
        id: course.id,
        name: course.name,
        playlistTitle: (course.playlists as any)?.title,
        youtubePlaylistId: (course.playlists as any)?.youtube_playlist_id,
        thumbnailUrl: chapters[0]?.youtubeVideoId
          ? `https://img.youtube.com/vi/${chapters[0].youtubeVideoId}/hqdefault.jpg`
          : null,
        quizzesEnabled: course.quizzes_enabled,
        flashcardsEnabled: course.flashcards_enabled,
        deadlineDate: course.deadline_date,
        totalChapters,
        completedChapters,
        progressPercent,
      },
      chapters: chapters.map((ch) => ({
        ...ch,
        notes: notesMap.get(ch.id) || null,
      })),
      resources,
      notes: courseNotes || [],
    });
  } catch (err: any) {
    console.error("Error fetching course:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load course." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const userId = await getEffectiveUserId();
    if (!userId) return unauthorized();
    const body = await req.json();
    const { name, quizzes_enabled, flashcards_enabled, deadline_date } = body;

    const supabase = createAdminClient();

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (quizzes_enabled !== undefined) updates.quizzes_enabled = quizzes_enabled;
    if (flashcards_enabled !== undefined) updates.flashcards_enabled = flashcards_enabled;
    if (deadline_date !== undefined) {
      updates.deadline_date = deadline_date ? new Date(deadline_date).toISOString() : null;
    }

    const { data: updated, error } = await supabase
      .from("courses")
      .update(updates)
      .eq("id", courseId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, course: updated });
  } catch (err: any) {
    console.error("Error updating course:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update course." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const userId = await getEffectiveUserId();
    if (!userId) return unauthorized();
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseId)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting course:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete course." },
      { status: 500 }
    );
  }
}
