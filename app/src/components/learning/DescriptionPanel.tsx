"use client";

import { useState } from "react";
import type { ChapterResource } from "./types";

/** Video description with links made clickable and timestamps (02:45, 1:04:20) turned into seek buttons. */
function FormattedDescription({ text, onSeek }: { text: string; onSeek: (sec: number) => void }) {
  if (!text) return <span>No description provided for this video chapter.</span>;

  // Split by URL or timestamp tokens
  const tokenRegex = /(https?:\/\/[^\s<>"'()]+|\b(?:\d{1,2}:)?(?:[0-5]?\d):(?:[0-5]\d)\b)/gi;
  const parts = text.split(tokenRegex);

  return (
    <>
      {parts.map((part, idx) => {
        if (!part) return null;

        if (/^https?:\/\//i.test(part)) {
          const cleanUrl = part.replace(/[.,;:)\]!?*"'>]+$/, "");
          const trailing = part.slice(cleanUrl.length);
          return (
            <span key={idx}>
              <a
                href={cleanUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--color-primary)", textDecoration: "underline", wordBreak: "break-all" }}
              >
                {cleanUrl}
              </a>
              {trailing}
            </span>
          );
        }

        const tsMatch = part.match(/^(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)$/);
        if (tsMatch) {
          const hours = tsMatch[1] ? parseInt(tsMatch[1], 10) : 0;
          const totalSec = hours * 3600 + parseInt(tsMatch[2], 10) * 60 + parseInt(tsMatch[3], 10);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSeek(totalSec)}
              style={{
                display: "inline-block",
                padding: "1px 6px",
                margin: "0 2px",
                background: "var(--color-surface-muted)",
                border: "1px solid var(--color-border)",
                borderRadius: "4px",
                color: "var(--color-primary)",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "none",
              }}
              title={`Jump video to ${part}`}
            >
              {part}
            </button>
          );
        }

        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}

interface DescriptionPanelProps {
  description: string;
  resources: ChapterResource[];
  onSeek: (sec: number) => void;
}

/**
 * Collapsible video description + links extracted from it. Starts collapsed; give it a `key` per
 * chapter so each chapter opens collapsed.
 */
export function DescriptionPanel({ description, resources, onSeek }: DescriptionPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="description-collapsible">
      <button className="desc-header-toggle" id="descHeaderToggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>
          {open ? "▲" : "▼"} Video Description &amp; Extracted Resources
          {resources.length > 0 ? ` (${resources.length} ${resources.length === 1 ? "link" : "links"})` : ""}
        </span>
        <svg className="icon" id="descChevron" viewBox="0 0 24 24">
          <polyline points={open ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}></polyline>
        </svg>
      </button>
      <div className={`desc-body-content ${open ? "open" : ""}`} id="descBodyContent">
        {resources.length > 0 && (
          <div className="desc-resource-chips">
            {resources.map((res) => {
              const isCode = res.category === "github" || (res.domain && res.domain.includes("github"));
              return (
                <a key={res.id} href={res.url} target="_blank" rel="noopener noreferrer" className="resource-chip">
                  {isCode ? (
                    <svg className="icon" viewBox="0 0 24 24">
                      <polyline points="16 18 22 12 16 6"></polyline>
                      <polyline points="8 6 2 12 8 18"></polyline>
                    </svg>
                  ) : (
                    <svg className="icon" viewBox="0 0 24 24">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
                    </svg>
                  )}
                  <span>{res.label || res.domain}</span>
                  <svg className="icon" style={{ width: "12px", height: "12px" }} viewBox="0 0 24 24">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
              );
            })}
          </div>
        )}

        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "13px", lineHeight: "1.7", color: "var(--color-text-secondary)" }}>
          <FormattedDescription text={description} onSeek={onSeek} />
        </div>
      </div>
    </div>
  );
}
