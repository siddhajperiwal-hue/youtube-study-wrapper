"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { fetchWithCache, prefetchData } from "@/lib/cache";
import { usePageVisible } from "@/hooks/usePageVisible";
import { useToast } from "@/hooks/useToast";
import { ReportModal } from "@/components/ReportModal";
import { ChapterNavBar } from "@/components/learning/ChapterNavBar";
import { DescriptionPanel } from "@/components/learning/DescriptionPanel";
import { GuardedNavModal, PrototypeStrip } from "@/components/learning/LearningModals";
import { NotesPanel } from "@/components/learning/NotesPanel";
import { AdsHelpNote } from "@/components/learning/AdsHelpNote";
import { PlayerControls } from "@/components/learning/PlayerControls";
import { StudyTopBar } from "@/components/learning/StudyTopBar";
import { BreakOverlay, PlayOverlay, QuizOverlay, RecallOverlay } from "@/components/learning/VideoOverlays";
import {
  formatClock,
  type ChapterDetail,
  type ChapterNavigation,
  type ChapterResource,
  type ChapterResponse,
  type ChapterSummary,
  type GuardedTarget,
  type LearningCourse,
  type QuizQuestion,
} from "@/components/learning/types";
import { useChapterQuiz } from "@/components/learning/useChapterQuiz";
import { useFocusMode } from "@/components/learning/useFocusMode";
import { useFocusTimer } from "@/components/learning/useFocusTimer";
import { useNotesEditor } from "@/components/learning/useNotesEditor";
import { useStudyTracking } from "@/components/learning/useStudyTracking";
import { useYouTubePlayer } from "@/components/learning/useYouTubePlayer";
import "@/styles/learning.css";

const LEARNING_REPORT_CATEGORIES = ["Incorrect Answer", "Typo / Grammar", "Unclear Phrasing", "Other"];

