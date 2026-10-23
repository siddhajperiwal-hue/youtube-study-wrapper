import { NextRequest, NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveUserId, unauthorized } from "@/lib/auth-helpers";
import { generateContentForVideo } from "@/lib/gemini";
import { generatePlaylistContent, playlistNeedsContent } from "@/lib/generation-queue";
import { isPromotionalUrl } from "@/lib/youtube";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  try {
    const { id: courseId, videoId } = await params;
    const userId = await getEffectiveUserId();
    if (!userId) return unauthorized();
    const supabase = createAdminClient();

    // Single wave: the course with its full chapter list (nested select) in parallel with
    // everything keyed only by courseId/videoId. Course-keyed rows are only returned once
    // the course is confirmed to belong to this user.
    const [courseRes, allProgressRes, allNotesRes, contentRes, rawResourcesRes] =
      await Promise.all([
        supabase
          .from("courses")
          .select(
            `
            id, name, quizzes_enabled, flashcards_enabled, playlist_id, last_accessed_at,
            playlists ( videos ( id, youtube_video_id, position, title, duration_sec, description, video_content ( status, prompt_version ) ) )
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
          .select("video_id, content, version")
          .eq("course_id", courseId),
        supabase
          .from("video_content")
          .select("status, summary, topics")
          .eq("video_id", videoId)
          .maybeSingle(),
        supabase
          .from("video_resources")
          .select("id, video_id, url, label, domain, category")
          .eq("video_id", videoId),
      ]);

    const course = courseRes.data;
    if (courseRes.error || !course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const allVideos: any[] = [...((course.playlists as any)?.videos || [])].sort(
      (a, b) => a.position - b.position
    );
    const currentIndex = allVideos.findIndex((v) => v.id === videoId);
    const video = currentIndex >= 0 ? allVideos[currentIndex] : null;

    if (!video) {
      return NextResponse.json({ error: "Chapter video not found." }, { status: 404 });
    }

    const allProgress = allProgressRes.data || [];
    const allNotes = allNotesRes.data || [];
    const note = allNotes.find((n) => n.video_id === videoId) || null;
    const content = contentRes.data;
    const rawResources = rawResourcesRes.data || [];

    const progressMap = new Map(allProgress.map((p) => [p.video_id, p]));
    const notesMap = new Map(allNotes.map((n) => [n.video_id, n.content]));

    const chaptersList = allVideos.map((v) => ({
      id: v.id,
      position: v.position,
      title: v.title,
      durationSec: v.duration_sec,
      description: v.description,
      status: progressMap.get(v.id)?.status || "not_started",
      notes: notesMap.get(v.id) || null,
    }));

    const toNavItem = (v: any) =>
      v
        ? {
            id: v.id,
            position: v.position,
            title: v.title,
            duration_sec: v.duration_sec,
            description: v.description,
          }
        : null;
    const prevChapter = toNavItem(currentIndex > 0 ? allVideos[currentIndex - 1] : null);
    const nextChapter = toNavItem(
      currentIndex < allVideos.length - 1 ? allVideos[currentIndex + 1] : null
    );

    // Direct O(1) progress lookup for this chapter (no extra query)
    const progress = progressMap.get(videoId) || null;

    // If content not generated yet or previously failed, generate it after the response is
    // sent (generateContentForVideo dedupes runs already in flight for the same video).
    // Client-side data prefetches (x-prefetch header) don't retry failed generations, so
    // hovering over chapters can't repeatedly re-run Gemini on a video that keeps failing.
    const isPrefetch = req.headers.get("x-prefetch") === "1";
    if (
      !content ||
      content.status === "pending" ||
      (content.status === "failed" && !isPrefetch)
    ) {
      after(() =>
        generateContentForVideo(
          video.id,
          video.youtube_video_id,
          video.title,
          video.description || "",
          video.duration_sec
        ).catch((err) => console.error("Generation error in chapter route:", err))
      );
    }
    // Then the rest of the playlist, starting with the chapters after this one
    if (!isPrefetch && playlistNeedsContent(allVideos)) {
      after(() => generatePlaylistContent(course.playlist_id, video.position));
    }

    const chapterResources = rawResources
      .filter((r) => !isPromotionalUrl(r.url, r.domain))
      .map((r) => ({
        id: r.id,
        videoId: r.video_id,
        url: r.url,
        label: r.label,
        domain: r.domain,
        category: r.category,
      }));

    // Check 24-hour inactivity for Active Recall Refresher
    const previousLastAccessed = course.last_accessed_at;
    let eligibleForRecall = false;
    let timeAwayText = "over 24 hours";
    let recallQuestions: any[] = [];

    if (previousLastAccessed) {
      const diffMs = Date.now() - new Date(previousLastAccessed).getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours >= 24) {
        // Find completed chapters in this course
        const completedIds = allProgress
          .filter((p) => p.status === "completed" || p.status === "completed_without_quiz")
          .map((p) => p.video_id);

        if (completedIds.length > 0) {
          const { data: qData } = await supabase
            .from("questions")
            .select("id, video_id, topic, text, options, explanation, correct_index, difficulty")
            .in("video_id", completedIds)
            .eq("status", "active")
            .limit(2);

          if (qData && qData.length > 0) {
            eligibleForRecall = true;
            recallQuestions = qData;
            const diffDays = Math.floor(diffHours / 24);
            timeAwayText = diffDays >= 2 ? `${diffDays} days` : diffDays === 1 ? "1 day" : "over 24 hours";
          }
        }
      }
    }

    return NextResponse.json({
      course: {
        id: course.id,
        name: course.name,
        quizzesEnabled: course.quizzes_enabled,
      },
      chapter: {
        id: video.id,
        youtubeVideoId: video.youtube_video_id,
        position: video.position,
        totalChapters: allVideos?.length || 1,
        title: video.title,
        durationSec: video.duration_sec,
        description: video.description,
        status: progress?.status || "not_started",
        lastPositionSec: progress?.last_position_sec || 0,
        watchedSeconds: progress?.watched_seconds || 0,
        quizReady: content?.status === "ready",
        summary: content?.summary || null,
        topics: content?.topics || [],
      },
      recall: {
        eligible: eligibleForRecall,
        timeAwayText,
        questions: recallQuestions,
      },
      resources: chapterResources,
      notes: {
        content: note?.content || null,
        version: note?.version || 1,
      },
      navigation: {
        prev: prevChapter,
        next: nextChapter,
      },
      chaptersList,
    });
  } catch (err: any) {
    console.error("Error loading chapter:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load chapter." },
      { status: 500 }
    );
  }
}
