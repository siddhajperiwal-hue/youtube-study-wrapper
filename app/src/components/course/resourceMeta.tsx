import type { Resource } from "./types";

/** Human-friendly title and category for a link extracted from a video description. */
export function getResourceMeta(r: Resource) {
  let categoryTag = "Web Resource";
  let title = r.label || `${r.domain} Resource`;

  try {
    const u = new URL(r.url);
    const pathname = u.pathname.replace(/\/$/, "");
    const segments = pathname.split("/").filter(Boolean);
    const lastSegment = segments.length > 0 ? decodeURIComponent(segments[segments.length - 1]) : "";

    const dom = (r.domain || u.hostname).toLowerCase().replace(/^www\./, "");

    if (dom.includes("github.com")) {
      categoryTag = "Code Repository";
      if (segments.length >= 2) {
        title = segments[1].replace(/[-_]/g, " ") + " Repository";
      } else if (segments.length === 1) {
        title = segments[0].replace(/[-_]/g, " ") + " GitHub Profile";
      } else {
        title = "GitHub Repository";
      }
    } else if (dom.includes("gitlab.com") || dom.includes("bitbucket.org")) {
      categoryTag = "Code Repository";
      title = lastSegment ? `${lastSegment.replace(/[-_]/g, " ")} Repository` : "Code Repository";
    } else if (dom.includes("drive.google.com") || dom.includes("docs.google.com")) {
      categoryTag = "Reference Document";
      title = "Course Reference Document";
    } else if (r.url.toLowerCase().endsWith(".pdf")) {
      categoryTag = "PDF Document";
      title = lastSegment ? lastSegment.replace(/\.pdf$/i, "").replace(/[-_]/g, " ") : "PDF Document";
    } else if (
      dom.includes("getbootstrap.com") ||
      dom.includes("docs.") ||
      dom.includes("palletsprojects.com") ||
      dom.includes("python.org")
    ) {
      categoryTag = "Documentation";
      if (lastSegment && !["en", "stable", "tutorial", "downloads", "index"].includes(lastSegment.toLowerCase())) {
        title = lastSegment.replace(/[-_]/g, " ").replace(/\.(html|php|md)$/i, "") + " Docs";
      } else {
        title = `${dom} Documentation`;
      }
    } else if (dom.includes("code.visualstudio.com") || dom.includes("putty.org") || dom.includes("winscp.net")) {
      categoryTag = "Tool / Environment";
      title = `${dom.replace(/\.(org|net|com)$/, "")} Setup & Download`;
    } else if (dom.includes("digitalocean.com") || dom.includes("exploreflask.com") || dom.includes("techwithtim.net")) {
      categoryTag = "Tutorial Guide";
      if (lastSegment && !["tutorials", "flask"].includes(lastSegment.toLowerCase())) {
        title = lastSegment.replace(/[-_]/g, " ").replace(/\.(html|php|md)$/i, "");
      } else {
        title = `${dom} Guide`;
      }
    } else if (lastSegment) {
      const cleanSeg = lastSegment.replace(/[-_]/g, " ").replace(/\.(html|php|md|txt)$/i, "");
      if (cleanSeg.length > 3 && !/^\d+$/.test(cleanSeg)) {
        title = cleanSeg;
      }
    }
  } catch {}

  // Format title in Title Case
  title = title.replace(/\b\w/g, (c) => c.toUpperCase());
  return { title, categoryTag };
}

export function ResourceIcon({ categoryTag }: { categoryTag: string }) {
  if (categoryTag === "Code Repository") {
    return (
      <svg className="icon" viewBox="0 0 24 24">
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
      </svg>
    );
  }
  if (categoryTag === "Documentation") {
    return (
      <svg className="icon" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    );
  }
  if (categoryTag === "Tool / Environment") {
    return (
      <svg className="icon" viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="8" y1="21" x2="16" y2="21"></line>
        <line x1="12" y1="17" x2="12" y2="21"></line>
      </svg>
    );
  }
  if (categoryTag === "Reference Document" || categoryTag === "PDF Document") {
    return (
      <svg className="icon" viewBox="0 0 24 24">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
      </svg>
    );
  }
  return (
    <svg className="icon" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
  );
}
