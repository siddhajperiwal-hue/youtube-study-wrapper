import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminSettingsSchema } from "@/lib/admin/settings";

/** Save admin settings: body is any subset of AdminSettings, each key validated and upserted */
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const parsed = AdminSettingsSchema.partial().safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings", details: parsed.error.format() }, { status: 400 });
  }
  const rows = Object.entries(parsed.data).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
  if (rows.length === 0) return NextResponse.json({ success: true });

  const { error } = await createAdminClient().from("admin_settings").upsert(rows, { onConflict: "key" });
  if (error) {
    return NextResponse.json(
      { error: `Could not save settings (run the admin-page migration first?): ${error.message}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
