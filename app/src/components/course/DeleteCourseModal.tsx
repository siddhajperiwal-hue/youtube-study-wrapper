"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { invalidateCache } from "@/lib/cache";

interface DeleteCourseModalProps {
  open: boolean;
  courseId: string;
  notesWordCount: number;
  onClose: () => void;
  showToast: (msg: string) => void;
}

/** Two-step delete confirmation (Section 4.7): the user must type DELETE. */
export function DeleteCourseModal({ open, courseId, notesWordCount, onClose, showToast }: DeleteCourseModalProps) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const confirmed = confirmation === "DELETE";

  // Every confirmation starts from an empty field
  const close = () => {
    setConfirmation("");
    onClose();
  };

  const handleConfirmDelete = async () => {
    if (!confirmed) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
      if (res.ok) {
        invalidateCache("/api/courses");
        router.push("/");
      }
    } catch {
      showToast("Failed to delete course");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={`modal-backdrop ${open ? "open" : ""}`}>
      <div className="modal-sheet" style={{ maxWidth: "460px" }}>
        <h3 className="modal-title" style={{ color: "var(--color-error)" }}>
          Are you sure you want to delete this course?
        </h3>
        <p className="modal-desc">
          This action cannot be undone. All chapters, your notes ({notesWordCount} words), and quiz records will be erased.
        </p>

        <div style={{ margin: "16px 0" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "6px" }}>
            Type <strong style={{ color: "var(--color-text-primary)" }}>DELETE</strong> to confirm:
          </label>
          <input
            type="text"
            className="form-input"
            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--color-border)", fontSize: "14px", fontFamily: "var(--font-mono)" }}
            placeholder="DELETE"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!confirmed || isDeleting}
            onClick={handleConfirmDelete}
            style={{
              height: "38px",
              padding: "0 18px",
              background: confirmed ? "var(--color-error)" : "var(--color-border)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: confirmed ? "pointer" : "not-allowed",
            }}
          >
            {isDeleting ? "Deleting..." : "Permanently Delete Course"}
          </button>
        </div>
      </div>
    </div>
  );
}
