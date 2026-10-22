"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage, safeNextPath } from "@/lib/auth-messages";
import { AuthMessage, AuthShell } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [notice, setNotice] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
    if (signInError) {
      setLoading(false);
      setError(authErrorMessage(signInError.message));
      setNeedsConfirmation(signInError.message.toLowerCase().includes("email not confirmed"));
      return;
    }
    // Full page load: starts the app with a clean client cache for this account
    window.location.assign(next);
  };

  const resendConfirmation = async () => {
    const { error: resendError } = await createClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (resendError) setError(authErrorMessage(resendError.message));
    else {
      setError(null);
      setNeedsConfirmation(false);
      setNotice(`We sent a new confirmation link to ${email}.`);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to continue your courses."
      footer={
        <>
          New to StudyDesk?{" "}
          <Link className="auth-link" href={`/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>
            Create an account
          </Link>
        </>
      }
    >
      {error && (
        <AuthMessage kind="error">
          {error}
          {needsConfirmation && email && (
            <>
              {" "}
              <button type="button" className="auth-link auth-link-button" onClick={resendConfirmation}>
                Resend the link
              </button>
            </>
          )}
        </AuthMessage>
      )}
      {notice && <AuthMessage kind="success">{notice}</AuthMessage>}

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
          <div className="auth-label-row">
            <label className="auth-label" htmlFor="password">Password</label>
            <Link className="auth-link" href="/forgot-password" style={{ fontSize: "12px" }}>
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            className="auth-input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
