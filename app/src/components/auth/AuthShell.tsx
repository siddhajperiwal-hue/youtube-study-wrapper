import Link from "next/link";
import "@/styles/auth.css";

interface AuthShellProps {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Centered card with the StudyDesk brand, shared by every sign-in page */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-brand">
          <span className="auth-brand-mark">
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
              <path d="M6 6h10"></path>
              <path d="M6 10h10"></path>
            </svg>
          </span>
          StudyDesk
        </Link>
        <div>
          <h1 className="auth-title">{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        </div>
        {children}
        {footer && <p className="auth-footer">{footer}</p>}
      </div>
    </main>
  );
}

/** Error / success banner */
export function AuthMessage({ kind, children }: { kind: "error" | "success"; children: React.ReactNode }) {
  return (
    <div className={`auth-message ${kind}`} role={kind === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}
