import { NextRequest, NextResponse, after } from "next/server";
import { extractPlaylistId, fetchPlaylistData } from "@/lib/youtube";
import { generatePlaylistContent } from "@/lib/generation-queue";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveUserId, unauthorized } from "@/lib/auth-helpers";
import { CreateCourseSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId();
    if (!userId) return unauthorized();
    const rawBody = await req.json().catch(() => ({}));
    const parseResult = CreateCourseSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid course creation payload", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { url, name, quizzes_enabled, flashcards_enabled, deadline_date } = parseResult.data;

    const { playlistId, error } = extractPlaylistId(url);
    if (error || !playlistId) {
      return NextResponse.json({ error: error || "Invalid playlist URL." }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Check if playlist already exists in global cache
    let playlistRow: any = null;
    const { data: existingPlaylist } = await supabase
      .from("playlists")
      .select("*")
      .eq("youtube_playlist_id", playlistId)
      .maybeSingle();

    if (existingPlaylist) {
      playlistRow = existingPlaylist;
    } else {
      // Fetch full playlist from YouTube Data API
      const parsed = await fetchPlaylistData(playlistId);

      const { data: newPlaylist, error: plErr } = await supabase
        .from("playlists")
        .insert({
          youtube_playlist_id: parsed.youtubePlaylistId,
          title: parsed.title,
          video_count: parsed.videoCount,
        })
        .select()
        .single();

      if (newPlaylist) {
        playlistRow = newPlaylist;
      } else if (plErr?.code === "23505") {
        // Someone else imported this playlist at the same moment: use theirs (their request
        // inserts the videos), instead of failing with a duplicate-key error
        const { data: racedPlaylist } = await supabase
          .from("playlists")
          .select("*")
          .eq("youtube_playlist_id", playlistId)
          .single();
        if (!racedPlaylist) throw new Error(plErr.message);
        playlistRow = racedPlaylist;
      } else {
        throw new Error(plErr?.message || "Failed to save playlist.");
      }

      if (newPlaylist) {
        // Insert all videos
        const videosToInsert = parsed.videos.map((v) => ({
          playlist_id: playlistRow.id,
          youtube_video_id: v.youtubeVideoId,
          position: v.position,
          title: v.title,
          duration_sec: v.durationSec,
          description: v.description,
          embeddable: v.embeddable,
          status: v.status,
        }));

        const { data: insertedVideos, error: vidErr } = await supabase
          .from("videos")
          .insert(videosToInsert)
          .select();

        if (vidErr) {
          console.error("Error inserting videos:", vidErr);
        }

        // Insert resources
        const resourcesToInsert: any[] = [];
        if (insertedVideos) {
          insertedVideos.forEach((vRecord, idx) => {
            const parsedV = parsed.videos[idx];
            if (parsedV && parsedV.resources) {
              parsedV.resources.forEach((r) => {
                resourcesToInsert.push({
                  video_id: vRecord.id,
                  url: r.url,
                  label: r.label,
                  domain: r.domain,
                  category: r.category,
                });
              });
            }
          });

          if (resourcesToInsert.length > 0) {
            await supabase.from("video_resources").insert(resourcesToInsert);
          }
        }
      }
    }

    // 2. Create user enrolment in courses
    const courseName = name?.trim() || playlistRow.title;
    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .upsert(
        {
          user_id: userId,
          playlist_id: playlistRow.id,
          name: courseName,
          quizzes_enabled: Boolean(quizzes_enabled),
          flashcards_enabled: Boolean(flashcards_enabled),
          deadline_date: deadline_date ? new Date(deadline_date).toISOString() : null,
          last_accessed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,playlist_id" }
      )
      .select()
      .single();

    if (courseErr || !course) {
      throw new Error(courseErr?.message || "Failed to enroll user in course.");
    }

    // 3. Fetch all videos for this playlist
    const { data: videos } = await supabase
      .from("videos")
      .select("id, youtube_video_id, title, description, duration_sec, position")
      .eq("playlist_id", playlistRow.id)
      .order("position", { ascending: true });

    // 4. Create chapter_progress rows for each video
    if (videos && videos.length > 0) {
      const progressRows = videos.map((v) => ({
        course_id: course.id,
        video_id: v.id,
        user_id: userId,
        status: "not_started",
      }));

      await supabase
        .from("chapter_progress")
        .upsert(progressRows, { onConflict: "course_id,video_id" });

      // 5. Generate quizzes/flashcards for the whole playlist in the background (skips videos
      //    that already have content, e.g. when another user imported this playlist before)
      after(() => generatePlaylistContent(playlistRow.id));
    }

    return NextResponse.json({
      success: true,
      courseId: course.id,
      playlistId: playlistRow.id,
    });
  } catch (err: any) {
    console.error("Course creation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create course." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const userId = await getEffectiveUserId();
    if (!userId) return unauthorized();
    const supabase = createAdminClient();

    // Single round trip: courses with their playlist, the playlist's first video (thumbnail) and
    // all chapter progress embedded (nested selects), instead of a second query wave
    const { data: courses, error } = await supabase
      .from("courses")
      .select(
        `
        id,
        name,
        quizzes_enabled,
        flashcards_enabled,
        deadline_date,
        last_accessed_at,
        created_at,
        playlists (
          id,
          youtube_playlist_id,
          title,
          video_count,
          videos ( playlist_id, youtube_video_id, position )
        ),
        chapter_progress ( course_id, status, video_id, videos ( duration_sec, position, title ) )
      `
      )
      .eq("user_id", userId)
      .order("last_accessed_at", { ascending: false })
      .order("position", { referencedTable: "playlists.videos", ascending: true })
      .limit(1, { referencedTable: "playlists.videos" });

    if (error) {
      throw error;
    }

    if (!courses || courses.length === 0) {
      return NextResponse.json({ courses: [] });
    }

    const firstVideos = courses.flatMap((c: any) => c.playlists?.videos || []);
    const allProgress = courses.flatMap((c: any) => c.chapter_progress || []);

    const thumbMap = new Map<string, string>();
    firstVideos?.forEach((v) => {
      if (!thumbMap.has(v.playlist_id)) {
        thumbMap.set(
          v.playlist_id,
          `https://img.youtube.com/vi/${v.youtube_video_id}/hqdefault.jpg`
        );
      }
    });

    const progressByCourse = new Map<string, any[]>();
    allProgress?.forEach((p: any) => {
      const list = progressByCourse.get(p.course_id) || [];
      list.push(p);
      progressByCourse.set(p.course_id, list);
    });

    // Enrich courses with chapter progress in memory (zero extra DB calls)
    const enrichedCourses = courses.map((c: any) => {
      const progress = progressByCourse.get(c.id) || [];

      const totalChapters = progress.length;
      const completedChapters = progress.filter(
        (p: any) => p.status === "completed" || p.status === "completed_without_quiz"
      ).length;

      const progressPercent =
        totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

      let totalDurationSec = 0;
      let remainingDurationSec = 0;

      for (const item of progress) {
        const duration = (item.videos as any)?.duration_sec || 0;
        totalDurationSec += duration;
        if (item.status === "not_started") {
          remainingDurationSec += duration;
        }
      }

      // Calculate days remaining and priority score
      let daysRemaining: number | null = null;
      let priorityScore = 0;

      if (c.deadline_date) {
        const deadline = new Date(c.deadline_date).getTime();
        const now = Date.now();
        const diffDays = Math.max(1, Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)));
        daysRemaining = diffDays;

        const remainingMinutes = Math.round(remainingDurationSec / 60);
        priorityScore = Math.round(remainingMinutes / diffDays);
      }

      const thumbnailUrl = thumbMap.get(c.playlists?.id) || null;

      return {
        id: c.id,
        name: c.name,
        playlistId: c.playlists?.youtube_playlist_id,
        thumbnailUrl,
        quizzesEnabled: c.quizzes_enabled,
        flashcardsEnabled: c.flashcards_enabled,
        deadlineDate: c.deadline_date,
        daysRemaining,
        priorityScore,
        lastAccessedAt: c.last_accessed_at,
        totalChapters,
        completedChapters,
        progressPercent,
        totalDurationMinutes: Math.round(totalDurationSec / 60),
        remainingMinutes: Math.round(remainingDurationSec / 60),
      };
    });

    // Sort: Courses with deadlines first by priority score (descending), then by lastAccessedAt
    enrichedCourses.sort((a, b) => {
      if (a.deadlineDate && !b.deadlineDate) return -1;
      if (!a.deadlineDate && b.deadlineDate) return 1;
      if (a.deadlineDate && b.deadlineDate) {
        return (b.priorityScore || 0) - (a.priorityScore || 0);
      }
      return new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime();
    });

    return NextResponse.json({ courses: enrichedCourses });
  } catch (err: any) {
    console.error("Error fetching courses:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch courses." },
      { status: 500 }
    );
  }
}
