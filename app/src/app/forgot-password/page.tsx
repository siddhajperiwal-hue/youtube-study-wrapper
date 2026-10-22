"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-messages";
import { AuthMessage, AuthShell } from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email, {
      // The callback signs the user in with the recovery link, then opens /reset-password
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (resetError) setError(authErrorMessage(resetError.message));
    else setSent(true);
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your account's email and we'll send you a link to choose a new password."
      footer={<Link className="auth-link" href="/login">Back to log in</Link>}
    >
      {error && <AuthMessage kind="error">{error}</AuthMessage>}
      {sent ? (
        <AuthMessage kind="success">
          If an account exists for <strong>{email}</strong>, a reset link is on its way. Open it in this browser.
        </AuthMessage>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="auth-input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
