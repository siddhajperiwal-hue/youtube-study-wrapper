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
