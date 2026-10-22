import { notesToPlainText, upgradeLegacyTimestamps } from "./notes-format";

// Course notes → PDF via the browser's print dialog ("Save as PDF"). Printing real HTML (instead of
// building the PDF in JS) keeps text selectable and renders every script correctly — JS PDF
// libraries can't shape Devanagari, and several chapter titles are in Hindi.

export interface NotesChapter {
  position: number;
  title: string;
  notes: unknown; // TipTap JSON document (may be null / empty)
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// A chapter has notes if its document contains any text or timestamp
export const hasNotes = (doc: unknown) => notesToPlainText(doc).trim() !== "";

/**
 * Renders each chapter's notes (TipTap JSON) to HTML — formatting and timestamp badges included.
 * Returns null for chapters without notes. Used by the course page's notes tab and the PDF.
 */
export async function renderNotesHtml(notesList: unknown[]): Promise<(string | null)[]> {
  // Loaded on demand so pages don't ship the editor schema up front
  const [{ generateHTML }, { default: StarterKit }, { TimestampBadge }] = await Promise.all([
    import("@tiptap/react"),
    import("@tiptap/starter-kit"),
    import("./tiptap-timestamp"),
  ]);
  return notesList.map((doc) => {
    if (!hasNotes(doc)) return null;
    try {
      return generateHTML(upgradeLegacyTimestamps(doc).doc, [StarterKit, TimestampBadge]);
    } catch {
      return `<p>${escapeHtml(notesToPlainText(doc))}</p>`;
    }
  });
}

const PRINT_CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; color: #1f2a25; background: #fff;
    font: 11.5pt/1.6 "Inter", "Segoe UI", system-ui, "Nirmala UI", "Noto Sans Devanagari", sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  h1, h2 { font-family: "Source Serif 4", Georgia, "Nirmala UI", "Noto Serif Devanagari", serif; color: #2F5D50; }
  header { border-bottom: 2px solid #2F5D50; padding-bottom: 10px; margin-bottom: 18px; }
  h1 { font-size: 22pt; line-height: 1.25; margin: 0 0 4px; }
  .meta { color: #5F6B65; font-size: 9.5pt; }
  section { margin: 0 0 18px; }
  h2 { font-size: 13.5pt; line-height: 1.35; margin: 0 0 6px; break-after: avoid; page-break-after: avoid; }
  .chapter-num { color: #5F6B65; font-weight: 600; }
  .notes p { margin: 0 0 6px; }
  .notes ul, .notes ol { margin: 0 0 6px; padding-left: 20px; }
  .notes blockquote { margin: 0 0 6px; padding-left: 10px; border-left: 3px solid #DAD3C4; color: #5F6B65; }
  .notes code { font-family: "JetBrains Mono", Consolas, monospace; font-size: 0.9em; background: #F0EBE0; padding: 0 3px; border-radius: 3px; }
  .notes pre { background: #F0EBE0; padding: 8px; border-radius: 4px; white-space: pre-wrap; }
  .note-ts-badge {
    display: inline-block; font-family: "JetBrains Mono", Consolas, monospace; font-size: 0.85em;
    color: #2F5D50; border: 1px solid #2F5D50; border-radius: 4px; padding: 0 4px; line-height: 1.4;
  }
  .empty { color: #8a938e; font-style: italic; font-size: 10pt; margin: 0; }
`;

/** Builds the printable HTML document for a course's notes. */
export async function buildCourseNotesHtml(courseName: string, chapters: NotesChapter[]): Promise<string> {
  const sorted = [...chapters].sort((a, b) => a.position - b.position);
  const bodies = await renderNotesHtml(sorted.map((ch) => ch.notes));
  const withNotes = bodies.filter(Boolean).length;

  const sections = sorted
    .map((ch, i) => {
      const num = ch.position < 10 ? `0${ch.position}` : String(ch.position);
      const body = bodies[i] ?? `<p class="empty">No notes for this chapter.</p>`;
      return `<section><h2><span class="chapter-num">Chapter ${num}:</span> ${escapeHtml(ch.title)}</h2><div class="notes">${body}</div></section>`;
    })
    .join("\n");

  const exported = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(courseName)} — Notes</title><style>${PRINT_CSS}</style></head>
<body>
  <header>
    <h1>${escapeHtml(courseName)}</h1>
    <div class="meta">Course notes · ${withNotes} of ${sorted.length} chapters with notes · Exported ${escapeHtml(exported)} from StudyDesk</div>
  </header>
  ${sections}
</body></html>`;
}

/**
 * Opens the browser print dialog for the course's notes; the user picks "Save as PDF".
 * The suggested file name comes from the document title ("<course> — Notes").
 */
export async function printCourseNotes(courseName: string, chapters: NotesChapter[]): Promise<void> {
  const html = await buildCourseNotesHtml(courseName, chapters);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const originalTitle = document.title;
  const cleanup = () => {
    document.title = originalTitle;
    iframe.remove();
  };

  await new Promise<void>((resolve) => {
    iframe.onload = () => resolve();
    iframe.srcdoc = html;
  });

  const win = iframe.contentWindow;
  if (!win) {
    cleanup();
    throw new Error("Print frame unavailable");
  }
  // Some browsers name the PDF after the top-level page title
  document.title = `${courseName} — Notes`;
  win.addEventListener("afterprint", () => setTimeout(cleanup, 0), { once: true });
  setTimeout(cleanup, 5 * 60 * 1000); // safety net if afterprint never fires
  win.focus();
  win.print();
}
