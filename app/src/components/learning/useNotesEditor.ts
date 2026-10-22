import { useEffect, useRef, useState } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { invalidateCache } from "@/lib/cache";
import { upgradeLegacyTimestamps } from "@/lib/notes-format";
import { TimestampBadge } from "@/lib/tiptap-timestamp";
import { formatClock } from "./types";

type NotesTarget = { courseId: string; videoId: string };
export type SaveStatus = "saved" | "saving" | "unsaved";

/**
 * The learning page's per-chapter notes editor (TipTap). One editor instance is reused across
 * chapters (client navigation doesn't remount the page), so:
 * - `notesTargetRef` is the chapter whose notes the editor currently holds (null while the next
 *   chapter's notes load), and every save is addressed to the chapter the edit was made in —
 *   never to whatever chapter is on screen when the 1s autosave debounce fires;
 * - `beginChapter()` clears + locks the editor; `loadNotes()` fills it once the chapter data arrives;
 * - `flush()` sends a pending edit immediately (call it when leaving a chapter).
 */
export function useNotesEditor(courseId: string, videoId: string, showToast: (msg: string) => void) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesTargetRef = useRef<NotesTarget | null>(null);
  const pendingNotesSaveRef = useRef<{ target: NotesTarget; content: unknown } | null>(null);
  const [chapterNotes, setChapterNotes] = useState<{ videoId: string; content: unknown } | null>(null);

  const saveNotes = async (target: NotesTarget, contentJson: unknown) => {
    const isOnScreen = () => notesTargetRef.current?.videoId === target.videoId;
    const invalidate = () => {
      invalidateCache(`/api/courses/${target.courseId}/chapters/${target.videoId}`);
      invalidateCache(`/api/notes/${target.courseId}/${target.videoId}`);
      invalidateCache(`/api/courses/${target.courseId}`);
    };
    try {
      if (isOnScreen()) setSaveStatus("saving");
      invalidate(); // don't serve this chapter's old notes from cache while the save is in flight
      const res = await fetch(`/api/notes/${target.courseId}/${target.videoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contentJson }),
      });
      if (res.ok) {
        invalidate();
        if (isOnScreen()) {
          setSaveStatus("saved");
          showToast("Notes auto-saved");
        }
      } else if (isOnScreen()) {
        setSaveStatus("unsaved");
      }
    } catch {
      if (isOnScreen()) setSaveStatus("unsaved");
    }
  };

  /** Send the latest unsaved edit (if any) to the chapter it was made in */
  const flush = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const pending = pendingNotesSaveRef.current;
    pendingNotesSaveRef.current = null;
    if (pending) saveNotes(pending.target, pending.content);
  };

  const editor = useEditor({
    extensions: [StarterKit, TimestampBadge],
    content: "",
    editable: false, // unlocked once the current chapter's notes are loaded
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "notes-editable-area focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      const target = notesTargetRef.current;
      if (!target) return; // notes for this chapter not loaded yet
      setSaveStatus("unsaved");
      pendingNotesSaveRef.current = { target, content: editor.getJSON() };
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(flush, 1000);
    },
  });

  /** A new chapter is loading: clear and lock the editor until its notes arrive */
  const beginChapter = () => {
    notesTargetRef.current = null;
    setChapterNotes(null);
    if (editor) {
      editor.commands.setContent("", { emitUpdate: false });
      editor.setEditable(false);
    }
  };

  /** Notes for `forVideoId` arrived with the chapter data */
  const loadNotes = (forVideoId: string, content: unknown) => setChapterNotes({ videoId: forVideoId, content });

  // Put this chapter's notes into the editor once both exist. An empty chapter gets an empty editor
  // (the previous chapter's notes must never carry over). Loading never counts as an edit
  // (TipTap v3 would otherwise fire onUpdate and autosave).
  useEffect(() => {
    if (!editor || !chapterNotes || chapterNotes.videoId !== videoId) return;
    if (notesTargetRef.current?.videoId === videoId) return; // already loaded
    const content =
      chapterNotes.content && typeof chapterNotes.content === "object" && Object.keys(chapterNotes.content).length > 0
        ? upgradeLegacyTimestamps(chapterNotes.content).doc // old notes stored badges as literal markup text
        : "";
    editor.commands.setContent(content, { emitUpdate: false });
    editor.setEditable(true);
    notesTargetRef.current = { courseId, videoId };
    setSaveStatus("saved");
  }, [editor, chapterNotes, courseId, videoId]);

  /** Insert a clickable timestamp badge at the cursor */
  const insertTimestamp = (chapterPosition: number, seconds: number) => {
    if (!editor) return;
    // A real timestampBadge node (an HTML string would be inserted as literal text),
    // separated from a preceding word by a space
    const before = editor.state.selection.$from.nodeBefore;
    const needsLeadingSpace = !!before && (!before.isText || !/\s$/.test(before.text ?? ""));
    editor
      .chain()
      .focus()
      .insertContent([
        ...(needsLeadingSpace ? [{ type: "text", text: " " }] : []),
        { type: "timestampBadge", attrs: { chapter: chapterPosition, seconds: Math.floor(seconds) } },
        { type: "text", text: " " },
      ])
      .run();
    showToast(`Inserted [${formatClock(seconds)}] at cursor`);
  };

  return { editor, saveStatus, beginChapter, loadNotes, flush, insertTimestamp };
}
