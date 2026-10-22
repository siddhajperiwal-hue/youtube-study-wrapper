import { describe, it, expect } from "vitest";
import { formatTimestamp, upgradeLegacyTimestamps, notesToPlainText } from "../notes-format";

const legacy = (ch: number, s: number, label: string) =>
  `<span class="note-ts-badge" data-chapter="${ch}" data-seconds="${s}">[${label}]</span>`;

const docWith = (...content: any[]) => ({ type: "doc", content: [{ type: "paragraph", content }] });

describe("formatTimestamp", () => {
  it("formats mm:ss and h:mm:ss", () => {
    expect(formatTimestamp(1)).toBe("00:01");
    expect(formatTimestamp(125.7)).toBe("02:05");
    expect(formatTimestamp(3725)).toBe("1:02:05");
  });
});

describe("upgradeLegacyTimestamps", () => {
  it("turns literal badge markup stored as text into timestampBadge nodes", () => {
    const doc = docWith({ type: "text", text: `hey this is siddhaj ${legacy(3, 25, "00:25")} asdascikkjnasdfc` });
    const { doc: out, changed } = upgradeLegacyTimestamps(doc);
    expect(changed).toBe(true);
    expect(out.content[0].content).toEqual([
      { type: "text", text: "hey this is siddhaj " },
      { type: "timestampBadge", attrs: { chapter: 3, seconds: 25 } },
      { type: "text", text: " asdascikkjnasdfc" },
    ]);
  });

  it("handles several badges, fractional seconds and keeps marks on surrounding text", () => {
    const doc = docWith({ type: "text", text: `a ${legacy(1, 1, "00:01")} b ${legacy(2, 61.4, "01:01")}`, marks: [{ type: "bold" }] });
    const nodes = upgradeLegacyTimestamps(doc).doc.content[0].content;
    expect(nodes.filter((n: any) => n.type === "timestampBadge")).toEqual([
      { type: "timestampBadge", attrs: { chapter: 1, seconds: 1 } },
      { type: "timestampBadge", attrs: { chapter: 2, seconds: 61 } },
    ]);
    expect(nodes[0]).toEqual({ type: "text", text: "a", marks: [{ type: "bold" }] });
  });

  it("returns the same object when there is nothing to upgrade", () => {
    const doc = docWith({ type: "text", text: "plain notes" });
    const res = upgradeLegacyTimestamps(doc);
    expect(res.changed).toBe(false);
    expect(res.doc).toBe(doc);
  });
});

describe("notesToPlainText", () => {
  it("shows badges (new nodes and legacy markup) as [mm:ss]", () => {
    expect(notesToPlainText(docWith({ type: "text", text: "see " }, { type: "timestampBadge", attrs: { chapter: 1, seconds: 90 } }))).toBe("see [01:30]");
    expect(notesToPlainText(docWith({ type: "text", text: `see ${legacy(1, 5, "00:05")} here` }))).toBe("see [00:05] here");
  });

  it("puts paragraphs on separate lines", () => {
    const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "one" }] }, { type: "paragraph", content: [{ type: "text", text: "two" }] }] };
    expect(notesToPlainText(doc)).toBe("one\ntwo");
  });
});
