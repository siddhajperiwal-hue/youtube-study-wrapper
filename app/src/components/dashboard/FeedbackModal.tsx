"use client";

import { useState } from "react";

const CATEGORIES = [
  { id: "bug", label: "Something's broken" },
  { id: "idea", label: "Idea / request" },
  { id: "question", label: "Question" },
  { id: "other", label: "Other" },
] as const;

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  showToast: (msg: string) => void;
}

/** "Send feedback" from the profile menu (styled like the report popover); lands in /admin */
export function FeedbackModal({ open, onClose, showToast }: FeedbackModalProps) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("idea");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!message.trim()) {
      setError("Please write a message first.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message, page: window.location.pathname }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not send feedback.");
      setMessage("");
      onClose();
      showToast("Thanks! Your feedback was sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={`report-popover-backdrop ${open ? "open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="report-popover-card" role="dialog" aria-modal="true" aria-labelledby="feedbackTitle">
        <div className="report-header">
          <div className="report-header-title">
            <svg className="icon" viewBox="0 0 24 24" style={{ width: "16px", height: "16px", stroke: "var(--color-primary)" }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span id="feedbackTitle">Send feedback</span>
          </div>
          <button className="btn-report-close" type="button" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
        <p className="report-subtext">Found a bug or have an idea? It goes straight to the StudyDesk team.</p>

        <div className="report-category-group">
          <span className="report-field-label">Type</span>
          <div className="report-chips-row">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`report-chip ${category === c.id ? "active" : ""}`}
                onClick={() => setCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="report-input-group">
          <label className="report-field-label" htmlFor="feedbackMessageInput">
            Message
          </label>
          <textarea
            id="feedbackMessageInput"
            className="report-textarea"
            rows={4}
            maxLength={4000}
            placeholder="What happened, or what would make StudyDesk better for you?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          ></textarea>
          {error && (
            <span role="alert" style={{ color: "var(--color-error)", fontSize: "12px" }}>
              {error}
            </span>
          )}
        </div>

        <div className="report-actions-row">
          <button type="button" className="btn btn-ghost" style={{ height: "32px", padding: "0 14px", fontSize: "13px" }} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ height: "32px", padding: "0 16px", fontSize: "13px" }}
            onClick={submit}
            disabled={sending}
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
