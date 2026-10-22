import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveUserId, unauthorized } from "@/lib/auth-helpers";
import { NoteUpdateSchema } from "@/lib/validations";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; videoId: string }> }
) {
  try {
    const { courseId, videoId } = await params;
    const userId = await getEffectiveUserId();
    if (!userId) return unauthorized();
    const supabase = createAdminClient();

    const { data: note } = await supabase
      .from("notes")
      .select("content, version, updated_at")
      .eq("course_id", courseId)
      .eq("video_id", videoId)
      .eq("user_id", userId)
      .maybeSingle();

    return NextResponse.json({
      content: note?.content || null,
      version: note?.version || 1,
      updatedAt: note?.updated_at || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; videoId: string }> }
) {
  try {
    const { courseId, videoId } = await params;
    const userId = await getEffectiveUserId();
    if (!userId) return unauthorized();
    const rawBody = await req.json().catch(() => ({}));
    const parseResult = NoteUpdateSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid note payload", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { content, version } = parseResult.data;

    const supabase = createAdminClient();

    const { data: updatedNote, error } = await supabase
      .from("notes")
      .upsert(
        {
          course_id: courseId,
          video_id: videoId,
          user_id: userId,
          content: content || {},
          version: version + 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "course_id,video_id" }
      )
      .select("content, version, updated_at")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, note: updatedNote });
  } catch (err: any) {
    console.error("Autosave note error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
