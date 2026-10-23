"use client";

import React, { useEffect, useState } from "react";
import { EditorContent, type Editor } from "@tiptap/react";
import { notesToPlainText } from "@/lib/notes-format";
import { formatClock, padChapterNumber, type ChapterDetail, type ChapterSummary } from "./types";
import type { SaveStatus } from "./useNotesEditor";
import { StudyDeskNotes } from "./StudyDeskNotes";

type NotesTab = "mine" | "studydesk";

interface NotesPanelProps {
  editor: Editor | null;
  chapter: ChapterDetail;
  chaptersList: ChapterSummary[];
  saveStatus: SaveStatus;
  currentTimeSec: number;
  onInsertTimestamp: () => void;
  /** Click on a timestamp badge anywhere in the notes */
  onCanvasClick: (e: React.MouseEvent) => void;
  isDrawerOpen: boolean;
  onPushBack: () => void;
  isFocusMode: boolean;
  width: number | null;
  onWidthChange: (width: number) => void;
  columnRef: React.RefObject<HTMLElement | null>;
}

/**
 * Right column with two tabs: "My Notes" (one "page" per chapter; only the active chapter's page holds
 * the editor, the others show read-only previews) and "StudyDesk Notes" (the AI notes for the current
 * chapter). The editor stays mounted while the AI tab is shown. In Focus Mode it becomes a resizable drawer.
 */
