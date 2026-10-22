import Link from "next/link";

/** 2.1 Global Top Navigation Bar (56px) for the course page. */
export function CourseTopNav() {
  return (
    <header className="top-nav">
      <div className="top-nav-inner">
        <Link href="/" className="brand-logo" title="StudyDesk Dashboard">
          <div className="brand-logo-mark">
            <svg className="icon" viewBox="0 0 24 24">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
              <path d="M6 6h10"></path>
              <path d="M6 10h10"></path>
            </svg>
          </div>
          <span className="brand-title">StudyDesk</span>
        </Link>
        <div className="top-nav-actions">
          <Link href="/" className="btn btn-ghost" style={{ height: "34px", padding: "0 12px", fontSize: "13px" }}>
            ← Dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}
