import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveUserId, unauthorized } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId();
    if (!userId) return unauthorized();
    const body = await req.json();
    const { questionId } = body;

    if (!questionId) {
      return NextResponse.json({ error: "questionId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    await supabase.from("bookmarks").upsert(
      {
        user_id: userId,
        question_id: questionId,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id,question_id" }
    );

    return NextResponse.json({
      success: true,
      message: "Saved to course Review tab for revision.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