export function NotesPanel({
  editor,
  chapter,
  chaptersList,
  saveStatus,
  currentTimeSec,
  onInsertTimestamp,
  onCanvasClick,
  isDrawerOpen,
  onPushBack,
  isFocusMode,
  width,
  onWidthChange,
  columnRef,
}: NotesPanelProps) {
  const [tab, setTab] = useState<NotesTab>("mine");

  // Each page is at least a screen tall, so bring the active chapter's page (with the editor) to the
  // top whenever the chapter changes — otherwise chapter 1's page is what's visible
  useEffect(() => {
    const canvas = document.getElementById("notesScrollCanvas");
    const page = document.getElementById(`chapter-page-${chapter.position}`);
    if (tab !== "mine" || !canvas || !page) return;
    canvas.scrollTo({
      top: canvas.scrollTop + page.getBoundingClientRect().top - canvas.getBoundingClientRect().top,
      behavior: "instant",
    });
  }, [chapter.id, chaptersList.length, tab]);

  // Stretchable notepad width (drag the left edge in Focus Mode)
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (!isFocusMode) return;
    const startX = e.clientX;
    const startW = columnRef.current?.getBoundingClientRect().width || 440;

    const onMouseMove = (moveEvt: MouseEvent) => {
      const maxW = Math.min(window.innerWidth * 0.75, 800);
      onWidthChange(Math.max(320, Math.min(maxW, startW + startX - moveEvt.clientX)));
    };
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <aside
      ref={columnRef}
      className={`notes-column ${isDrawerOpen ? "open" : ""}`}
      id="notesColumn"
      style={width ? { width: `${width}px`, maxWidth: "800px" } : undefined}
    >
      {/* Stretchable Resize Handle on left border (Focus Mode) */}
      <div className="notes-resize-handle" id="notesResizeHandle" title="Drag to resize notepad width" onMouseDown={handleResizeMouseDown}>
        <div className="resize-handle-bar"></div>
      </div>

      {/* My Notes / StudyDesk Notes switch */}
      <div className="notes-tab-bar" role="tablist" aria-label="Notes">
        <button
          role="tab"
          id="notesTabMine"
          aria-selected={tab === "mine"}
          className={`notes-tab ${tab === "mine" ? "active" : ""}`}
          onClick={() => setTab("mine")}
        >
          My Notes
        </button>
        <button
          role="tab"
          id="notesTabStudyDesk"
          aria-selected={tab === "studydesk"}
          className={`notes-tab ${tab === "studydesk" ? "active" : ""}`}
          onClick={() => setTab("studydesk")}
        >
          ✦ StudyDesk Notes
        </button>
      </div>

      {/* Notes Action Toolbar */}
      <div className="notes-fixed-toolbar">
        {tab === "studydesk" ? (
          <div className="notes-tools-left notes-readonly-label">Read-only · switch to My Notes to write</div>
        ) : (
          <div className="notes-tools-left">
            <button className="btn-insert-timestamp" id="btnToolbarInsertTimestamp" onClick={onInsertTimestamp} title="Insert clickable timestamp badge (Alt + T)">
              <svg className="icon" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span id="insertTimestampLabel">Insert [{formatClock(currentTimeSec)}]</span>
            </button>
            <div className="tool-divider"></div>
            <button
              className={`btn-format-tool ${editor?.isActive("bold") ? "active" : ""}`}
              id="btnBold"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button
              className={`btn-format-tool ${editor?.isActive("italic") ? "active" : ""}`}
              id="btnItalic"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              title="Italic"
            >
              <i>I</i>
            </button>
            <button
              className={`btn-format-tool ${editor?.isActive("bulletList") ? "active" : ""}`}
              id="btnList"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              title="Bulleted List"
            >
              • List
            </button>
          </div>
        )}

        <div className="notes-tools-right" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="notes-save-badge" hidden={tab !== "mine"}>
            <span className="save-indicator-dot"></span>
            <span>{saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved locally" : "Unsaved"}</span>
          </div>
          {/* Push Back Notes Button in Focus Mode */}
          <button className="btn-push-back-notes" id="btnPushBackNotes" title="Push back notes overlay" onClick={onPushBack}>
            <span>Push Back</span>
            <svg className="icon" viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable Continuous Notes Area (one page per chapter) */}
      {tab === "studydesk" && (
        <div className="notes-scroll-canvas" id="studyDeskNotesCanvas">
          <StudyDeskNotes chapter={chapter} />
        </div>
      )}
      <div className="notes-scroll-canvas" id="notesScrollCanvas" onClick={onCanvasClick} hidden={tab !== "mine"}>
        {chaptersList.map((ch) => {
          const num = padChapterNumber(ch.position);

          if (ch.id === chapter.id) {
            return (
              <article key={ch.id} className="chapter-note-page" id={`chapter-page-${ch.position}`}>
                <div className="page-sheet-header">
                  <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>● Active Chapter {num}</span>
                  <span className="page-sheet-badge" style={{ background: "var(--color-primary-light)", color: "var(--color-primary)", fontWeight: 700 }}>
                    Page {ch.position} of {chaptersList.length}
                  </span>
                </div>
                <h3 className="page-sheet-title">
                  Chapter {num}: {ch.title}
                </h3>
                <div className="page-sheet-body" id="activeChapterNotesBody">
                  <EditorContent editor={editor} />
                </div>
              </article>
            );
          }

          // Prior / subsequent chapters: read-only preview
          const preview = notesToPlainText(ch.notes);
          return (
            <article key={ch.id} className="chapter-note-page" id={`chapter-page-${ch.position}`}>
              <div className="page-sheet-header">
                <span>Chapter {num} Notes</span>
                <span className="page-sheet-badge">
                  Page {ch.position} of {chaptersList.length}
                </span>
              </div>
              <h3 className="page-sheet-title">
                Chapter {num}: {ch.title}
              </h3>
              <div className="page-sheet-body">
                {preview ? (
                  <div style={{ opacity: 0.85, whiteSpace: "pre-wrap" }}>{preview.length > 280 ? preview.slice(0, 280) + "…" : preview}</div>
                ) : (
                  <p style={{ color: "var(--color-text-secondary)", fontStyle: "italic", fontSize: "14px" }}>No notes taken yet for this chapter.</p>
                )}
                <div style={{ marginTop: "12px" }}>
                  <span className="note-ts-badge other-chapter" data-chapter={ch.position} data-seconds={30} style={{ cursor: "pointer" }}>
                    Ch {ch.position} • [00:30]
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}
