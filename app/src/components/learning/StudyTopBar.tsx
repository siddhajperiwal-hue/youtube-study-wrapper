"use client";

import Link from "next/link";
import { BREAK_PRESETS, FOCUS_PRESETS, type FocusTimer } from "./useFocusTimer";
import { formatClock, padChapterNumber, type ChapterDetail, type LearningCourse } from "./types";

interface StudyTopBarProps {
  course: LearningCourse;
  chapter: ChapterDetail;
  timer: FocusTimer;
  isNotesDrawerOpen: boolean;
  onToggleNotesDrawer: () => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  /** Leave to the course page (stops playback first) */
  onBackToCourse: () => void;
}

function FocusTimerPopover({ timer }: { timer: FocusTimer }) {
  const { focusMinutes, breakMinutes, isPaused, isConfigOpen } = timer;
  return (
    <div className={`timer-config-popover ${isConfigOpen ? "open" : ""}`} id="timerConfigPopover">
      <div className="timer-popover-header">
        <span className="timer-popover-title">Focus & Break Intervals</span>
        <span className="timer-popover-badge">20:5 Default</span>
      </div>

      {/* Focus Interval Setting */}
      <div className="timer-config-group">
        <div className="timer-config-label-row">
          <span className="timer-config-label">Focus Session</span>
          <span className="timer-config-val" id="displayFocusVal">{focusMinutes} mins</span>
        </div>
        <div className="timer-presets-row" id="focusPresetsRow">
          {FOCUS_PRESETS.map((m) => (
            <button key={m} className={`btn-timer-preset ${focusMinutes === m ? "active" : ""}`} onClick={() => timer.setFocusMinutes(m)}>
              {m}m {m === 20 ? "(Default)" : ""}
            </button>
          ))}
        </div>
        <div className="timer-stepper-row">
          <span className="stepper-label">Custom Focus Minutes:</span>
          <div className="stepper-ctrls">
            <button className="btn-stepper" id="btnFocusMinus" onClick={() => timer.setFocusMinutes(Math.max(5, focusMinutes - 1))}>
              -
            </button>
            <input
              type="number"
              className="stepper-input"
              value={focusMinutes}
              min={5}
              max={90}
              onChange={(e) => timer.setFocusMinutes(parseInt(e.target.value) || 20)}
            />
            <button className="btn-stepper" id="btnFocusPlus" onClick={() => timer.setFocusMinutes(Math.min(90, focusMinutes + 1))}>
              +
            </button>
          </div>
        </div>
      </div>

      {/* Break Interval Setting */}
      <div className="timer-config-group">
        <div className="timer-config-label-row">
          <span className="timer-config-label">Rest Break</span>
          <span className="timer-config-val" id="displayBreakVal">{breakMinutes} mins</span>
        </div>
        <div className="timer-presets-row" id="breakPresetsRow">
          {BREAK_PRESETS.map((b) => (
            <button key={b} className={`btn-timer-preset ${breakMinutes === b ? "active" : ""}`} onClick={() => timer.setBreakMinutes(b)}>
              {b}m {b === 5 ? "(Default)" : ""}
            </button>
          ))}
        </div>
        <div className="timer-stepper-row">
          <span className="stepper-label">Custom Break Minutes:</span>
          <div className="stepper-ctrls">
            <button className="btn-stepper" id="btnBreakMinus" onClick={() => timer.setBreakMinutes(Math.max(1, breakMinutes - 1))}>
              −
            </button>
            <input
              type="number"
              className="stepper-input"
              value={breakMinutes}
              min={1}
              max={30}
              onChange={(e) => timer.setBreakMinutes(parseInt(e.target.value) || 5)}
            />
            <button className="btn-stepper" id="btnBreakPlus" onClick={() => timer.setBreakMinutes(Math.min(30, breakMinutes + 1))}>
              +
            </button>
          </div>
        </div>
      </div>

      {/* Actions Row */}
      <div className="timer-popover-actions">
        <button className="btn-timer-action ghost" id="btnResetTimerDefaults" onClick={timer.resetDefaults}>
          Reset 20:5
        </button>
        <div style={{ display: "flex", gap: "6px" }}>
          <button className="btn-timer-action secondary" id="btnTimerTogglePause" onClick={timer.togglePause}>
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button className="btn-timer-action primary" id="btnApplyTimerConfig" onClick={timer.apply}>
            Apply & Start
          </button>
        </div>
      </div>
    </div>
  );
}

/** Adaptive top navigation bar (56px): back link, breadcrumb, focus timer, notes drawer + focus mode toggles. */
export function StudyTopBar({
  course,
  chapter,
  timer,
  isNotesDrawerOpen,
  onToggleNotesDrawer,
  isFocusMode,
  onToggleFocusMode,
  onBackToCourse,
}: StudyTopBarProps) {
  return (
    <header className={`study-top-bar ${timer.isConfigOpen ? "has-open-popover" : ""}`} id="studyTopBar">
      <div className="top-left-group">
        <Link
          href={`/course/${course.id}`}
          className="btn-back-course"
          title="Return to Course Syllabus"
          onClick={(e) => {
            e.preventDefault();
            onBackToCourse();
          }}
        >
          <svg className="icon" viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span>Back to Course</span>
        </Link>
      </div>

      <div className="top-center-title" id="topCourseBreadcrumb">
        {course.name} &nbsp;•&nbsp; Chapter {padChapterNumber(chapter.position)}: {chapter.title}
      </div>

      <div className="top-right-group">
        {/* Scientific Focus Timer Widget with Anchor Wrapper */}
        <div className="timer-widget-anchor" id="timerWidgetAnchor">
          <button
            className={`focus-timer-pill ${timer.isConfigOpen ? "active" : ""}`}
            id="focusTimerWidget"
            title="Click to configure study & break intervals"
            onClick={() => timer.setIsConfigOpen(!timer.isConfigOpen)}
          >
            <svg className="icon" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span id="focusTimerText">{formatClock(timer.focusRemainingSec)}</span>
            <svg className="icon" style={{ width: "11px", height: "11px", marginLeft: "1px", opacity: 0.6 }} viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <FocusTimerPopover timer={timer} />
        </div>

        {/* Notes Drawer Toggle Button */}
        <button
          className={`btn-top-notes-drawer ${isNotesDrawerOpen ? "active" : ""}`}
          id="btnTopNotesDrawer"
          title="Toggle Notes Drawer (Key: N)"
          onClick={onToggleNotesDrawer}
        >
          <svg className="icon" viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>Notes</span>
        </button>

        {/* Focus Mode Toggle Button */}
        <button className="btn-focus-mode" id="btnToggleFocusMode" title="Enter Distraction-Free Focus Mode (Key: F)" onClick={onToggleFocusMode}>
          <svg className="icon" viewBox="0 0 24 24">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
          <span id="focusModeBtnLabel">{isFocusMode ? "Exit Focus" : "Focus Mode"}</span>
        </button>
      </div>
    </header>
  );
}
