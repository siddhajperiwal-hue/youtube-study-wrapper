import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudyDeskNotes } from "../StudyDeskNotes";
import type { ChapterDetail } from "../types";

const chapter = (over: Partial<ChapterDetail>): ChapterDetail =>
  ({ id: "v1", position: 3, title: "Templates", contentStatus: "ready", summary: null, topics: [], ...over }) as ChapterDetail;
const render = (over: Partial<ChapterDetail>) => renderToStaticMarkup(createElement(StudyDeskNotes, { chapter: chapter(over) }));

describe("StudyDeskNotes", () => {
  it("renders topics, one paragraph per blank-line block and inline code", () => {
    const html = render({ summary: "First uses `pip`.\n\nSecond.", topics: ["Jinja2", "Blocks"] });
    expect(html).toContain("Chapter 03: Templates");
    expect(html.match(/<li>/g)).toHaveLength(2);
    expect(render({ summary: "x", topics: ["Using `url_for`"] })).toContain("<li>Using <code>url_for</code></li>");
    expect(html).toContain("<p>First uses <code>pip</code>.</p><p>Second.</p>");
  });

  it("says the notes are being written while generation is pending", () => {
    expect(render({ contentStatus: "pending" })).toContain("still writing");
    expect(render({ contentStatus: null })).toContain("still writing");
  });

  it("says the notes aren't available when generation failed", () => {
    expect(render({ contentStatus: "failed" })).toContain("aren&#x27;t available");
  });
});
