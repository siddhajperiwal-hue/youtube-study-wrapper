"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { prefetchData } from "@/lib/cache";
import type { Course } from "./types";

type SortOption = "priority" | "recent" | "completion" | "alphabetical";

function sortCourses(list: Course[], sortOption: SortOption) {
  return list.sort((a, b) => {
    if (sortOption === "priority") {
      if (a.deadlineDate && !b.deadlineDate) return -1;
      if (!a.deadlineDate && b.deadlineDate) return 1;
      if (a.deadlineDate && b.deadlineDate) return (b.priorityScore || 0) - (a.priorityScore || 0);
      return new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime();
    }
    if (sortOption === "recent") {
      return new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime();
    }
    if (sortOption === "completion") {
      return b.progressPercent - a.progressPercent;
    }
    if (sortOption === "alphabetical") {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });
}

/** 3.3 "Other Enrolled Courses" section: searchable, sortable grid (excluding the priority course). */
export function CourseLibrary({ courses, excludeCourseId }: { courses: Course[]; excludeCourseId?: string }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("priority");

  const otherCourses = useMemo(() => {
    let list = [...courses];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return sortCourses(list, sortOption).filter((c) => c.id !== excludeCourseId);
  }, [courses, searchQuery, sortOption, excludeCourseId]);

  return (
    <section style={{ marginTop: "36px" }}>
      <div className="library-header">
        <h2 className="library-title">
          <span>Other Courses</span>
          <span className="count-pill" id="courseCountBadge">
            {otherCourses.length}
          </span>
        </h2>

        <div className="library-controls">
          <div className="course-search-box">
            <span className="search-icon-inside">
              <svg className="icon" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              id="courseSearchInput"
              className="search-input-field"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
                ✕
              </button>
            )}
          </div>

          <div className="sort-control">
            <label htmlFor="sortSelect">Sort by:</label>
            <select
              id="sortSelect"
              className="select-dropdown"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
            >
              <option value="priority">Priority (Deadline Urgency)</option>
              <option value="recent">Recently Studied</option>
              <option value="completion">Completion %</option>
              <option value="alphabetical">Alphabetical (A–Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Course Grid */}
      <div className="course-grid" id="courseGrid">
        {otherCourses.map((c) => (
          <article
            key={c.id}
            className="course-card"
            onMouseEnter={() => {
              router.prefetch(`/course/${c.id}`);
              prefetchData(`/api/courses/${c.id}`);
              prefetchData(`/api/courses/${c.id}/review`);
              if (c.resumeChapterId && c.progressPercent < 100) {
                router.prefetch(`/course/${c.id}/learn/${c.resumeChapterId}`);
                prefetchData(`/api/courses/${c.id}/chapters/${c.resumeChapterId}`);
              }
            }}
            onClick={() => router.push(`/course/${c.id}`)}
          >
            <div className="course-thumb-box">
              <img
                src={c.thumbnailUrl || (c.playlistId ? `https://img.youtube.com/vi/${c.playlistId}/hqdefault.jpg` : "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?auto=format&fit=crop&w=500&q=80")}
                alt={c.name}
              />
              <span className="chapter-count-pill">{c.totalChapters} chapters</span>
            </div>
            <h3 className="course-card-title">{c.name}</h3>
            <p className="course-creator">{c.totalDurationMinutes} mins total lecture time</p>

            <div>
              <div className="progress-label-row">
                <span>Progress</span>
                <span>
                  {c.completedChapters} of {c.totalChapters} ({c.progressPercent}%)
                </span>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${c.progressPercent}%`,
                    background: c.progressPercent === 100 ? "var(--color-success)" : "var(--color-primary)",
                  }}
                ></div>
              </div>
            </div>

            {c.progressPercent === 100 ? (
              <span className="badge-chip" style={{ color: "var(--color-success)", background: "var(--color-success-bg)" }}>
                Course Completed ✓
              </span>
            ) : c.deadlineDate && c.daysRemaining !== null ? (
              c.daysRemaining <= 3 ? (
                <span className="badge-chip urgent">📅 {c.daysRemaining} days left</span>
              ) : (
                <span className="badge-chip">📅 {c.daysRemaining} days left</span>
              )
            ) : null}

            <div className="course-card-actions">
              <Link
                href={
                  c.progressPercent === 100
                    ? `/course/${c.id}?tab=review`
                    : c.resumeChapterId
                      ? `/course/${c.id}/learn/${c.resumeChapterId}`
                      : `/course/${c.id}`
                }
                className="btn btn-primary"
                style={{ height: "34px", padding: "0 14px", fontSize: "13px", display: "inline-flex", alignItems: "center", textDecoration: "none" }}
                onClick={(e) => e.stopPropagation()}
              >
                {c.progressPercent === 100 ? "Review Course" : "Resume"}
              </Link>
              <Link
                href={`/course/${c.id}`}
                style={{ fontSize: "13px", color: "var(--color-primary)", fontWeight: 500, textDecoration: "none" }}
                onClick={(e) => e.stopPropagation()}
              >
                Details →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
