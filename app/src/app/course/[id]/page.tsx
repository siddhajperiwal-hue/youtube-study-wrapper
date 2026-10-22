"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { invalidateCache, prefetchData } from "@/lib/cache";
import { notesToPlainText } from "@/lib/notes-format";
import { isPromotionalUrl } from "@/lib/promotional-links";
import { useToast } from "@/hooks/useToast";
import { ReportModal, type ReportItemType } from "@/components/ReportModal";
import { CourseHero } from "@/components/course/CourseHero";
import { CourseTabs } from "@/components/course/CourseTabs";
import { CourseTopNav } from "@/components/course/CourseTopNav";
import { DeleteCourseModal } from "@/components/course/DeleteCourseModal";
import { NotesTab } from "@/components/course/NotesTab";
import { OverviewTab } from "@/components/course/OverviewTab";
import { ResourcesTab } from "@/components/course/ResourcesTab";
import { ReviewTab } from "@/components/course/ReviewTab";
import { SettingsTab } from "@/components/course/SettingsTab";
import { COURSE_TABS, type ChapterStats, type CourseTab } from "@/components/course/types";
import { useCourseData } from "@/components/course/useCourseData";
import { useSettingsForm } from "@/components/course/useSettingsForm";
import "@/styles/course.css";

function CoursePageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = params?.id as string;
  const { toastMessage, showToast } = useToast(2500);

  // 5-Tab Navigation Bar & Controller (Section 4.2), synced to ?tab=
  const tabParam = searchParams.get("tab") as CourseTab | null;
  const [activeTab, setActiveTab] = useState<CourseTab>(
    tabParam && COURSE_TABS.includes(tabParam) ? tabParam : "overview"
  );

  const settingsForm = useSettingsForm();
  const { course, chapters, resources, loading, reviewQuestions, reviewFlashcards, reviewLoaded, reload } = useCourseData(
    courseId,
    // Background refreshes don't overwrite settings the user may be editing
    (data, isBackgroundRefresh) => {
      if (!isBackgroundRefresh) settingsForm.sync(data.course);
    }
  );

  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [report, setReport] = useState<{ open: boolean; type: ReportItemType; itemId: string }>({
    open: false,
    type: "Question",
    itemId: "",
  });
  const openReport = (type: ReportItemType, itemId: string) => setReport({ open: true, type, itemId });

  const switchTab = (tab: CourseTab) => {
    setActiveTab(tab);
    router.replace(`/course/${courseId}?tab=${tab}`, { scroll: false });
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdating(true);
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settingsForm.name,
          deadline_date: settingsForm.deadline || null,
          quizzes_enabled: settingsForm.quizzes,
          flashcards_enabled: settingsForm.flashcards,
        }),
      });
      if (res.ok) {
        showToast("Course settings updated ✓");
        invalidateCache("/api/courses");
        reload();
      }
    } catch {
      showToast("Error updating settings");
    } finally {
      setIsUpdating(false);
    }
  };

  const notesStats = useMemo(() => {
    let words = 0;
    let annotated = 0;
    for (const ch of chapters) {
      const text = notesToPlainText(ch.notes).trim();
      if (text) {
        annotated++;
        words += text.split(/\s+/).length;
      }
    }
    return { words, annotated };
  }, [chapters]);

  // Mastered (quiz passed) vs Watched (quiz skipped) vs Remaining
  const stats: ChapterStats = useMemo(() => {
    const mastered = chapters.filter((c) => c.status === "completed").length;
    const watched = chapters.filter((c) => c.status === "completed_without_quiz").length;
    const pct = (n: number) => (chapters.length > 0 ? Math.round((n / chapters.length) * 100) : 0);
    return { mastered, watched, remaining: chapters.length - mastered - watched, masteredPct: pct(mastered), watchedPct: pct(watched) };
  }, [chapters]);

  // Non-promotional educational resources
  const educationalResources = useMemo(
    () => resources.filter((r) => !isPromotionalUrl(r.url, r.domain)),
    [resources]
  );

  const nextUpChapter = chapters.find((c) => c.status === "not_started") || chapters[0];

  // Prefetch the next chapter once the course is loaded
  useEffect(() => {
    if (nextUpChapter && course) {
      router.prefetch(`/course/${course.id}/learn/${nextUpChapter.id}`);
      prefetchData(`/api/courses/${course.id}/chapters/${nextUpChapter.id}`);
    }
  }, [nextUpChapter?.id, course?.id, router]);

  const deadlineDaysLeft = useMemo(() => {
    if (!course?.deadlineDate) return null;
    const diff = new Date(course.deadlineDate).getTime() - Date.now();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [course?.deadlineDate]);

  if (loading && !course) {
    return (
      <div className="course-page-wrapper">
        <CourseTopNav />
        <main className="main-container" style={{ opacity: 0.65, padding: "24px 20px" }}>
          <div style={{ height: "18px", width: "160px", background: "var(--color-surface-muted)", borderRadius: "4px", marginBottom: "20px" }} />
          <div style={{ height: "160px", background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)", borderRadius: "12px", marginBottom: "24px" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ height: "64px", background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)", borderRadius: "8px" }} />
            <div style={{ height: "64px", background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)", borderRadius: "8px" }} />
            <div style={{ height: "64px", background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)", borderRadius: "8px" }} />
          </div>
        </main>
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
        <h2 style={{ fontFamily: "var(--font-serif)" }}>Course Not Found</h2>
        <Link href="/" style={{ color: "var(--color-primary)", fontSize: "13px" }}>← Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="course-page-wrapper">
      <CourseTopNav />

      <main className="main-container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">
            <svg className="icon" viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Dashboard
          </Link>
          <span className="separator">/</span>
          <span className="current" id="breadcrumbCourseTitle">
            {course.name}
          </span>
        </nav>

        <CourseHero
          course={course}
          chapters={chapters}
          stats={stats}
          deadlineDaysLeft={deadlineDaysLeft}
          nextUpChapter={nextUpChapter}
          onSetDeadline={() => switchTab("settings")}
        />

        <CourseTabs
          activeTab={activeTab}
          onSelect={switchTab}
          chapterCount={chapters.length}
          resourceCount={educationalResources.length}
          reviewCount={reviewLoaded ? reviewQuestions.length + reviewFlashcards.length : undefined}
        />

        {activeTab === "overview" && (
          <OverviewTab courseId={course.id} chapters={chapters} stats={stats} nextUpChapter={nextUpChapter} />
        )}
        {activeTab === "resources" && <ResourcesTab chapters={chapters} resources={educationalResources} />}
        {activeTab === "review" && (
          <ReviewTab
            courseId={course.id}
            firstChapterId={chapters[0]?.id}
            hasProgress={stats.mastered + stats.watched > 0}
            questions={reviewQuestions}
            flashcards={reviewFlashcards}
            onReport={openReport}
            showToast={showToast}
          />
        )}
        {activeTab === "notes" && <NotesTab course={course} chapters={chapters} notesStats={notesStats} showToast={showToast} />}
        {activeTab === "settings" && (
          <SettingsTab
            form={settingsForm}
            isUpdating={isUpdating}
            onSubmit={handleUpdateSettings}
            onDeleteClick={() => setIsDeleteModalOpen(true)}
          />
        )}
      </main>

      <DeleteCourseModal
        open={isDeleteModalOpen}
        courseId={course.id}
        notesWordCount={notesStats.words}
        onClose={() => setIsDeleteModalOpen(false)}
        showToast={showToast}
      />

      <ReportModal
        open={report.open}
        itemType={report.type}
        itemId={report.itemId}
        onClose={() => setReport((r) => ({ ...r, open: false }))}
        showToast={showToast}
        successMessage={() => "Report submitted. Thank you!"}
        failureMessage={null}
      />

      <div id="toast" style={{ display: toastMessage ? "block" : "none" }}>
        {toastMessage}
      </div>
    </div>
  );
}

export default function CourseDetailPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: "14px", color: "var(--color-text-secondary)" }}>
          Loading course...
        </div>
      }
    >
      <CoursePageContent />
    </Suspense>
  );
}
