import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveUserId, unauthorized } from "@/lib/auth-helpers";
import { ReportSchema } from "@/lib/validations";

/** Report a question or a flashcard (`itemType`); shows up in the admin page's reports inbox */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params;
    const userId = await getEffectiveUserId();
    if (!userId) return unauthorized();
    const parsed = ReportSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid report", details: parsed.error.format() }, { status: 400 });
    }
    const { itemType, category, reason } = parsed.data;
    const isFlashcard = itemType === "Flashcard";

    const supabase = createAdminClient();
    const { error } = await supabase.from("question_reports").insert({
      question_id: isFlashcard ? null : itemId,
      ...(isFlashcard ? { flashcard_id: itemId, item_type: "flashcard" } : {}),
      user_id: userId,
      category,
      reason,
      created_at: new Date().toISOString(),
    });

    if (error) {
      // Flashcard reports need the admin-page migration (flashcard_id column)
      console.error("Report error:", error);
      return NextResponse.json({ error: "Could not save the report." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Report submitted. Thank you for helping keep study cards accurate.",
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
