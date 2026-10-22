import Link from "next/link";
import type { Course } from "./types";

/** Top deck card 1: the most recently studied course. */
export function PriorityCourseCard({ course }: { course: Course }) {
  return (
    <article className="deck-card priority-card" id="priorityCourseCard">
      <div>
        <span className="eyebrow-tag">
          <svg className="icon" viewBox="0 0 24 24">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          PRIORITY COURSE
        </span>

        <div className="priority-split">
          <div className="priority-thumb">
            <img
              src={course.thumbnailUrl || (course.playlistId ? `https://img.youtube.com/vi/${course.playlistId}/hqdefault.jpg` : "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80")}
              alt={course.name}
            />
            <span className="chapter-count-pill">{course.totalChapters} chapters</span>
          </div>

          <div className="priority-info">
            <h2 className="priority-title" title={course.name}>{course.name}</h2>
            <p className="priority-lesson">
              {course.completedChapters} of {course.totalChapters} Chapters Completed
            </p>
          </div>
        </div>

        <div style={{ margin: "6px 0" }}>
          <div className="progress-label-row">
            <span>Course Progress</span>
            <span>
              <strong>
                {course.completedChapters} of {course.totalChapters} Chapters ({course.progressPercent}%)
              </strong>
            </span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${course.progressPercent}%` }}></div>
          </div>
        </div>

        {/* The Amber Rule (Section 1.3): strictly reserved for <= 3 days */}
        {course.deadlineDate && course.daysRemaining !== null ? (
          course.daysRemaining <= 3 ? (
            <span className="badge-chip urgent">
              <svg className="icon" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              📅 {course.daysRemaining} days left to deadline
            </span>
          ) : (
            <span className="badge-chip">
              📅 {course.daysRemaining} days remaining
            </span>
          )
        ) : null}
      </div>

      <div className="priority-actions">
        <Link
          href={`/course/${course.id}`}
          className="btn btn-primary"
          style={{ flex: 1, height: "40px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          RESUME COURSE →
        </Link>
        <Link
          href={`/course/${course.id}`}
          className="btn btn-ghost"
          style={{ height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          Overview ↗
        </Link>
      </div>
    </article>
  );
}
