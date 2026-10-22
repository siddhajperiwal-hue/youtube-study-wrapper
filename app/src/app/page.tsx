"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useTheme } from "@/hooks/useTheme";
import { ReportModal } from "@/components/ReportModal";
import { AddCourseModal } from "@/components/dashboard/AddCourseModal";
import { CourseLibrary } from "@/components/dashboard/CourseLibrary";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FullTextModal, type FullTextView } from "@/components/dashboard/FullTextModal";
import { PriorityCourseCard } from "@/components/dashboard/PriorityCourseCard";
import { QuickQuizCard } from "@/components/dashboard/QuickQuizCard";
import { RecallFlashcardCard } from "@/components/dashboard/RecallFlashcardCard";
import { ShortcutsModal } from "@/components/dashboard/ShortcutsModal";
import type { CardsResponse, ReportItemType } from "@/components/dashboard/types";
import { useDashboardData } from "@/components/dashboard/useDashboardData";
import { useQuickQuiz } from "@/components/dashboard/useQuickQuiz";
import { useRecallFlashcard } from "@/components/dashboard/useRecallFlashcard";
import "@/styles/dashboard.css";

export default function DashboardPage() {
  const router = useRouter();
  const { toastMessage, showToast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const quiz = useQuickQuiz(showToast);
  const flashcard = useRecallFlashcard(showToast);
  const applyCards = (res: CardsResponse, keepShown?: CardsResponse) => {
    quiz.apply(res, !!keepShown?.quickQuiz);
    flashcard.apply(res, !!keepShown?.recallFlashcard);
  };
  const { courses, loading, cardsLoaded, streak, streakLoaded, refresh } = useDashboardData(applyCards);

  // Modals & popovers
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [fullTextView, setFullTextView] = useState<FullTextView>(null);
  const [report, setReport] = useState<{ open: boolean; type: ReportItemType; itemId: string }>({
    open: false,
    type: "Question",
    itemId: "",
  });
  const openReport = (type: ReportItemType, itemId: string) => setReport({ open: true, type, itemId });
  const closeReport = () => setReport((r) => ({ ...r, open: false }));

  // Keyboard shortcuts: Esc closes overlays, "?" opens the shortcuts sheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAddCourseModalOpen(false);
        setIsShortcutsModalOpen(false);
        setReport((r) => ({ ...r, open: false }));
        setFullTextView(null);
      }
      if (e.key === "?" && !["INPUT", "TEXTAREA"].includes((document.activeElement as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggleTheme = () => {
    const next = toggleTheme();
    showToast(`Switched to ${next === "dark" ? "Warm Espresso Dark Mode" : "Warm Paper Light Mode"}`);
  };

  // Local Data Backup (Section 2.2)
  const handleExportBackup = () => {
    const backupData = { app: "StudyDesk", exportedAt: new Date().toISOString(), streak, courses };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `studydesk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Local backup downloaded successfully.");
  };

  const handleCourseImported = (courseId?: string) => {
    refresh(true);
    if (courseId) router.push(`/course/${courseId}`);
  };

  // Priority Course: strictly the course a video was last played on
  const priorityCourse = useMemo(() => {
    if (courses.length === 0) return null;
    return [...courses].sort((a, b) => {
      const timeB = new Date(b.lastAccessedAt || 0).getTime();
      const timeA = new Date(a.lastAccessedAt || 0).getTime();
      return timeB - timeA;
    })[0];
  }, [courses]);

  const totalCompletedChapters = useMemo(
    () => courses.reduce((acc, c) => acc + (c.completedChapters || 0), 0),
    [courses]
  );

  // User Lifecycle States (Section 3.1):
  // new = 0 courses enrolled, early = enrolled but 0 chapters completed, active = >= 1 chapter completed
  const userState: "new" | "early" | "active" =
    courses.length === 0 ? "new" : totalCompletedChapters === 0 ? "early" : "active";

  return (
    <div className="dashboard-page-wrapper">
      <DashboardHeader
        streak={streak}
        streakLoaded={streakLoaded}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onAddCourse={() => setIsAddCourseModalOpen(true)}
        onShowShortcuts={() => setIsShortcutsModalOpen(true)}
        onExportBackup={handleExportBackup}
        onShowAppInfo={() => showToast("StudyDesk v1.0 • 20m focus interval • 5m rest break")}
      />

      {/* 2. Main Dashboard Container */}
      <main className="dashboard-container" id="dashboardMain">
        <header className="greeting-header">
          <h1 className="greeting-title" id="mainGreetingTitle">
            Welcome back. Let&apos;s pick up where you left off.
          </h1>
        </header>

        {/* Loading Skeleton */}
        {loading && courses.length === 0 && (
          <div style={{ opacity: 0.65, marginTop: "24px" }}>
            <div style={{ height: "180px", background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-subtle)", marginBottom: "32px" }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
              <div style={{ height: "220px", background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-subtle)" }} />
              <div style={{ height: "220px", background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-subtle)" }} />
              <div style={{ height: "220px", background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-subtle)" }} />
            </div>
          </div>
        )}

        {/* State 1: Brand New User (0 courses enrolled) */}
        {!loading && userState === "new" && (
          <div className="empty-state-card" id="emptyStateView" style={{ display: "block" }}>
            <div className="empty-icon-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
            </div>
            <h2 className="empty-state-title">Your study space is ready.</h2>
            <p className="empty-state-desc">
              Turn passive YouTube watching into structured, active mastery. Paste any course playlist link to track progress, take synced notes, and study with active chapter quizzes.
            </p>
            <button
              className="btn btn-primary"
              style={{ height: "48px", padding: "0 24px", fontSize: "15px" }}
              onClick={() => setIsAddCourseModalOpen(true)}
            >
              + Add Your First Course
            </button>
            <div style={{ marginTop: "14px", fontSize: "13px", color: "var(--color-text-secondary)" }}>
              Supports public and unlisted YouTube playlists.
            </div>
          </div>
        )}

        {/* State 2 & 3: Populated Courses View */}
        {courses.length > 0 && (
          <div id="populatedView">
            {/* TOP DECK: 3-Card Focus Deck (or 100% full-width Priority Card in Early Learner state) */}
            <section
              className="top-deck-grid"
              id="topDeckGrid"
              style={userState === "early" ? { gridTemplateColumns: "1fr" } : undefined}
            >
              {priorityCourse && <PriorityCourseCard course={priorityCourse} />}

              {/* Quiz + flashcard only in the Active Learner state (>= 1 completed chapter) */}
              {userState === "active" && (
                <QuickQuizCard
                  quiz={quiz}
                  cardsLoaded={cardsLoaded}
                  onReport={openReport}
                  onShowFullText={() => setFullTextView("quiz")}
                />
              )}
              {userState === "active" && (
                <RecallFlashcardCard
                  flashcard={flashcard}
                  cardsLoaded={cardsLoaded}
                  onReport={openReport}
                  onShowFullText={() => setFullTextView("flashcard")}
                  showToast={showToast}
                />
              )}
            </section>

            <CourseLibrary courses={courses} excludeCourseId={priorityCourse?.id} />
          </div>
        )}
      </main>

      <AddCourseModal
        open={isAddCourseModalOpen}
        onClose={() => setIsAddCourseModalOpen(false)}
        onImported={handleCourseImported}
        showToast={showToast}
      />

      <ReportModal
        open={report.open}
        itemType={report.type}
        itemId={report.itemId}
        onClose={closeReport}
        showToast={showToast}
      />

      <ShortcutsModal open={isShortcutsModalOpen} onClose={() => setIsShortcutsModalOpen(false)} />

      <FullTextModal view={fullTextView} quiz={quiz} flashcard={flashcard} onClose={() => setFullTextView(null)} />

      {/* Toast Notification Bar */}
      <div id="toast" style={{ display: toastMessage ? "block" : "none" }}>
        {toastMessage}
      </div>
    </div>
  );
}
