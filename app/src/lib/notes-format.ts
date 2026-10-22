// Editor-free helpers for notes stored as TipTap JSON. Kept separate from the TipTap node
// (tiptap-timestamp.ts) so pages that only read notes don't bundle the editor / ProseMirror.

export function formatTimestamp(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mmss = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

// Older notes stored timestamps as literal text, e.g.
// `<span class="note-ts-badge" data-chapter="3" data-seconds="25">[00:25]</span>`.
const LEGACY_BADGE =
  /\s?<span class="note-ts-badge" data-chapter="(\d+)" data-seconds="(\d+(?:\.\d+)?)">\[[^\]<]*\]<\/span>\s?/g;

/**
 * Returns the TipTap JSON with legacy literal-markup timestamps converted into timestampBadge
 * nodes (text marks are kept on the surrounding text). `changed` tells whether anything was found.
 */
export function upgradeLegacyTimestamps(doc: any): { doc: any; changed: boolean } {
  let changed = false;

  const visit = (node: any): any => {
    if (!node || typeof node !== "object" || !Array.isArray(node.content)) return node;
    const content: any[] = [];
    for (const child of node.content) {
      if (child?.type === "text" && typeof child.text === "string" && child.text.includes("note-ts-badge")) {
        let last = 0;
        for (const m of child.text.matchAll(LEGACY_BADGE)) {
          changed = true;
          const before = child.text.slice(last, m.index);
          if (before) content.push({ ...child, text: before });
          if (m[0].startsWith(" ")) content.push({ type: "text", text: " " });
          content.push({ type: "timestampBadge", attrs: { chapter: Number(m[1]), seconds: Math.floor(Number(m[2])) } });
          if (m[0].endsWith(" ")) content.push({ type: "text", text: " " });
          last = m.index! + m[0].length;
        }
        const rest = child.text.slice(last);
        if (rest) content.push({ ...child, text: rest });
      } else {
        content.push(visit(child));
      }
    }
    // Merge adjacent plain spaces produced above with neighbouring unmarked text
    const merged: any[] = [];
    for (const c of content) {
      const prev = merged[merged.length - 1];
      if (prev?.type === "text" && c.type === "text" && !prev.marks && !c.marks) prev.text += c.text;
      else merged.push(c.type === "text" ? { ...c } : c);
    }
    return { ...node, content: merged.filter((c) => c.type !== "text" || c.text !== "") };
  };

  const upgraded = visit(doc);
  return { doc: changed ? upgraded : doc, changed };
}

/** Plain text of a TipTap JSON document, with timestamps shown as [mm:ss]. */
export function notesToPlainText(node: any): string {
  if (!node || typeof node !== "object") return typeof node === "string" ? node : "";
  if (node.type === "timestampBadge") return `[${formatTimestamp(node.attrs?.seconds ?? 0)}]`;
  if (typeof node.text === "string") {
    return node.text.replace(LEGACY_BADGE, (m: string, _c: string, s: string) =>
      `${m.startsWith(" ") ? " " : ""}[${formatTimestamp(Number(s))}]${m.endsWith(" ") ? " " : ""}`
    );
  }
  if (!Array.isArray(node.content)) return "";
  const block = node.type === "doc" || node.type === "bulletList" || node.type === "orderedList";
  return node.content.map(notesToPlainText).join(block ? "\n" : "").trim();
}
