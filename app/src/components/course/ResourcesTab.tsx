"use client";

import { useMemo, useState } from "react";
import { getResourceMeta, ResourceIcon } from "./resourceMeta";
import { padChapterNumber, type Chapter, type Resource } from "./types";

interface ResourcesTabProps {
  chapters: Chapter[];
  /** Educational (non-promotional) links extracted from video descriptions */
  resources: Resource[];
}

const resourceVideoId = (r: Resource) => r.videoId || r.video_id;

function ResourceRow({ res }: { res: Resource }) {
  const meta = getResourceMeta(res);
  return (
    <a href={res.url} target="_blank" rel="noopener noreferrer" className="resource-row">
      <div className="resource-left">
        <div className="resource-icon-badge">
          <ResourceIcon categoryTag={meta.categoryTag} />
        </div>
        <div className="resource-title-group">
          <span className="resource-title">{meta.title}</span>
          <span className="resource-category-tag">{meta.categoryTag}</span>
        </div>
      </div>
      <div className="resource-right">
        <span className="domain-chip">{res.domain}</span>
        <svg className="icon" style={{ width: "14px", height: "14px", color: "var(--color-text-secondary)" }} viewBox="0 0 24 24">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      </div>
    </a>
  );
}

function ResourceGroup({ title, items }: { title: string; items: Resource[] }) {
  return (
    <div className="chapter-resource-group">
      <div className="group-header">
        <span>{title}</span>
        <span className="group-count-pill">
          {items.length} {items.length === 1 ? "link" : "links"}
        </span>
      </div>
      <div className="resource-items-list">
        {items.map((res) => (
          <ResourceRow key={res.id} res={res} />
        ))}
      </div>
    </div>
  );
}

/** Tab 2 (4.4): links from video descriptions, grouped by chapter, searchable. */
export function ResourcesTab({ chapters, resources }: ResourcesTabProps) {
  const [resourceSearch, setResourceSearch] = useState("");

  const groupedResources = useMemo(() => {
    const query = resourceSearch.toLowerCase().trim();
    const matches = (r: Resource, chapterTitle?: string) => {
      if (!query) return true;
      const meta = getResourceMeta(r);
      return (
        meta.title.toLowerCase().includes(query) ||
        r.label.toLowerCase().includes(query) ||
        r.domain.toLowerCase().includes(query) ||
        r.url.toLowerCase().includes(query) ||
        (chapterTitle !== undefined && chapterTitle.toLowerCase().includes(query))
      );
    };

    const groups: { chapter: Chapter; items: Resource[] }[] = [];
    for (const ch of chapters) {
      const items = resources.filter((r) => resourceVideoId(r) === ch.id && matches(r, ch.title));
      if (items.length > 0) groups.push({ chapter: ch, items });
    }

    // Links not tied to any chapter of this course
    const allChapterVideoIds = new Set(chapters.map((c) => c.id));
    const orphans = resources.filter((r) => {
      const vid = resourceVideoId(r);
      return (!vid || !allChapterVideoIds.has(vid)) && matches(r);
    });

    return { groups, orphans };
  }, [chapters, resources, resourceSearch]);

  const totalMatchingResources =
    groupedResources.groups.reduce((acc, g) => acc + g.items.length, 0) + groupedResources.orphans.length;

  return (
    <section className="tab-pane active" id="tab-resources" role="tabpanel">
      <div className="section-controls-bar">
        <div className="search-input-wrap">
          <svg className="icon search-icon" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="search-input"
            id="resourceSearchInput"
            placeholder="Search resources or code across course..."
            value={resourceSearch}
            onChange={(e) => setResourceSearch(e.target.value)}
          />
          {resourceSearch && (
            <button className="search-clear-btn" onClick={() => setResourceSearch("")} aria-label="Clear resource search">
              ✕
            </button>
          )}
        </div>
        <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
          {resources.length} external links extracted from video descriptions
        </span>
      </div>

      <div className="resources-container" id="resourcesContainer">
        {resources.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "14px" }}>
            No external educational links (GitHub, Drive, Docs, Tools) found in video descriptions.
          </div>
        ) : totalMatchingResources === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "14px" }}>
            No resources match &quot;{resourceSearch}&quot;.
          </div>
        ) : (
          <>
            {groupedResources.groups.map(({ chapter, items }) => (
              <ResourceGroup key={chapter.id} title={`Chapter ${padChapterNumber(chapter.position)}: ${chapter.title}`} items={items} />
            ))}
            {groupedResources.orphans.length > 0 && <ResourceGroup title="Course General Resources" items={groupedResources.orphans} />}
          </>
        )}
      </div>
    </section>
  );
}
