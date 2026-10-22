"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-messages";

/** "Continue with Google": redirects to Google, which returns to /auth/callback, then to `next` */
export function GoogleButton({ next, onError }: { next: string; onError: (message: string) => void }) {
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    // While the Google provider is off in Supabase, its authorize URL shows a raw JSON error page,
    // so check the project's public auth settings first
    const settings = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
    })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
    if (settings && !settings.external?.google) {
      setLoading(false);
      onError(authErrorMessage("provider is not enabled"));
      return;
    }

    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    // On success the browser is already navigating to Google
    if (error) {
      setLoading(false);
      onError(authErrorMessage(error.message));
    }
  };

  return (
    <button type="button" className="btn auth-google" onClick={signIn} disabled={loading}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
      </svg>
      {loading ? "Redirecting to Google…" : "Continue with Google"}
    </button>
  );
}
