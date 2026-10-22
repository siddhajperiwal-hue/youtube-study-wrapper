"use client";

import React, { useRef, useState } from "react";
import { formatClock } from "./types";
import type { YouTubePlayer } from "./useYouTubePlayer";

interface ScrubberProps {
  durationSec: number;
  displayTimeSec: number;
  /** Drag started/ended (while dragging, YouTube time updates don't move the bar) */
  onScrubbingChange: (scrubbing: boolean) => void;
  /** Bar position while dragging */
  onPreview: (sec: number) => void;
  /** Drag released / clicked: seek */
  onSeek: (sec: number) => void;
}

/** Seek bar with click & drag (mouse + touch) and a hover time tooltip. */
function Scrubber({ durationSec, displayTimeSec, onScrubbingChange, onPreview, onSeek }: ScrubberProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const isScrubbingRef = useRef(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [tooltipTimeSec, setTooltipTimeSec] = useState<number | null>(null);
  const [tooltipLeftPercent, setTooltipLeftPercent] = useState(0);

  const ratioAt = (clientX: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };
  const secondsAt = (clientX: number) => (trackRef.current && durationSec ? ratioAt(clientX) * durationSec : 0);

  const setScrubbing = (scrubbing: boolean) => {
    isScrubbingRef.current = scrubbing;
    setIsScrubbing(scrubbing);
    onScrubbingChange(scrubbing);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!trackRef.current || !durationSec) return;
    setScrubbing(true);
    onPreview(secondsAt(e.clientX));

    const onMouseMove = (moveEvt: MouseEvent) => {
      const sec = secondsAt(moveEvt.clientX);
      onPreview(sec);
      if (trackRef.current) {
        setTooltipTimeSec(sec);
        setTooltipLeftPercent(ratioAt(moveEvt.clientX) * 100);
      }
    };
    const onMouseUp = (upEvt: MouseEvent) => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setScrubbing(false);
      onSeek(secondsAt(upEvt.clientX));
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1 || !durationSec) return;
    setScrubbing(true);
    onPreview(secondsAt(e.touches[0].clientX));

    const onTouchMove = (moveEvt: TouchEvent) => {
      if (moveEvt.touches.length !== 1) return;
      onPreview(secondsAt(moveEvt.touches[0].clientX));
    };
    const onTouchEnd = (endEvt: TouchEvent) => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      setScrubbing(false);
      onSeek(secondsAt(endEvt.changedTouches[0].clientX));
    };
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!durationSec || !trackRef.current) return;
    const ratio = ratioAt(e.clientX);
    setTooltipTimeSec(ratio * durationSec);
    setTooltipLeftPercent(ratio * 100);
  };

  const handleMouseLeave = () => {
    if (!isScrubbingRef.current) setTooltipTimeSec(null);
  };

  return (
    <div
      ref={trackRef}
      className={`scrubber-track ${isScrubbing ? "scrubbing" : ""}`}
      id="scrubberTrack"
      title="Seek video (Click or drag)"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {tooltipTimeSec !== null && (
        <div className="scrubber-tooltip visible" style={{ left: `${tooltipLeftPercent}%` }}>
          {formatClock(Math.round(tooltipTimeSec))}
        </div>
      )}
      <div className="scrubber-fill" id="scrubberFill" style={{ width: `${durationSec > 0 ? (displayTimeSec / durationSec) * 100 : 0}%` }}>
        <div className="scrubber-thumb"></div>
      </div>
    </div>
  );
}

function RewindIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24">
      <polyline points="1 4 1 10 7 10"></polyline>
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
    </svg>
  );
}

interface PlayerControlsProps {
  player: YouTubePlayer;
  durationSec: number;
  /** Controls auto-hide while playing until the mouse moves */
  visible: boolean;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  onInsertTimestamp: () => void;
}

/** Bottom control bar: seek bar, play/restart/±5s/mute, time, timestamp insert, speed, fullscreen. */
export function PlayerControls({ player, durationSec, visible, isFocusMode, onToggleFocusMode, onInsertTimestamp }: PlayerControlsProps) {
  const { isPlaying, isMuted, playbackRate, currentTimeSec, displayTimeSec } = player;
  const atEnd = currentTimeSec >= durationSec - 2 && !isPlaying;

  return (
    <div
      className="player-controls-bar"
      id="playerControlsBar"
      style={{
        opacity: !isPlaying || visible ? 1 : 0,
        pointerEvents: !isPlaying || visible ? "auto" : "none",
        transition: "opacity 0.25s ease",
      }}
    >
      <Scrubber
        durationSec={durationSec}
        displayTimeSec={displayTimeSec}
        onScrubbingChange={player.setScrubbing}
        onPreview={player.scrubPreview}
        onSeek={player.seekTo}
      />

      <div className="controls-row">
        <div className="controls-left">
          <button
            className="btn-player-control"
            id="btnPlayPause"
            onClick={player.togglePlayPause}
            aria-label={atEnd ? "Replay Video" : !isPlaying ? "Play" : "Pause"}
            title={atEnd ? "Replay Video (Space / K)" : !isPlaying ? "Play (Space / K)" : "Pause (Space / K)"}
          >
            {atEnd ? (
              <RewindIcon />
            ) : !isPlaying ? (
              <svg className="icon" viewBox="0 0 24 24">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            ) : (
              <svg className="icon" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            )}
          </button>
          <button className="btn-player-control" id="btnRestartVideo" onClick={player.restart} title="Restart Video from 0:00 (0 / Home)" aria-label="Restart Video">
            <RewindIcon />
          </button>
          <button className="btn-player-control" id="btnRewind5s" onClick={() => player.seekRelative(-5)} title="Rewind 5s (J / Left)">
            <RewindIcon />
          </button>
          <button className="btn-player-control" id="btnForward5s" onClick={() => player.seekRelative(5)} title="Forward 5s (L / Right)">
            <svg className="icon" viewBox="0 0 24 24">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
          </button>
          <button className="btn-player-control" id="btnMuteToggle" onClick={player.toggleMute} title={isMuted ? "Unmute (M)" : "Mute (M)"}>
            {isMuted ? (
              <svg className="icon" viewBox="0 0 24 24">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
              </svg>
            ) : (
              <svg className="icon" viewBox="0 0 24 24">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
              </svg>
            )}
          </button>
          <span id="playerTimeDisplay">
            {formatClock(Math.floor(displayTimeSec))} / {formatClock(durationSec)}
          </span>
        </div>

        <div className="controls-right">
          <button className="btn-player-control" id="btnQuickInsertTimestamp" onClick={onInsertTimestamp} title="Insert Timestamp into Notes (T)">
            <svg className="icon" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span style={{ fontSize: "11px", marginLeft: "4px", fontWeight: 600 }}>+ [{formatClock(currentTimeSec)}]</span>
          </button>
          <button className="btn-player-control" id="btnSpeedControl" onClick={player.cyclePlaybackRate} title="Playback Speed">
            {playbackRate}x
          </button>
          <button
            className="btn-player-control"
            id="btnPlayerFullscreen"
            onClick={onToggleFocusMode}
            title={isFocusMode ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
          >
            {isFocusMode ? (
              <svg className="icon" viewBox="0 0 24 24">
                <polyline points="4 14 10 14 10 20"></polyline>
                <polyline points="20 10 14 10 14 4"></polyline>
                <line x1="14" y1="10" x2="21" y2="3"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            ) : (
              <svg className="icon" viewBox="0 0 24 24">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
