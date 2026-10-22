import Link from "next/link";
import { formatSeconds, type Chapter, type ChapterStats, type CourseData } from "./types";

interface CourseHeroProps {
  course: CourseData;
  chapters: Chapter[];
  stats: ChapterStats;
  deadlineDaysLeft: number | null;
  nextUpChapter: Chapter | undefined;
  onSetDeadline: () => void;
}

function CalendarIcon() {
  return (
    <svg className="icon" style={{ width: "12px", height: "12px" }} viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24">
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
  );
}

/** 4.1 Course hero: thumbnail, title, progress breakdown, deadline and the resume CTA. */
export function CourseHero({ course, chapters, stats, deadlineDaysLeft, nextUpChapter, onSetDeadline }: CourseHeroProps) {
  const { mastered, watched, remaining, masteredPct, watchedPct } = stats;
  const deadlineLabel =
    deadlineDaysLeft !== null
      ? `${deadlineDaysLeft} days left (${new Date(course.deadlineDate!).toLocaleDateString("en-US", { month: "short", day: "numeric" })})`
      : "";

  return (
    <section className="course-hero">
      <div className="hero-thumb-wrapper">
        <img
          className="hero-thumb-img"
          src={
            chapters[0]?.youtubeVideoId
              ? `https://img.youtube.com/vi/${chapters[0].youtubeVideoId}/hqdefault.jpg`
              : course.thumbnailUrl || "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=500&auto=format&fit=crop&q=80"
          }
          alt={course.name}
        />
        <span className="hero-thumb-badge" id="heroTotalChaptersPill">
          {course.totalChapters} Chapters
        </span>
      </div>

      <div className="hero-details">
        <div className="hero-title-row">
          <h1 className="hero-title" id="heroCourseTitle">
            {course.name}
          </h1>
        </div>

        <div className="hero-meta-row">
          <span>{course.playlistTitle ? `By ${course.playlistTitle}` : "YouTube Course"}</span>
          <span>•</span>
          <span>{course.totalChapters} Chapters</span>
          <span>•</span>
          <a href={`https://www.youtube.com/playlist?list=${course.youtubePlaylistId}`} target="_blank" rel="noopener noreferrer">
            Playlist on YouTube
            <svg className="icon" style={{ width: "12px", height: "12px", marginLeft: "4px" }} viewBox="0 0 24 24">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>

        {/* 4-Part Metric Progress */}
        <div className="hero-progress-group">
          <div className="progress-headline-row">
            <span className="progress-headline-text" id="progressHeadlineText">
              {course.completedChapters} of {course.totalChapters} Chapters Studied ({course.progressPercent}%)
            </span>

            {/* The Amber Rule (Section 1.3): amber strictly if <= 3 days */}
            {deadlineDaysLeft !== null ? (
              deadlineDaysLeft <= 3 ? (
                <span className="deadline-chip amber" id="heroDeadlineChip" title="Target Deadline">
                  <CalendarIcon />
                  <span>{deadlineLabel}</span>
                </span>
              ) : (
                <span className="deadline-chip" title="Target Deadline">
                  <CalendarIcon />
                  <span>{deadlineLabel}</span>
                </span>
              )
            ) : (
              <button
                className="btn btn-ghost"
                style={{ height: "24px", padding: "0 8px", fontSize: "11px", color: "var(--color-primary)" }}
                onClick={onSetDeadline}
              >
                + Set target deadline
              </button>
            )}
          </div>

          {/* Dual-Fill Segmented Bar */}
          <div className="segmented-progress-bar" title={`Progress: ${mastered} Mastered, ${watched} Watched, ${remaining} Remaining`}>
            <div className="progress-segment-mastered" id="barMastered" style={{ width: `${masteredPct}%` }}></div>
            <div className="progress-segment-watched" id="barWatched" style={{ width: `${watchedPct}%` }}></div>
          </div>

          {/* Detailed Stat Legend */}
          <div className="progress-stats-legend">
            <span className="legend-item">
              <span className="legend-dot mastered"></span>
              <strong id="statMasteredCount">{mastered}</strong> Mastered (Quiz Passed)
            </span>
            <span className="legend-item">
              <span className="legend-dot watched"></span>
              <strong id="statWatchedCount">{watched}</strong> Watched (Quiz Skipped)
            </span>
            <span className="legend-item">
              <span className="legend-dot remaining"></span>
              <strong id="statRemainingCount">{remaining}</strong> Remaining
            </span>
          </div>
        </div>
      </div>

      {/* Action CTA */}
      <div className="hero-cta-block">
        {nextUpChapter ? (
          <>
            <Link href={`/course/${course.id}/learn/${nextUpChapter.id}`} className="btn-resume-hero" id="heroResumeBtn">
              <span>{course.progressPercent === 100 ? "Review Chapter 1" : `Resume Chapter ${nextUpChapter.position}`}</span>
              <ArrowIcon />
            </Link>
            <span className="hero-next-caption">
              Next up: {nextUpChapter.title} ({formatSeconds(nextUpChapter.durationSec)})
            </span>
          </>
        ) : (
          chapters[0] && (
            <>
              <Link href={`/course/${course.id}/learn/${chapters[0].id}`} className="btn-resume-hero" id="heroResumeBtn">
                <span>Start Course</span>
                <ArrowIcon />
              </Link>
              <span className="hero-next-caption">
                Start Chapter 1: {chapters[0].title} ({formatSeconds(chapters[0].durationSec)})
              </span>
            </>
          )
        )}
      </div>
    </section>
  );
}
