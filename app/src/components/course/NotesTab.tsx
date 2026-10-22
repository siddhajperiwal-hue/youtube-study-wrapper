"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notesToPlainText } from "@/lib/notes-format";
import { padChapterNumber, type Chapter, type CourseData } from "./types";

interface NotesTabProps {
  course: CourseData;
  chapters: Chapter[];
  notesStats: { words: number; annotated: number };
  showToast: (msg: string) => void;
}

/**
 * Tab 4 (4.6): formatted, read-only view of every chapter's notes (edited per chapter on the learning
 * page), plus "Download PDF" via the print dialog.
 */
export function NotesTab({ course, chapters, notesStats, showToast }: NotesTabProps) {
  // Each chapter's notes rendered as HTML; null until rendered (TipTap is loaded on demand)
  const [chapterNotesHtml, setChapterNotesHtml] = useState<(string | null)[] | null>(null);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);

  useEffect(() => {
    if (chapters.length === 0) return;
    let cancelled = false;
    import("@/lib/notes-pdf")
      .then(({ renderNotesHtml }) => renderNotesHtml(chapters.map((ch) => ch.notes)))
      .then((html) => {
        if (!cancelled) setChapterNotesHtml(html);
      })
      .catch((err) => console.error("Failed to render notes:", err));
    return () => {
      cancelled = true;
    };
  }, [chapters]);

  const handleDownloadPdf = async () => {
    if (isPreparingPdf) return;
    setIsPreparingPdf(true);
    try {
      const { printCourseNotes } = await import("@/lib/notes-pdf");
      await printCourseNotes(
        course.name,
        chapters.map((ch) => ({ position: ch.position, title: ch.title, notes: ch.notes }))
      );
    } catch (err) {
      console.error("PDF export failed:", err);
      showToast("Couldn't prepare the PDF. Please try again.");
    } finally {
      setIsPreparingPdf(false);
    }
  };

  return (
    <section className="tab-pane active" id="tab-notes" role="tabpanel">
      {/* Document Header Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px 12px 0 0", borderBottom: "none" }}>
        <div>
          <strong style={{ fontSize: "16px", fontFamily: "var(--font-serif)" }}>Course Notes Document</strong>
          <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginLeft: "12px" }}>
            {notesStats.words} words • {notesStats.annotated} of {chapters.length} chapters annotated
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>● Saved locally</span>
          <button
            type="button"
            className="btn btn-primary"
            style={{ height: "34px", padding: "0 14px", fontSize: "13px" }}
            onClick={handleDownloadPdf}
            disabled={isPreparingPdf}
            title="Opens the print dialog — choose “Save as PDF” as the destination"
          >
            {isPreparingPdf ? "Preparing PDF…" : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Unified Notes Document */}
      <div className="course-notes-doc">
        {chapters.map((ch, i) => {
          const hasNotes = !!notesToPlainText(ch.notes).trim();
          const html = chapterNotesHtml?.[i] ?? null;
          return (
            <section key={ch.id} className="course-notes-chapter">
              <div className="course-notes-chapter-head">
                <h3 className="course-notes-chapter-title">
                  <span className="course-notes-chapter-num">Chapter {padChapterNumber(ch.position)}:</span> {ch.title}
                </h3>
                <Link href={`/course/${course.id}/learn/${ch.id}`} className="course-notes-edit-link">
                  {hasNotes ? "Edit notes →" : "Add notes →"}
                </Link>
              </div>
              {chapterNotesHtml === null && hasNotes ? (
                <p className="course-notes-empty">Loading notes…</p>
              ) : html ? (
                // HTML comes from TipTap's schema serializer (text is escaped)
                <div className="course-notes-body" dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <p className="course-notes-empty">No notes for this chapter yet.</p>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
