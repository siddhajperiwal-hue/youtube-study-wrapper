"use client";

import { useState } from "react";

/** What the user can report (Section 2.4) */
export type ReportItemType = "Question" | "Flashcard";

export const DEFAULT_REPORT_CATEGORIES = ["Incorrect Answer Key", "Typo / Formatting", "Ambiguous Phrasing", "Other"];

interface ReportModalProps {
  open: boolean;
  /** Shown in the title, e.g. "Question" or "Flashcard" */
  itemType: string;
  /** Question / flashcard id sent to POST /api/questions/[id]/report */
  itemId: string;
  onClose: () => void;
  showToast: (msg: string) => void;
  categories?: string[];
  /** Toast after a successful report */
  successMessage?: (category: string) => string;
  /** Toast if the request fails (null = close silently) */
  failureMessage?: string | null;
  /** Optional id for the title element */
  titleId?: string;
  subtext?: string;
  placeholder?: string;
}

/** Universal "Report question / flashcard" popover (Section 2.4), shared by all pages. */
export function ReportModal({
  open,
  itemType,
  itemId,
  onClose,
  showToast,
  categories = DEFAULT_REPORT_CATEGORIES,
  successMessage = () => "Report submitted. Thank you for helping keep study cards accurate.",
  failureMessage = "Report logged. Thank you!",
  titleId,
  subtext = "Help us keep study materials accurate and clear.",
  placeholder = "Briefly describe what is wrong with this question or explanation...",
}: ReportModalProps) {
  const [category, setCategory] = useState(categories[0]);
  const [reason, setReason] = useState("");

  const submit = async () => {
    if (!itemId) {
      onClose();
      return;
    }
    try {
      await fetch(`/api/questions/${itemId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, reason }),
      });
      onClose();
      setReason("");
      showToast(successMessage(category));
    } catch {
      onClose();
      if (failureMessage) showToast(failureMessage);
    }
  };

  return (
    <div
      className={`report-popover-backdrop ${open ? "open" : ""}`}
      id="reportPopoverBackdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="report-popover-card" onClick={(e) => e.stopPropagation()}>
        <div className="report-header">
          <div className="report-header-title">
            <svg className="icon" viewBox="0 0 24 24" style={{ width: "16px", height: "16px", stroke: "var(--color-primary)" }}>
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
              <line x1="4" y1="22" x2="4" y2="15"></line>
            </svg>
            <span id={titleId}>Report {itemType}</span>
          </div>
          <button className="btn-report-close" type="button" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
        <p className="report-subtext">{subtext}</p>

        <div className="report-category-group">
          <label className="report-field-label">Issue Category</label>
          <div className="report-chips-row">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`report-chip ${category === cat ? "active" : ""}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="report-input-group">
          <label className="report-field-label" htmlFor="reportReasonInput">
            Reason / Details
          </label>
          <textarea
            id="reportReasonInput"
            className="report-textarea"
            rows={3}
            placeholder={placeholder}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          ></textarea>
        </div>

        <div className="report-actions-row">
          <button type="button" className="btn btn-ghost" style={{ height: "32px", padding: "0 14px", fontSize: "13px" }} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" style={{ height: "32px", padding: "0 16px", fontSize: "13px" }} onClick={submit}>
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}
