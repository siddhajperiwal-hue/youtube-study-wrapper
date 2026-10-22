import { Node, mergeAttributes } from "@tiptap/react";
import { formatTimestamp } from "./notes-format";

// Clickable video timestamp inside chapter notes. Stored in the TipTap JSON as
// { type: "timestampBadge", attrs: { chapter, seconds } } and rendered as
// <span class="note-ts-badge" data-chapter data-seconds>[mm:ss]</span>, which the learning page's
// notes click handler turns into a seek (or a jump to another chapter).

export const TimestampBadge = Node.create({
  name: "timestampBadge",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      chapter: {
        default: 1,
        parseHTML: (el) => parseInt(el.getAttribute("data-chapter") || "1", 10),
        renderHTML: (attrs) => ({ "data-chapter": attrs.chapter }),
      },
      seconds: {
        default: 0,
        parseHTML: (el) => parseInt(el.getAttribute("data-seconds") || "0", 10),
        renderHTML: (attrs) => ({ "data-seconds": attrs.seconds }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span.note-ts-badge" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: "note-ts-badge",
        contenteditable: "false",
        title: `Jump to ${formatTimestamp(node.attrs.seconds)}`,
      }),
      `[${formatTimestamp(node.attrs.seconds)}]`,
    ];
  },

  renderText({ node }) {
    return `[${formatTimestamp(node.attrs.seconds)}]`;
  },
});
