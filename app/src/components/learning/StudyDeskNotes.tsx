import React from "react";
import { padChapterNumber, type ChapterDetail } from "./types";

/** Inline `code` spans in the AI summary become <code>; everything else stays plain text */
function renderInline(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") && part.length > 2 ? <code key={i}>{part.slice(1, -1)}</code> : part,
  );
}

/** Read-only AI-generated notes for the current chapter (summary + key topics from `video_content`) */
export function StudyDeskNotes({ chapter }: { chapter: ChapterDetail }) {
  const num = padChapterNumber(chapter.position);
  const paragraphs = (chapter.summary || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const isGenerating = chapter.contentStatus === "pending" || chapter.contentStatus === null;

  return (
    <article className="chapter-note-page studydesk-notes-page">
      <div className="page-sheet-header">
        <span>StudyDesk Notes · Chapter {num}</span>
        <span className="page-sheet-badge">AI-generated</span>
      </div>
      <h3 className="page-sheet-title">
        Chapter {num}: {chapter.title}
      </h3>

      {paragraphs.length > 0 ? (
        <div className="page-sheet-body">
          {chapter.topics.length > 0 && (
            <div className="studydesk-topics">
              <div className="studydesk-section-label">Key topics</div>
              <ul className="studydesk-topic-list">
                {chapter.topics.map((topic) => (
                  <li key={topic}>{renderInline(topic)}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="studydesk-section-label">Summary</div>
          {paragraphs.map((p, i) => (
            <p key={i}>{renderInline(p)}</p>
          ))}
          <p className="studydesk-disclaimer">Written by AI from the video&apos;s transcript, so it can contain mistakes.</p>
        </div>
      ) : (
        <div className="page-sheet-body">
          <p className="studydesk-empty">
            {isGenerating
              ? "StudyDesk is still writing the notes for this chapter. Check back in a minute."
              : "StudyDesk notes aren't available for this chapter (we couldn't read the video's transcript)."}
          </p>
        </div>
      )}
    </article>
  );
}
