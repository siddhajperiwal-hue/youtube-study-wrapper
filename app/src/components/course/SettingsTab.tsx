"use client";

import React from "react";
import type { SettingsForm } from "./useSettingsForm";

interface SettingsTabProps {
  form: SettingsForm;
  isUpdating: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onDeleteClick: () => void;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--color-text-secondary)",
  marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid var(--color-border)",
  background: "var(--color-bg-app)",
  fontSize: "14px",
};

/** Tab 5 (4.7): course identity & preferences, plus the Danger Zone. */
export function SettingsTab({ form, isUpdating, onSubmit, onDeleteClick }: SettingsTabProps) {
  return (
    <section className="tab-pane active" id="tab-settings" role="tabpanel" style={{ maxWidth: "600px" }}>
      <form onSubmit={onSubmit} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "28px", boxShadow: "var(--shadow-sm)" }}>
        <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", marginBottom: "18px" }}>Course Identity & Preferences</h3>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>COURSE TITLE</label>
          <input
            type="text"
            className="form-input"
            style={{ ...inputStyle, width: "100%" }}
            value={form.name}
            onChange={(e) => form.setName(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>TARGET COMPLETION DEADLINE</label>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="date"
              className="form-input"
              style={{ ...inputStyle, flex: 1 }}
              value={form.deadline}
              onChange={(e) => form.setDeadline(e.target.value)}
            />
            {form.deadline && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ height: "42px", padding: "0 12px", fontSize: "13px" }}
                onClick={() => form.setDeadline("")}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Preferences Toggles (Non-invalidation rule) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "16px 0", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)", marginBottom: "24px" }}>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontSize: "14px" }}>
            <div>
              <span style={{ fontWeight: 600, display: "block" }}>End-of-Chapter Quizzes</span>
              <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                Active recall MCQs when video ends. Turning OFF never revokes past Mastered statuses.
              </span>
            </div>
            <input type="checkbox" checked={form.quizzes} onChange={(e) => form.setQuizzes(e.target.checked)} />
          </label>

          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontSize: "14px" }}>
            <div>
              <span style={{ fontWeight: 600, display: "block" }}>Generate Recall Flashcards</span>
              <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                Populates the Course Review hub and return recall cards.
              </span>
            </div>
            <input type="checkbox" checked={form.flashcards} onChange={(e) => form.setFlashcards(e.target.checked)} />
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" disabled={isUpdating} className="btn btn-primary" style={{ height: "40px", padding: "0 22px", fontSize: "14px" }}>
            {isUpdating ? "Saving..." : "Save Preferences"}
          </button>
        </div>

        {/* Danger Zone (Section 4.7) */}
        <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "2px dashed var(--color-error)", borderRadius: "8px" }}>
          <h4 style={{ color: "var(--color-error)", fontSize: "15px", fontWeight: 700, marginBottom: "8px" }}>Danger Zone</h4>
          <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "14px" }}>
            Deleting this course removes all chapter progress, notes, and quiz records for your account.
          </p>
          <button
            type="button"
            onClick={onDeleteClick}
            style={{ height: "38px", padding: "0 18px", background: "var(--color-error)", color: "#FFFFFF", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}
          >
            Delete Course...
          </button>
        </div>
      </form>
    </section>
  );
}
