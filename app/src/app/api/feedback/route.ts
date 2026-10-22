import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { unauthorized } from "@/lib/auth-helpers";
import { FeedbackSchema } from "@/lib/validations";

/** "Send feedback" from the profile menu; read in the admin page's feedback inbox */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    if (!userId) return unauthorized();

    const parsed = FeedbackSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid feedback" }, { status: 400 });
    }

    const { error } = await createAdminClient()
      .from("feedback")
      .insert({
        user_id: userId,
        email: typeof data?.claims?.email === "string" ? data.claims.email : null,
        ...parsed.data,
      });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Feedback error:", err);
    return NextResponse.json({ error: "Could not send feedback. Please try again." }, { status: 500 });
  }
}
