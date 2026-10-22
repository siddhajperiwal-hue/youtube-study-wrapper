import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminFeedbackUpdateSchema } from "@/lib/validations";

/** Feedback inbox: mark an item new / seen / resolved */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const { id } = await params;
  const parsed = AdminFeedbackUpdateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });

  const { error } = await createAdminClient().from("feedback").update({ status: parsed.data.status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
