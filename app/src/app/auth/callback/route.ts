import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth-messages";

/**
 * Where Supabase sends the browser back after Google sign-in, email confirmation and
 * password-reset links. Turns the link into a session cookie, then continues to `next`.
 * - `code`: PKCE flow (Google, and the default email templates; must open in the same browser)
 * - `token_hash` + `type`: email templates linking here directly (work in any browser)
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const fail = (message: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);

  const providerError = searchParams.get("error_description") || searchParams.get("error");
  if (providerError) return fail(providerError);

  const supabase = await createClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail("This sign-in link has expired or was opened in a different browser. Please try again.");
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return fail("This link has expired or was already used. Please try again.");
  } else {
    return fail("Invalid sign-in link.");
  }

  // Password-reset links land on the page that sets the new password
  return NextResponse.redirect(`${origin}${type === "recovery" ? "/reset-password" : next}`);
}
