import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Emails allowed into /admin: the ADMIN_EMAILS env var, comma-separated (server-only) */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && adminEmails().includes(email.toLowerCase());
}

type Session = { id: string; email: string | null } | null;

async function getSession(): Promise<Session> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims?.sub) return null;
    return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
  } catch {
    return null;
  }
}

/** True when the signed-in user is an admin */
export async function isAdmin(): Promise<boolean> {
  return isAdminEmail((await getSession())?.email);
}

/**
 * Guard for /api/admin/* routes, which read every user's data with the service-role key:
 * returns the admin, or the 401/403 response to send.
 */
export async function requireAdmin(): Promise<
  { admin: { id: string; email: string }; response?: undefined } | { admin?: undefined; response: NextResponse }
> {
  const session = await getSession();
  if (!session) return { response: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  if (!isAdminEmail(session.email)) return { response: NextResponse.json({ error: "Admins only." }, { status: 403 }) };
  return { admin: { id: session.id, email: session.email! } };
}
