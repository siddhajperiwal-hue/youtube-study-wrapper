import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveUserId, unauthorized } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId();
    if (!userId) return unauthorized();
    const supabase = createAdminClient();

    const searchParams = req.nextUrl.searchParams;
    const timezone = searchParams.get("timezone") || "UTC";

    // Today's date in user timezone
    let todayDate: string;
    let yesterdayDate: string;
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      todayDate = formatter.format(now);

      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      yesterdayDate = formatter.format(yesterday);
    } catch {
      todayDate = new Date().toISOString().split("T")[0];
      const y = new Date(Date.now() - 24 * 60 * 60 * 1000);
      yesterdayDate = y.toISOString().split("T")[0];
    }

    // Fetch the last 60 days of study
    const { data: records, error } = await supabase
      .from("daily_study")
      .select("local_date, active_seconds")
      .eq("user_id", userId)
      .order("local_date", { ascending: false })
      .limit(60);

    if (error) throw error;

    const QUALIFYING_THRESHOLD_SEC = 20 * 60; // 20 minutes

    const dateMap = new Map<string, number>();
    records?.forEach((r) => dateMap.set(r.local_date, r.active_seconds));

    const todaySeconds = dateMap.get(todayDate) || 0;
    const todayMinutes = Math.floor(todaySeconds / 60);
    const todayQualifies = todaySeconds >= QUALIFYING_THRESHOLD_SEC;

    // Calculate streak: consecutive qualifying days ending today or yesterday
    let streakCount = 0;
    let checkDate = new Date(todayDate);

    // If today hasn't qualified yet, check if yesterday qualified to keep streak alive
    if (!todayQualifies) {
      const ySec = dateMap.get(yesterdayDate) || 0;
      if (ySec < QUALIFYING_THRESHOLD_SEC) {
        // Streak is 0
        return NextResponse.json({
          streak: 0,
          todayMinutes,
          thresholdMinutes: 20,
          todayQualifies: false,
        });
      }
      // Start counting backwards from yesterday
      checkDate = new Date(yesterdayDate);
    }

    // Count backwards day by day
    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      const activeSec = dateMap.get(dateStr) || 0;

      if (activeSec >= QUALIFYING_THRESHOLD_SEC) {
        streakCount++;
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }

    return NextResponse.json({
      streak: streakCount,
      todayMinutes,
      thresholdMinutes: 20,
      todayQualifies,
    });
  } catch (err: any) {
    console.error("Streak calculation error:", err);
    return NextResponse.json({ streak: 0, todayMinutes: 0 }, { status: 500 });
  }
}
