import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminReportUpdateSchema } from "@/lib/validations";

/**
 * Reports inbox actions: `{ status }` marks the report new / seen / resolved;
 * `{ itemStatus: "removed" | "active" }` takes the reported question or flashcard out of every
 * quiz, review and recall (they only serve `status = 'active'`) or puts it back. Removing also
 * resolves every report about that item (skipped, not failed, before the admin migration adds
 * `question_reports.status`).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const { id } = await params;
  const parsed = AdminReportUpdateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  const supabase = createAdminClient();

  if ("status" in parsed.data) {
    const { error } = await supabase.from("question_reports").update({ status: parsed.data.status }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { data: report, error: findErr } = await supabase
    .from("question_reports")
    .select("question_id, flashcard_id")
    .eq("id", id)
    .maybeSingle();
  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 });
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  const [table, itemId, column] = report.question_id
    ? (["questions", report.question_id, "question_id"] as const)
    : (["flashcards", report.flashcard_id, "flashcard_id"] as const);
  if (!itemId) return NextResponse.json({ error: "The reported item no longer exists." }, { status: 404 });

  const { itemStatus } = parsed.data;
  const [itemRes, reportsRes] = await Promise.all([
    supabase.from(table).update({ status: itemStatus }).eq("id", itemId),
    itemStatus === "removed"
      ? supabase.from("question_reports").update({ status: "resolved" }).eq(column, itemId)
      : Promise.resolve({ error: null }),
  ]);
  const missingStatusColumn = !!reportsRes.error && /status/.test(reportsRes.error.message);
  const error = itemRes.error ?? (missingStatusColumn ? null : reportsRes.error);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
