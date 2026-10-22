"use client";

import React, { useState } from "react";

interface ValidatedPlaylist {
  title: string;
  channelTitle: string;
  videoCount: number;
  thumbnailUrl: string;
}

interface AddCourseModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful import with the new course id (if returned). */
  onImported: (courseId?: string) => void;
  showToast: (msg: string) => void;
}

/** 2.3 Global Add Course modal: validates a YouTube playlist URL, then imports it as a course. */
export function AddCourseModal({ open, onClose, onImported, showToast }: AddCourseModalProps) {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [generateFlashcards, setGenerateFlashcards] = useState(true);
  const [generateQuizzes, setGenerateQuizzes] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validatedData, setValidatedData] = useState<ValidatedPlaylist | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateUrl = async (url: string) => {
    setPlaylistUrl(url);
    setValidationError(null);
    setValidatedData(null);

    if (!url.trim()) return;

    try {
      setIsValidating(true);
      const res = await fetch("/api/courses/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setValidationError(data.error || "MVP supports playlists only. Please provide a playlist link.");
      } else {
        setValidatedData(data);
        if (!courseTitle) {
          setCourseTitle(data.title);
        }
      }
    } catch {
      setValidationError("Failed to validate playlist on YouTube.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistUrl || validationError) return;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: playlistUrl,
          name: courseTitle || validatedData?.title,
          quizzes_enabled: generateQuizzes,
          flashcards_enabled: generateFlashcards,
          deadline_date: deadlineDate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to import course.");
      } else {
        onClose();
        setPlaylistUrl("");
        setCourseTitle("");
        setValidatedData(null);
        showToast("Course imported successfully. Questions are being prepared.");
        onImported(data.courseId);
      }
    } catch {
      showToast("Error enrolling course.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`modal-backdrop ${open ? "open" : ""}`} id="addCourseModal">
      <div className="modal-sheet">
        <h2 className="modal-title">Import YouTube Playlist</h2>
        <p className="modal-desc">
          Enter a public YouTube playlist URL to structure your course with notes, quizzes, and focus intervals.
        </p>

        <form id="addCourseForm" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="playlistUrlInput">
              YouTube Playlist URL
            </label>
            <input
              type="url"
              id="playlistUrlInput"
              className="form-input"
              placeholder="https://www.youtube.com/playlist?list=..."
              value={playlistUrl}
              onChange={(e) => validateUrl(e.target.value)}
              required
            />
            {isValidating && (
              <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "4px" }}>
                Validating playlist on YouTube...
              </div>
            )}
            {validationError && (
              <div className="validation-hint" id="urlValidationHint" style={{ display: "block" }}>
                ⚠️ {validationError}
              </div>
            )}
            {validatedData && (
              <div style={{ marginTop: "8px", padding: "8px 12px", borderRadius: "8px", background: "var(--color-surface-muted)", border: "1px solid var(--color-border)", fontSize: "13px", display: "flex", gap: "10px", alignItems: "center" }}>
                {validatedData.thumbnailUrl && (
                  <img src={validatedData.thumbnailUrl} alt="" style={{ width: "48px", height: "36px", objectFit: "cover", borderRadius: "4px" }} />
                )}
                <div>
                  <strong style={{ display: "block", color: "var(--color-text-primary)" }}>{validatedData.title}</strong>
                  <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>{validatedData.channelTitle} • {validatedData.videoCount} chapters</span>
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="courseTitleInput">
              Course Title
            </label>
            <input
              type="text"
              id="courseTitleInput"
              className="form-input"
              placeholder="Course Title..."
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="deadlineInput">
              Target Completion Date (Optional)
            </label>
            <input
              type="date"
              id="deadlineInput"
              className="form-input"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
            />
            <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "4px" }}>
              If set, courses will be prioritized on your dashboard and display urgency badges when due within 3 days.
            </div>
          </div>

          <div className="toggle-row">
            <div className="toggle-info">
              <span>End-of-Chapter Quizzes</span>
              <small>Generate active recall quizzes at the end of each video.</small>
            </div>
            <label className="switch">
              <input type="checkbox" checked={generateQuizzes} onChange={(e) => setGenerateQuizzes(e.target.checked)} />
              <span className="slider"></span>
            </label>
          </div>

          <div className="toggle-row">
            <div className="toggle-info">
              <span>Generate Recall Flashcards</span>
              <small>Generate flashcards for the Course Review hub.</small>
            </div>
            <label className="switch">
              <input type="checkbox" checked={generateFlashcards} onChange={(e) => setGenerateFlashcards(e.target.checked)} />
              <span className="slider"></span>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              id="confirmAddBtn"
              disabled={isSubmitting || !playlistUrl || !validatedData}
            >
              {isSubmitting ? "Importing Playlist..." : "Confirm / Import Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