function LearningPageContent() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;
  const videoId = params?.videoId as string;
  const { toastMessage, showToast } = useToast(2800);

  // Chapter data
  const [course, setCourse] = useState<LearningCourse | null>(null);
  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [chaptersList, setChaptersList] = useState<ChapterSummary[]>([]);
  const [chapterResources, setChapterResources] = useState<ChapterResource[]>([]);
  const [navigation, setNavigation] = useState<ChapterNavigation>({ prev: null, next: null });
  const [loading, setLoading] = useState(true);
  const [initialStartSec, setInitialStartSec] = useState(0);
  const [origin, setOrigin] = useState("");
  // Chapter whose data is being loaded, so a late response for a chapter we've left is dropped
  const activeVideoIdRef = useRef<string | null>(null);

  // Recall refresher (shown after >= 24h away)
  const [showRecallOverlay, setShowRecallOverlay] = useState(false);
  const [recallQuestions, setRecallQuestions] = useState<QuizQuestion[]>([]);
  const [recallTimeAwayText, setRecallTimeAwayText] = useState("over 24 hours");

  // Dialogs
  const [guardedTarget, setGuardedTarget] = useState<GuardedTarget | null>(null);
  const [report, setReport] = useState<{ open: boolean; type: string; questionId: string | null }>({
    open: false,
    type: "Question",
    questionId: null,
  });
  const openReport = (type: string, questionId: string | null) => setReport({ open: true, type, questionId });

  // Focus Mode notes drawer
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false);
  const [notesWidth, setNotesWidth] = useState<number | null>(null);
  const notesColumnRef = useRef<HTMLElement | null>(null);

  const playerIframeRef = useRef<HTMLIFrameElement | null>(null);
  const player = useYouTubePlayer({
    iframeRef: playerIframeRef,
    videoId,
    durationSec: chapter?.durationSec || 0,
    showToast,
    // End of video after real watching: open the end-of-chapter quiz (once)
    onReachedEnd: () => {
      if (course?.quizzesEnabled !== false && !quiz.hasTriggered() && !quiz.show) quiz.trigger();
    },
    onRewound: () => quiz.allowRetrigger(),
  });

  // Safe navigation that terminates YouTube audio before leaving the chapter
  const stopPlaybackAndNavigate = (targetUrl: string) => {
    player.stop();
    setChapter(null);
    setLoading(true);
    router.push(targetUrl);
  };
  const goToChapter = (chapterId: string) => stopPlaybackAndNavigate(`/course/${courseId}/learn/${chapterId}`);

  // Warm a chapter's route and data so navigating to it renders without waiting on the API
  const prefetchChapter = (chapterId: string) => {
    router.prefetch(`/course/${courseId}/learn/${chapterId}`);
    prefetchData(`/api/courses/${courseId}/chapters/${chapterId}`);
  };

  const quiz = useChapterQuiz({
    courseId,
    videoId,
    onOpen: player.pause,
    onSkipped: () => {
      if (navigation.next) goToChapter(navigation.next.id);
    },
    showToast,
  });

  const timer = useFocusTimer({
    isPlaying: player.isPlaying,
    onBreakStart: player.pause,
    // Section 6: auto-rewind 5 seconds when the break ends
    onBreakEnd: () => {
      player.resumeWithRewind(5);
      showToast("Resumed playback with 5s context rewind ✓");
    },
    showToast,
  });

  const focusMode = useFocusMode(showToast, () => {
    setIsNotesDrawerOpen(false);
    setNotesWidth(null);
  });

  const notes = useNotesEditor(courseId, videoId, showToast);

  // The YouTube player only exists while this page is on screen (see usePageVisible)
  const isPageVisible = usePageVisible(player.silence);

  useStudyTracking({
    courseId,
    videoId,
    isPlaying: player.isPlaying,
    currentTimeSec: player.currentTimeSec,
    durationSec: chapter ? chapter.durationSec : null,
  });

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Controls auto-hide while playing (and the cursor hides in Focus Mode)
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleMouseMove = () => {
    setIsControlsVisible(true);
    document.body.classList.remove("mouse-idle");
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (player.isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false);
        if (focusMode.isFocusMode) document.body.classList.add("mouse-idle");
      }, 2800);
    }
  };

  const loadChapterData = async () => {
    try {
      const data = await fetchWithCache<ChapterResponse>(`/api/courses/${courseId}/chapters/${videoId}`, 60000);
      if (!data?.chapter) throw new Error("Failed to load chapter");
      if (activeVideoIdRef.current !== videoId) return; // user already moved to another chapter

      setCourse(data.course);
      setChapter(data.chapter);
      setChaptersList(data.chaptersList || []);
      setNavigation(data.navigation);
      setChapterResources(data.resources || []);

      // Resume where the user left off, but restart at 0:00 if the chapter is completed or left at the very end
      const { status, lastPositionSec, durationSec } = data.chapter;
      const finished = status === "completed" || status === "completed_without_quiz" || lastPositionSec >= durationSec - 3;
      const startSec = !finished && lastPositionSec > 0 ? lastPositionSec : 0;
      setInitialStartSec(startSec);
      player.resetClock(startSec);

      notes.loadNotes(videoId, data.notes?.content ?? null);

      // Recall refresher: only after >= 24h of inactivity, and once per browser session
      const sessionKey = `recall_session_${courseId}`;
      const alreadyHandledInSession = sessionStorage.getItem(sessionKey);
      if (data.recall?.eligible && data.recall.questions?.length > 0 && !alreadyHandledInSession) {
        setRecallQuestions(data.recall.questions);
        if (data.recall.timeAwayText) setRecallTimeAwayText(data.recall.timeAwayText);
        setShowRecallOverlay(true);
        sessionStorage.setItem(sessionKey, "true");
      } else {
        setShowRecallOverlay(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load chapter data whenever the chapter changes
  useEffect(() => {
    if (courseId && videoId) {
      activeVideoIdRef.current = videoId;
      notes.beginChapter();
      quiz.reset();
      player.setIsPlaying(false);
      player.resetClock(0);
      setShowRecallOverlay(false);
      timer.setShowBreakOverlay(false);
      setChapter(null);
      setLoading(true);
      loadChapterData();
    }
    // Leaving this chapter (navigation or unmount): save any edit still waiting on the debounce
    return () => notes.flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, videoId]);

  // Prefetch next and previous chapters in the background
  useEffect(() => {
    if (navigation.next?.id) prefetchChapter(navigation.next.id);
    if (navigation.prev?.id) prefetchChapter(navigation.prev.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation.next?.id, navigation.prev?.id, courseId, router]);

  const insertCurrentTimestamp = () => {
    if (!chapter) return;
    notes.insertTimestamp(chapter.position, player.currentTimeSec);
  };

  // Timestamp badges in the notes: seek in this chapter, or confirm before switching chapters
  const handleNotesCanvasClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest(".note-ts-badge");
    if (!target) return;
    const targetChapterPos = parseInt(target.getAttribute("data-chapter") || "0");
    const targetSeconds = parseInt(target.getAttribute("data-seconds") || "0");

    if (chapter && targetChapterPos === chapter.position) {
      player.seekTo(targetSeconds);
      showToast(`Jumped to ${formatClock(targetSeconds)} in current chapter`);
    } else {
      const found = chaptersList.find((c) => c.position === targetChapterPos);
      if (found) setGuardedTarget({ chapterId: found.id, position: targetChapterPos, seconds: targetSeconds });
    }
  };

  const dismissRecall = () => {
    setShowRecallOverlay(false);
    sessionStorage.setItem(`recall_session_${courseId}`, "true");
    player.play();
  };

  // Keyboard shortcuts (re-registered every render so handlers always see current state)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Quiz overlay: 1–4 pick an option, Enter/→ next or submit, ← back
      if (quiz.show && !quiz.submitted && quiz.questions.length > 0) {
        const currentQ = quiz.questions[quiz.currentIdx];
        if (["1", "2", "3", "4"].includes(e.key)) {
          e.preventDefault();
          const optIdx = parseInt(e.key) - 1;
          if (currentQ && optIdx < currentQ.options.length) quiz.selectAnswer(currentQ.id, optIdx);
          return;
        }
        if (e.key === "Enter" || e.key === "ArrowRight") {
          e.preventDefault();
          if (currentQ && quiz.answers[currentQ.id] !== undefined) {
            if (quiz.currentIdx < quiz.questions.length - 1) quiz.setCurrentIdx((prev) => prev + 1);
            else quiz.submit();
          }
          return;
        }
        if (e.key === "ArrowLeft" && quiz.currentIdx > 0) {
          e.preventDefault();
          quiz.setCurrentIdx((prev) => prev - 1);
          return;
        }
      }

      // Typing in the notes editor / an input: only Alt+T (insert timestamp) is a shortcut
      const activeEl = document.activeElement;
      if (
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.getAttribute("contenteditable") === "true" ||
        activeEl?.classList.contains("ProseMirror")
      ) {
        if (e.altKey && (e.key === "t" || e.key === "T")) {
          e.preventDefault();
          insertCurrentTimestamp();
        }
        return;
      }

      if (e.key === " ") {
        const isInteractive =
          activeEl?.tagName === "BUTTON" ||
          activeEl?.tagName === "A" ||
          activeEl?.tagName === "SELECT" ||
          activeEl?.closest("button, a, [role='button'], .video-description-accordion, .notes-scroll-container, .notes-column, .test-simulation-strip");
        if (!isInteractive) {
          e.preventDefault();
          player.togglePlayPause();
        }
        return;
      }

      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        player.togglePlayPause();
      } else if (e.key === "0" || e.key === "Home") {
        e.preventDefault();
        player.restart();
      } else if (e.key === "j" || e.key === "J" || e.key === "ArrowLeft") {
        e.preventDefault();
        player.seekRelative(-5);
      } else if (e.key === "l" || e.key === "L" || e.key === "ArrowRight") {
        e.preventDefault();
        player.seekRelative(5);
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        insertCurrentTimestamp();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        player.toggleMute();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        focusMode.toggleFocusMode();
      } else if ((e.key === "n" || e.key === "N") && focusMode.isFocusMode) {
        e.preventDefault();
        setIsNotesDrawerOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        if (report.open) setReport((r) => ({ ...r, open: false }));
        else if (timer.isConfigOpen) timer.setIsConfigOpen(false);
        else if (guardedTarget) setGuardedTarget(null);
        else if (focusMode.isFocusMode && isNotesDrawerOpen) setIsNotesDrawerOpen(false);
        else if (focusMode.isFocusMode) focusMode.toggleFocusMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (loading && !chapter) {
    return (
      <div className="learning-page-wrapper">
        <header className="study-top-bar" id="studyTopBar">
          <div className="top-left-group">
            <Link href={`/course/${courseId}`} className="btn-back-course" title="Return to Course Syllabus">
              <svg className="icon" viewBox="0 0 24 24">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              <span>Syllabus</span>
            </Link>
          </div>
        </header>
        <div style={{ flex: 1, display: "flex", gap: "20px", padding: "20px", opacity: 0.65 }}>
          <div style={{ flex: 1.6, background: "#11100F", borderRadius: "8px", minHeight: "400px" }} />
          <div style={{ flex: 1, background: "var(--color-surface)", borderRadius: "8px", minHeight: "400px", border: "1px solid var(--color-border-subtle)" }} />
        </div>
      </div>
    );
  }

  if (!chapter || !course) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
        <h2 style={{ fontFamily: "var(--font-serif)" }}>Chapter not found</h2>
        <Link href={`/course/${courseId}`} style={{ color: "var(--color-primary)", fontSize: "13px" }}>
          Return to course syllabus
        </Link>
      </div>
    );
  }

  return (
    <div className={`learning-page-wrapper ${focusMode.isFocusMode ? "focus-mode" : ""}`} onMouseMove={handleMouseMove}>
      {/* Invisible hover trigger for auto-revealing top bar in Focus Mode */}
      <div className="top-hover-trigger"></div>

      <StudyTopBar
        course={course}
        chapter={chapter}
        timer={timer}
        isNotesDrawerOpen={isNotesDrawerOpen}
        onToggleNotesDrawer={() => setIsNotesDrawerOpen(!isNotesDrawerOpen)}
        isFocusMode={focusMode.isFocusMode}
        onToggleFocusMode={focusMode.toggleFocusMode}
        onBackToCourse={() => stopPlaybackAndNavigate(`/course/${course.id}`)}
      />

      {/* Main Viewport (60% Video / 40% Notes) */}
      <main className="study-theater-container">
        <section className="video-column" id="videoColumn">
          {/* 16:9 Video Player Container */}
          <div className="video-player-wrapper" id="videoPlayerWrapper">
            {isPageVisible && (
              <iframe
                key={`${chapter.id}-${chapter.youtubeVideoId}`}
                ref={playerIframeRef}
                src={`https://www.youtube-nocookie.com/embed/${chapter.youtubeVideoId}?enablejsapi=1${
                  origin ? `&origin=${encodeURIComponent(origin)}` : ""
                }&controls=0&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3&fs=0&start=${Math.floor(initialStartSec)}&autoplay=1`}
                title={chapter.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: "100%", height: "100%", border: "none", position: "absolute", top: 0, left: 0 }}
                onLoad={() => player.handleIframeLoad(initialStartSec)}
              />
            )}

            {!player.isPlaying && !showRecallOverlay && !quiz.show && !timer.showBreakOverlay && (
              <PlayOverlay onPlay={player.togglePlayPause} />
            )}

            <RecallOverlay
              visible={showRecallOverlay}
              questions={recallQuestions}
              timeAwayText={recallTimeAwayText}
              onReport={(id) => openReport("Recall Question", id)}
              onContinue={dismissRecall}
            />

            <QuizOverlay
              quiz={quiz}
              chapterPosition={chapter.position}
              nextChapter={navigation.next}
              onReport={(id) => openReport("Quiz Question", id)}
              onNextChapterHover={prefetchChapter}
              onGoToChapter={goToChapter}
              onRewatch={(seconds) => {
                quiz.rewatch();
                player.seekTo(seconds);
                player.play();
                showToast(`Replaying from ${formatClock(seconds)}. The quiz reopens when the video ends.`);
              }}
            />

            {quiz.rewatching && !quiz.show && (
              <button type="button" className="btn-back-to-quiz" onClick={quiz.resume}>
                Back to quiz ↩
              </button>
            )}

            <BreakOverlay
              visible={timer.showBreakOverlay}
              breakMinutes={timer.breakMinutes}
              remainingSec={timer.breakRemainingSec}
              onResume={timer.resumeFromBreak}
            />

            <PlayerControls
              player={player}
              durationSec={chapter.durationSec}
              visible={isControlsVisible}
              isFocusMode={focusMode.isFocusMode}
              onToggleFocusMode={focusMode.toggleFocusMode}
              onInsertTimestamp={insertCurrentTimestamp}
            />
          </div>

          <ChapterNavBar
            chapter={chapter}
            chaptersList={chaptersList}
            navigation={navigation}
            onGoToChapter={goToChapter}
            onPrefetchChapter={prefetchChapter}
          />

          <AdsHelpNote />

          <DescriptionPanel key={chapter.id} description={chapter.description} resources={chapterResources} onSeek={player.seekTo} />
        </section>

        <NotesPanel
          editor={notes.editor}
          chapter={chapter}
          chaptersList={chaptersList}
          saveStatus={notes.saveStatus}
          currentTimeSec={player.currentTimeSec}
          onInsertTimestamp={insertCurrentTimestamp}
          onCanvasClick={handleNotesCanvasClick}
          isDrawerOpen={isNotesDrawerOpen}
          onPushBack={() => setIsNotesDrawerOpen(false)}
          isFocusMode={focusMode.isFocusMode}
          width={notesWidth}
          onWidthChange={setNotesWidth}
          columnRef={notesColumnRef}
        />
      </main>

      <PrototypeStrip
        onRecall={async () => {
          player.pause();
          if (recallQuestions.length === 0) {
            try {
              const res = await fetch(`/api/courses/${courseId}/recall?force=true`);
              const rData = await res.json();
              if (rData.questions && rData.questions.length > 0) {
                setRecallQuestions(rData.questions);
                setRecallTimeAwayText(rData.timeAwayText || "over 24 hours");
              }
            } catch {}
          }
          setShowRecallOverlay(true);
        }}
        onQuiz={() => {
          quiz.allowRetrigger();
          quiz.trigger();
        }}
        onBreak={timer.triggerBreak}
      />

      <GuardedNavModal
        target={guardedTarget}
        currentChapterPosition={chapter.position}
        onCancel={() => setGuardedTarget(null)}
        onConfirm={(target) => goToChapter(target.chapterId)}
      />

      <ReportModal
        open={report.open}
        itemType={report.type}
        itemId={report.questionId || ""}
        onClose={() => setReport((r) => ({ ...r, open: false }))}
        showToast={showToast}
        categories={LEARNING_REPORT_CATEGORIES}
        titleId="reportCardTitle"
        subtext={`Help us keep this ${report.type.toLowerCase()} accurate and clear.`}
        placeholder="Briefly describe what needs correction..."
        successMessage={(category) => `Report submitted (${category}). Thank you!`}
        failureMessage="Report submitted. Thank you!"
      />

      <div className={`toast-pill ${toastMessage ? "show" : ""}`} id="toastPill">
        <svg className="icon" viewBox="0 0 24 24" style={{ color: "var(--color-primary)" }}>
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span id="toastMsgText">{toastMessage}</span>
      </div>
    </div>
  );
}

export default function LearningPage() {
  return (
    <Suspense
      fallback={
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: "14px", color: "var(--color-text-secondary)" }}>
          Loading learning theater...
        </div>
      }
    >
      <LearningPageContent />
    </Suspense>
  );
}
