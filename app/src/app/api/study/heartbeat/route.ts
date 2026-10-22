import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveUserId, unauthorized } from "@/lib/auth-helpers";
import { HeartbeatSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId();
    if (!userId) return unauthorized();
    const rawBody = await req.json().catch(() => ({}));
    const parseResult = HeartbeatSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid heartbeat payload", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { activeSeconds, timezone } = parseResult.data;

    const supabase = createAdminClient();

    // Calculate local date for the user based on timezone
    let localDateString: string;
    try {
      const now = new Date();
      // Format as YYYY-MM-DD in the user's timezone
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone || "UTC",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      localDateString = formatter.format(now);
    } catch {
      localDateString = new Date().toISOString().split("T")[0];
    }

    // Check existing daily_study record for today
    const { data: existing } = await supabase
      .from("daily_study")
      .select("active_seconds")
      .eq("user_id", userId)
      .eq("local_date", localDateString)
      .maybeSingle();

    const newActiveSeconds = (existing?.active_seconds || 0) + Math.min(300, Math.max(1, activeSeconds));

    await supabase.from("daily_study").upsert(
      {
        user_id: userId,
        local_date: localDateString,
        active_seconds: newActiveSeconds,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,local_date" }
    );

    return NextResponse.json({
      success: true,
      todayActiveMinutes: Math.floor(newActiveSeconds / 60),
      isQualifying: newActiveSeconds >= 20 * 60, // 20-min streak threshold
    });
  } catch (err: any) {
    console.error("Heartbeat error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
