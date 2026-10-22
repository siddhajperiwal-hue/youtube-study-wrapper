import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveUserId, unauthorized } from "@/lib/auth-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params;
    const userId = await getEffectiveUserId();
    if (!userId) return unauthorized();
    const body = await req.json();
    const { category = "Other", reason = "" } = body;

    const supabase = createAdminClient();

    const { error } = await supabase.from("question_reports").insert({
      question_id: questionId,
      user_id: userId,
      category,
      reason,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Report question error:", error);
    }

    return NextResponse.json({
      success: true,
      message: "Report submitted. Thank you for helping keep study cards accurate.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
