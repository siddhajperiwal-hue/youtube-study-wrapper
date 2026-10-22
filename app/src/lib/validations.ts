import { z } from "zod";

export const CreateCourseSchema = z.object({
  url: z.string().min(1, "Playlist URL is required").url("Must be a valid URL format"),
  name: z.string().max(150, "Course name is too long").optional(),
  quizzes_enabled: z.boolean().default(true),
  flashcards_enabled: z.boolean().default(true),
  deadline_date: z.string().nullable().optional(),
});

export const ProgressUpdateSchema = z.object({
  courseId: z.string().uuid("Invalid course ID format"),
  videoId: z.string().uuid("Invalid video ID format"),
  positionSec: z.number().min(0).max(86400 * 7, "Position exceeds valid limit").default(0),
  watchedSecondsDelta: z.number().min(0).max(3600, "Watched delta exceeds valid limit").default(0),
  durationSec: z.number().min(0).max(86400 * 7, "Duration exceeds valid limit").default(0),
});

export const HeartbeatSchema = z.object({
  activeSeconds: z.number().min(1).max(300).default(60),
  timezone: z.string().max(50).default("UTC"),
});

export const NoteUpdateSchema = z.object({
  content: z.any().optional(), // TipTap JSON object or null
  version: z.number().int().min(1).default(1),
});

export const FeedbackSchema = z.object({
  category: z.enum(["bug", "idea", "question", "other"]).default("other"),
  message: z.string().trim().min(1, "Please write a message").max(4000, "Message is too long"),
  page: z.string().max(300).optional(),
});

export const ReportSchema = z.object({
  /** What was reported; older clients don't send it (= question) */
  itemType: z.enum(["Question", "Flashcard"]).default("Question"),
  category: z.string().max(80).default("Other"),
  reason: z.string().max(2000).default(""),
});

const InboxStatusSchema = z.enum(["new", "seen", "resolved"]);

export const AdminReportUpdateSchema = z.union([
  z.object({ status: InboxStatusSchema }),
  /** Take the reported question/flashcard out of circulation (or put it back) */
  z.object({ itemStatus: z.enum(["removed", "active"]) }),
]);

export const AdminFeedbackUpdateSchema = z.object({ status: InboxStatusSchema });

export const QuizSubmitSchema = z.object({
  videoId: z.string().uuid("Invalid video ID format"),
  userAnswers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        selectedIndex: z.number().int().min(0).max(3),
        timeTakenSec: z.number().min(0).max(3600).default(0),
      })
    )
    .max(50)
    .default([]),
  /** "Skip Quiz": the chapter becomes Watched (Quiz Skipped) */
  skipped: z.boolean().default(false),
  /** No questions could be generated: Watched, without recording a quiz attempt */
  noQuiz: z.boolean().default(false),
});
