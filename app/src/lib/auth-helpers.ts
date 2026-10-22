import { NextResponse } from "next/server";
import { createClient } from "./supabase/server";

/**
 * The signed-in user's ID from the Supabase Auth session, or null when nobody is signed in.
 * Every API route must return `unauthorized()` on null: routes use the service-role client, so
 * this is the only thing scoping their queries to a user.
 *
 * Uses getClaims(), which verifies the JWT locally against the project's
 * (cached) asymmetric signing keys instead of a round-trip to the Auth server.
 */
export async function getEffectiveUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    return data?.claims?.sub ?? null;
  } catch {
    return null;
  }
}

/** 401 for API routes called without a session */
export function unauthorized() {
  return NextResponse.json({ error: "Not signed in." }, { status: 401 });
}
