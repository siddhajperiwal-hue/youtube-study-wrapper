"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MIN_PASSWORD_LENGTH, authErrorMessage } from "@/lib/auth-messages";
import { AuthMessage, AuthShell } from "@/components/auth/AuthShell";

/** Opened from the password-reset email (via /auth/callback, which signs the user in first) */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError(authErrorMessage(updateError.message));
      return;
    }
    window.location.assign("/");
  };

  return (
    <AuthShell title="Choose a new password" subtitle="You'll stay logged in on this device.">
      {error && <AuthMessage kind="error">{error}</AuthMessage>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="password">New password</label>
          <input
            id="password"
            className="auth-input"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="auth-hint">At least {MIN_PASSWORD_LENGTH} characters.</span>
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="confirm">Confirm new password</label>
          <input
            id="confirm"
            className="auth-input"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
          {loading ? "Saving…" : "Save password"}
        </button>
      </form>
    </AuthShell>
  );
}
