import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

interface YouTubePlayerOptions {
  /** Ref attached to the YouTube <iframe> */
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  /** Current chapter's video id; the player is torn down whenever it changes */
  videoId: string;
  durationSec: number;
  showToast: (msg: string) => void;
  /** Video ended / reached its last second after being watched substantially (quiz trigger) */
  onReachedEnd: () => void;
  /** The user sought or restarted away from the end, so the end-of-chapter quiz may fire again */
  onRewound: () => void;
}

const PLAYBACK_RATES = [1.0, 1.25, 1.5, 1.75, 2.0];

/**
 * Embedded YouTube player driven through the IFrame postMessage API (no YouTube JS SDK):
 * playback commands, a smooth 60fps clock between YouTube's ~250ms time updates, seeking,
 * mute/speed, and clean teardown so audio never outlives the chapter.
 */
export function useYouTubePlayer({ iframeRef: playerIframeRef, videoId, durationSec, showToast, onReachedEnd, onRewound }: YouTubePlayerOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  // Whole seconds (drives notes timestamps, progress saves); displayTimeSec is the smooth UI clock
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [displayTimeSec, setDisplayTimeSec] = useState(0);
  const exactCurrentTimeRef = useRef(0);
  const lastSyncTimeRef = useRef(0);
  const lastYouTubeUpdateRef = useRef(0);
  const isScrubbingRef = useRef(false);

  // Latest callbacks for long-lived listeners (updated after each render)
  const callbacks = useRef({ onReachedEnd, onRewound });
  useLayoutEffect(() => {
    callbacks.current = { onReachedEnd, onRewound };
  });

  const postToYouTube = (func: string, args: unknown = "") => {
    if (playerIframeRef.current && playerIframeRef.current.contentWindow) {
      playerIframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func, args: args !== undefined ? args : "" }),
        "*"
      );
    }
  };

  /** Hard-stop audio and blank the iframe (before navigating away or hiding the page) */
  const stop = () => {
    setIsPlaying(false);
    try {
      postToYouTube("pauseVideo", "");
      postToYouTube("stopVideo", "");
      postToYouTube("mute", "");
      if (playerIframeRef.current) {
        playerIframeRef.current.src = "about:blank";
      }
    } catch {}
  };

  /** Silence immediately without touching React state (safe during a hide/unmount) */
  const silence = () => {
    if (playerIframeRef.current) playerIframeRef.current.src = "about:blank";
  };

  // Teardown the previous stream whenever the video changes or the component unmounts
  useEffect(() => {
    return () => {
      try {
        postToYouTube("pauseVideo", "");
        postToYouTube("stopVideo", "");
        postToYouTube("mute", "");
        if (playerIframeRef.current) {
          playerIframeRef.current.src = "about:blank";
        }
      } catch {}
      setIsPlaying(false);
    };
  }, [videoId]);

  /** Set the clock to a chapter's start position (doesn't change play state) */
  const resetClock = (startSec: number) => {
    setCurrentTimeSec(startSec);
    setDisplayTimeSec(startSec);
    exactCurrentTimeRef.current = startSec;
    lastSyncTimeRef.current = performance.now();
  };

  const play = () => {
    postToYouTube("playVideo");
    setIsPlaying(true);
  };

  const pause = () => {
    postToYouTube("pauseVideo");
    setIsPlaying(false);
  };

  const seekTo = (targetSec: number) => {
    if (!durationSec) return;
    const bounded = Math.max(0, Math.min(durationSec, targetSec));
    if (bounded < durationSec - 5) callbacks.current.onRewound();
    exactCurrentTimeRef.current = bounded;
    lastSyncTimeRef.current = performance.now();
    setDisplayTimeSec(bounded);
    setCurrentTimeSec(Math.floor(bounded));
    postToYouTube("seekTo", [bounded, true]);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      // Auto-rewind to the start when pressing play at (or near) the end
      if (durationSec > 0 && currentTimeSec >= durationSec - 2) {
        seekTo(0);
      }
      play();
    }
  };

  const seekRelative = (offsetSec: number) => {
    if (!durationSec) return;
    const currentBase = exactCurrentTimeRef.current || currentTimeSec;
    seekTo(Math.max(0, Math.min(durationSec, currentBase + offsetSec)));
    showToast(`${offsetSec > 0 ? "Forward" : "Rewind"} ${Math.abs(offsetSec)}s`);
  };

  const restart = () => {
    if (!durationSec) return;
    exactCurrentTimeRef.current = 0;
    lastSyncTimeRef.current = performance.now();
    setDisplayTimeSec(0);
    setCurrentTimeSec(0);
    callbacks.current.onRewound();
    postToYouTube("seekTo", [0, true]);
    play();
    showToast("Restarted from beginning ↺");
  };

  /** Resume after a break, rewinding a few seconds for context */
  const resumeWithRewind = (rewindSec: number) => {
    const rewindTarget = Math.max(0, currentTimeSec - rewindSec);
    setCurrentTimeSec(rewindTarget);
    postToYouTube("seekTo", [rewindTarget, true]);
    play();
  };

  const toggleMute = () => {
    if (isMuted) {
      postToYouTube("unMute");
      setIsMuted(false);
      showToast("Sound unmuted");
    } else {
      postToYouTube("mute");
      setIsMuted(true);
      showToast("Sound muted");
    }
  };

  const cyclePlaybackRate = () => {
    const nextRate = PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(playbackRate) + 1) % PLAYBACK_RATES.length];
    setPlaybackRate(nextRate);
    postToYouTube("setPlaybackRate", [nextRate]);
    showToast(`Speed: ${nextRate}x`);
  };

  /** iframe onLoad: subscribe to YouTube events, restore position and start playing */
  const handleIframeLoad = (startSec: number) => {
    if (playerIframeRef.current?.contentWindow) {
      playerIframeRef.current.contentWindow.postMessage(JSON.stringify({ event: "listening" }), "*");
      postToYouTube("seekTo", [exactCurrentTimeRef.current || startSec || 0, true]);
      play();
    }
  };

  // Scrubbing: while dragging, the clock follows the pointer instead of YouTube
  const scrubPreview = (sec: number) => setDisplayTimeSec(sec);
  const setScrubbing = (scrubbing: boolean) => {
    isScrubbingRef.current = scrubbing;
  };

  // Smooth progress between YouTube updates (requestAnimationFrame)
  useEffect(() => {
    let animId: number;
    const updateLoop = () => {
      if (isPlaying && !isScrubbingRef.current) {
        const elapsedSinceSync = ((performance.now() - lastSyncTimeRef.current) / 1000) * playbackRate;
        const smoothVal =
          durationSec > 0
            ? Math.min(durationSec, exactCurrentTimeRef.current + Math.max(0, elapsedSinceSync))
            : exactCurrentTimeRef.current + Math.max(0, elapsedSinceSync);
        setDisplayTimeSec(smoothVal);
      }
      animId = requestAnimationFrame(updateLoop);
    };
    animId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackRate, durationSec]);

  // YouTube IFrame API events (state changes + time updates)
  useEffect(() => {
    const markEnded = () => {
      setIsPlaying(false);
      if (durationSec) {
        exactCurrentTimeRef.current = durationSec;
        setDisplayTimeSec(durationSec);
        setCurrentTimeSec(durationSec);
      }
    };

    const handleMsg = (e: MessageEvent) => {
      try {
        const isYouTubeOrigin =
          typeof e.origin === "string" && (e.origin.includes("youtube.com") || e.origin.includes("youtube-nocookie.com"));
        if (!isYouTubeOrigin && playerIframeRef.current?.contentWindow && e.source !== playerIframeRef.current.contentWindow) {
          return;
        }
        const parsed = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (!parsed || typeof parsed !== "object") return;

        const hasWatchedSubstantially =
          durationSec > 0 && exactCurrentTimeRef.current >= durationSec - 3 && exactCurrentTimeRef.current > 5;

        if (parsed.event === "onStateChange") {
          if (parsed.info === 1) setIsPlaying(true);
          else if (parsed.info === 2) setIsPlaying(false);
          else if (parsed.info === 0) {
            markEnded();
            if (hasWatchedSubstantially) callbacks.current.onReachedEnd();
          }
        } else if (parsed.event === "infoDelivery" && parsed.info) {
          if (typeof parsed.info.currentTime === "number") {
            const time = parsed.info.currentTime;
            exactCurrentTimeRef.current = time;
            lastSyncTimeRef.current = performance.now();
            if (!isScrubbingRef.current) {
              setDisplayTimeSec(time);
              setCurrentTimeSec(Math.floor(time));
            }
            lastYouTubeUpdateRef.current = Date.now();
            if (durationSec > 0 && time >= durationSec - 1 && hasWatchedSubstantially) {
              callbacks.current.onReachedEnd();
            }
          }
          if (typeof parsed.info.playerState === "number") {
            if (parsed.info.playerState === 1) setIsPlaying(true);
            else if (parsed.info.playerState === 2) setIsPlaying(false);
            else if (parsed.info.playerState === 0) {
              markEnded();
              if (hasWatchedSubstantially) callbacks.current.onReachedEnd();
            }
          }
        }
      } catch {}
    };
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, [durationSec]);

  // Fallback ticker: only advances the clock if YouTube stops sending time updates
  useEffect(() => {
    const timer = setInterval(() => {
      if (isPlaying && Date.now() - lastYouTubeUpdateRef.current > 1500) {
        setCurrentTimeSec((prev) => {
          if (durationSec > 0 && prev >= durationSec) return prev;
          const next = prev + 1;
          exactCurrentTimeRef.current = next;
          lastSyncTimeRef.current = performance.now();
          setDisplayTimeSec(next);
          return next;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, durationSec]);

  return {
    isPlaying,
    setIsPlaying,
    isMuted,
    playbackRate,
    currentTimeSec,
    displayTimeSec,
    postToYouTube,
    play,
    pause,
    stop,
    silence,
    resetClock,
    seekTo,
    seekRelative,
    togglePlayPause,
    restart,
    resumeWithRewind,
    toggleMute,
    cyclePlaybackRate,
    handleIframeLoad,
    scrubPreview,
    setScrubbing,
  };
}

export type YouTubePlayer = ReturnType<typeof useYouTubePlayer>;
