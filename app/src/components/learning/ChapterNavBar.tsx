import { formatClock, padChapterNumber, type ChapterDetail, type ChapterNavigation, type ChapterSummary } from "./types";

interface ChapterNavBarProps {
  chapter: ChapterDetail;
  chaptersList: ChapterSummary[];
  navigation: ChapterNavigation;
  onGoToChapter: (chapterId: string) => void;
  onPrefetchChapter: (chapterId: string) => void;
}

/** Previous / chapter picker / Next controls under the video. */
export function ChapterNavBar({ chapter, chaptersList, navigation, onGoToChapter, onPrefetchChapter }: ChapterNavBarProps) {
  const { prev, next } = navigation;
  return (
    <div className="chapter-nav-bar">
      {prev ? (
        <button
          type="button"
          className="btn-ch-nav"
          id="btnPrevChapter"
          onMouseEnter={() => onPrefetchChapter(prev.id)}
          onClick={() => onGoToChapter(prev.id)}
        >
          <svg className="icon" viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span>Previous</span>
        </button>
      ) : (
        <button className="btn-ch-nav" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
          <svg className="icon" viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span>Previous</span>
        </button>
      )}

      <select
        className="chapter-select-menu"
        id="chapterSelectMenu"
        aria-label="Select Chapter"
        value={chapter.id}
        onChange={(e) => onGoToChapter(e.target.value)}
      >
        {chaptersList.map((ch) => {
          const isCur = ch.id === chapter.id;
          let badge = "○ Pending";
          if (ch.status === "completed") badge = "✓ Mastered";
          else if (ch.status === "in_progress") badge = "👁 Watched";
          else if (isCur) badge = "● Current";

          return (
            <option key={ch.id} value={ch.id}>
              Chapter {padChapterNumber(ch.position)}: {ch.title} ({formatClock(ch.durationSec)}) {badge}
            </option>
          );
        })}
      </select>

      {next ? (
        <button
          type="button"
          className="btn-ch-nav primary"
          id="btnNextChapter"
          onMouseEnter={() => onPrefetchChapter(next.id)}
          onClick={() => onGoToChapter(next.id)}
        >
          <span>Next Chapter</span>
          <svg className="icon" viewBox="0 0 24 24">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      ) : (
        <button className="btn-ch-nav primary" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
          <span>Course Completed</span>
        </button>
      )}
    </div>
  );
}
