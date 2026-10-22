/** Friendlier wording for the Supabase Auth errors users actually hit */
export function authErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Wrong email or password.";
  if (m.includes("email not confirmed")) return "Please confirm your email first: open the link we sent to your inbox.";
  if (m.includes("user already registered")) return "An account with this email already exists. Log in instead.";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider"))
    return "Google sign-in isn't set up yet. Use your email and password for now.";
  if (m.includes("rate limit") || m.includes("too many requests") || m.includes("security purposes"))
    return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("password should be") || m.includes("weak password"))
    return "Please choose a stronger password (at least 8 characters).";
  if (m.includes("same password") || m.includes("different from the old"))
    return "Your new password must be different from the old one.";
  return message;
}

/** Same-site path to continue to after signing in (never another site) */
export function safeNextPath(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export const MIN_PASSWORD_LENGTH = 8;
