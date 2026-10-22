import type { CourseTab } from "./types";

interface CourseTabsProps {
  activeTab: CourseTab;
  onSelect: (tab: CourseTab) => void;
  chapterCount: number;
  resourceCount: number;
  /** Undefined until the review deck has loaded (badge hidden) */
  reviewCount?: number;
}

/** 4.2 5-tab navigation bar. */
export function CourseTabs({ activeTab, onSelect, chapterCount, resourceCount, reviewCount }: CourseTabsProps) {
  const tabs: { id: CourseTab; label: string; badge?: number }[] = [
    { id: "overview", label: "1. Overview", badge: chapterCount },
    { id: "resources", label: "2. Resources", badge: resourceCount },
    { id: "review", label: "3. Review", badge: reviewCount },
    { id: "notes", label: "4. Notes" },
    { id: "settings", label: "5. Settings" },
  ];

  return (
    <nav className="tabs-bar" role="tablist">
      {tabs.map((tab) => (
        <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? "active" : ""}`} onClick={() => onSelect(tab.id)}>
          <span>{tab.label}</span>
          {tab.badge !== undefined && <span className="tab-badge">{tab.badge}</span>}
        </button>
      ))}
    </nav>
  );
}
