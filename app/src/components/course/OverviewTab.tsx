"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { prefetchData } from "@/lib/cache";
import { formatSeconds, isChapterDone, padChapterNumber, type Chapter, type ChapterStats } from "./types";

interface OverviewTabProps {
  courseId: string;
  chapters: Chapter[];
  stats: ChapterStats;
  nextUpChapter: Chapter | undefined;
}

type ChapterFilter = "all" | "completed" | "incomplete";

function ArrowIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24">
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
  );
}

/** Tab 1 (4.3): searchable, filterable chapter syllabus. */
export function OverviewTab({ courseId, chapters, stats, nextUpChapter }: OverviewTabProps) {
  const router = useRouter();
  const [chapterSearch, setChapterSearch] = useState("");
  const [chapterFilter, setChapterFilter] = useState<ChapterFilter>("all");

  const filteredChapters = useMemo(() => {
    return chapters.filter((ch) => {
      if (!ch.title.toLowerCase().includes(chapterSearch.toLowerCase())) return false;
      if (chapterFilter === "completed") return isChapterDone(ch);
      if (chapterFilter === "incomplete") return !isChapterDone(ch);
      return true;
    });
  }, [chapters, chapterSearch, chapterFilter]);

  const filters: { id: ChapterFilter; label: string }[] = [
    { id: "all", label: `All (${chapters.length})` },
    { id: "completed", label: `Completed (${stats.mastered + stats.watched})` },
    { id: "incomplete", label: `Incomplete (${stats.remaining})` },
  ];

  const learnUrl = (ch: Chapter) => `/course/${courseId}/learn/${ch.id}`;

  return (
    <section className="tab-pane active" id="tab-overview" role="tabpanel">
      <div className="section-controls-bar">
        <div className="search-input-wrap">
          <svg className="icon search-icon" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="search-input"
            id="chapterSearchInput"
            placeholder="Filter chapters by title..."
            value={chapterSearch}
            onChange={(e) => setChapterSearch(e.target.value)}
          />
          {chapterSearch && (
            <button className="search-clear-btn" onClick={() => setChapterSearch("")}>
              ✕
            </button>
          )}
        </div>

        <div className="filter-pills-group">
          {filters.map((f) => (
            <button key={f.id} className={`filter-pill ${chapterFilter === f.id ? "active" : ""}`} onClick={() => setChapterFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chapter List (Section 4.3) */}
      <div className="chapter-list" id="chapterListContainer">
        {filteredChapters.length === 0 ? (
          <div
            style={{
              background: "var(--color-surface)",
              padding: "32px",
              textAlign: "center",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            No chapters match your search query.
          </div>
        ) : (
          filteredChapters.map((ch) => {
            const isMastered = ch.status === "completed";
            const isWatched = ch.status === "completed_without_quiz";
            const isNextUp = ch.id === nextUpChapter?.id && !isMastered && !isWatched;
            const isPending = !isMastered && !isWatched && !isNextUp;

            return (
              <article
                key={ch.id}
                className={`chapter-card ${isNextUp ? "current-active" : ""}`}
                onMouseEnter={() => {
                  router.prefetch(learnUrl(ch));
                  prefetchData(`/api/courses/${courseId}/chapters/${ch.id}`);
                }}
                onClick={() => router.push(learnUrl(ch))}
              >
                <div className="chapter-card-left">
                  <span className="chapter-idx">{padChapterNumber(ch.position)}</span>
                  <div className="chapter-info">
                    <span className="chapter-title">{ch.title}</span>
                    <span className="chapter-desc">
                      {ch.description ? ch.description.replace(/(\r\n|\n|\r)/gm, " ").slice(0, 140) : "No description provided."}
                    </span>
                  </div>
                </div>

                <div className="chapter-card-right" onClick={(e) => e.stopPropagation()}>
                  <span className="chapter-duration" title="Video duration">
                    <svg className="icon" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    {formatSeconds(ch.durationSec)}
                  </span>

                  {/* Mutually Exclusive Status Badges */}
                  {isMastered && <span className="status-pill mastered">✓ Mastered</span>}
                  {isWatched && <span className="status-pill watched">👁 Watched</span>}
                  {isNextUp && <span className="status-pill up-next">● Up Next</span>}
                  {isPending && <span className="status-pill pending">○ Pending</span>}

                  {/* Action Buttons */}
                  {(isMastered || isWatched) && (
                    <Link href={learnUrl(ch)} className="btn-chapter-action ghost">
                      <span>Rewatch</span>
                      <span style={{ fontSize: "14px" }}>↗</span>
                    </Link>
                  )}
                  {isNextUp && (
                    <Link href={learnUrl(ch)} className="btn-chapter-action primary">
                      <span>Continue Chapter</span>
                      <ArrowIcon />
                    </Link>
                  )}
                  {isPending && (
                    <Link href={learnUrl(ch)} className="btn-chapter-action ghost">
                      <span>Start Chapter</span>
                      <ArrowIcon />
                    </Link>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
