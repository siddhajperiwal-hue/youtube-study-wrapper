"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { Theme } from "@/hooks/useTheme";
import { createClient } from "@/lib/supabase/client";
import { invalidateCache } from "@/lib/cache";
import type { StreakData } from "./types";

interface DashboardHeaderProps {
  streak: StreakData;
  streakLoaded: boolean;
  theme: Theme;
  onToggleTheme: () => void;
  onAddCourse: () => void;
  onSendFeedback: () => void;
}

/** 2.1 Global Top Navigation Bar (56px) with streak badge, Add Course and the profile menu (2.2). */
export function DashboardHeader({
  streak,
  streakLoaded,
  theme,
  onToggleTheme,
  onAddCourse,
  onSendFeedback,
}: DashboardHeaderProps) {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getClaims()
      .then(({ data }) => setUserEmail((data?.claims?.email as string | undefined) ?? null))
      .catch(() => {});
    fetch("/api/admin/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setIsAdmin(!!body?.isAdmin))
      .catch(() => {});
  }, []);

  const signOut = async () => {
    await createClient().auth.signOut();
    invalidateCache();
    // Full page load so no page kept mounted in the background still shows this account's data
    window.location.assign("/login");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsProfileDropdownOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Run a menu action and close the menu
  const menuAction = (action: () => void) => () => {
    action();
    setIsProfileDropdownOpen(false);
  };

  return (
    <header className="top-nav">
      <div className="top-nav-inner">
        <Link href="/" className="brand-logo" title="StudyDesk Dashboard">
          <div className="brand-logo-mark">
            <svg className="icon" viewBox="0 0 24 24">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
              <path d="M6 6h10"></path>
              <path d="M6 10h10"></path>
            </svg>
          </div>
          <span className="brand-title">StudyDesk</span>
        </Link>

        <div className="top-nav-actions">
          {/* Habit Streak Badge */}
          <div
            className={`streak-badge ${streak.todayQualifies ? "active-today" : ""}`}
            id="streakBadge"
            title={`${streak.streak} consecutive study days. Watch 20 minutes today to maintain your streak (${Math.max(0, 20 - streak.todayMinutes)} mins remaining today).`}
          >
            <svg className="icon" viewBox="0 0 24 24">
              <path d="M12 2c0 4-4 6-4 10a6 6 0 0 0 12 0c0-4-3-7-3-7s-1 2-2 3c-1-2-1-4-3-6z"></path>
            </svg>
            <span id="streakCountText">{streakLoaded ? `${streak.streak} Day Streak` : "– Day Streak"}</span>
          </div>

          {/* + Add Course Button */}
          <button
            className="btn-add-course"
            id="btnAddCourseModal"
            title="Import a new YouTube playlist"
            onClick={onAddCourse}
          >
            <svg className="icon" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>+ Add Course</span>
          </button>

          {/* Profile & Utilities Dropdown (Section 2.2) */}
          <div className="profile-menu-container" id="profileMenuContainer">
            <button
              className="avatar-btn"
              id="profileAvatarBtn"
              aria-haspopup="true"
              aria-expanded={isProfileDropdownOpen}
              title="Account & Utilities"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            >
              <svg className="icon avatar-icon" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </button>
            <div className={`profile-dropdown-menu ${isProfileDropdownOpen ? "open" : ""}`} id="profileDropdownMenu" role="menu">
              <div className="dropdown-header">
                <span className="user-name">Your Account</span>
                <span className="user-status" title={userEmail ?? undefined}>{userEmail ?? "Self-paced Learner"}</span>
              </div>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item" id="themeToggleItem" role="menuitem" onClick={menuAction(onToggleTheme)}>
                <div className="item-content">
                  <span className="item-icon">{theme === "dark" ? "☀️" : "🌙"}</span>
                  <span className="item-label">Theme: {theme === "dark" ? "Warm Espresso" : "Warm Paper"}</span>
                </div>
              </button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item" id="feedbackItem" role="menuitem" onClick={menuAction(onSendFeedback)}>
                <div className="item-content">
                  <span className="item-icon">💬</span>
                  <span className="item-label">Send Feedback</span>
                </div>
              </button>
              {isAdmin && (
                <Link className="dropdown-item" id="adminItem" role="menuitem" href="/admin" onClick={() => setIsProfileDropdownOpen(false)}>
                  <div className="item-content">
                    <span className="item-icon">📊</span>
                    <span className="item-label">Admin Dashboard</span>
                  </div>
                </Link>
              )}
              <button className="dropdown-item" id="signOutItem" role="menuitem" onClick={menuAction(signOut)}>
                <div className="item-content">
                  <span className="item-icon">↪</span>
                  <span className="item-label">Sign out</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
