"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MIN_PASSWORD_LENGTH, authErrorMessage, safeNextPath } from "@/lib/auth-messages";
import { AuthMessage, AuthShell } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";

function SignupForm() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

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
    const { data, error: signUpError } = await createClient().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setLoading(false);

    if (signUpError) {
      setError(authErrorMessage(signUpError.message));
      return;
    }
    // Supabase hides whether an email is taken: an existing account comes back with no identities
    if (data.user && data.user.identities?.length === 0) {
      setError("An account with this email already exists. Log in instead.");
      return;
    }
    if (data.session) {
      // Email confirmation is turned off in Supabase: already signed in
      window.location.assign(next);
      return;
    }
    setSentTo(email);
  };

  if (sentTo) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={
          <>
            We sent a confirmation link to <strong>{sentTo}</strong>. Open it to activate your account and start learning.
          </>
        }
        footer={
          <>
            Already confirmed? <Link className="auth-link" href="/login">Log in</Link>
          </>
        }
      >
        <AuthMessage kind="success">Didn&apos;t get it? Check your spam folder, or log in to resend the link.</AuthMessage>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Turn any YouTube playlist into a course with notes, quizzes and streaks."
      footer={
        <>
          Already have an account?{" "}
          <Link className="auth-link" href={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>
            Log in
          </Link>
        </>
      }
    >
      {error && <AuthMessage kind="error">{error}</AuthMessage>}

      <GoogleButton next={next} onError={setError} />
      <div className="auth-divider">or</div>

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
        <div className="auth-field">
          <label className="auth-label" htmlFor="password">Password</label>
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
          <label className="auth-label" htmlFor="confirm">Confirm password</label>
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
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
