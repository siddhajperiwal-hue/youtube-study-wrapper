import type { QuickQuiz, RecallFlashcard } from "./types";

// Card eyebrow labels (clamped to two lines in the fixed-size top deck; full text in a tooltip)

export const quizEyebrow = (quiz: QuickQuiz) =>
  `QUICK QUIZ • ${quiz.course_name ? `${quiz.course_name.toUpperCase()} (CH ${quiz.chapter_num || 1}) • ` : ""}${quiz.topic ? quiz.topic.toUpperCase() : "ACTIVE RECALL"}`;

export const flashcardEyebrow = (card: RecallFlashcard) =>
  `ACTIVE RECALL • ${card.course_name ? `${card.course_name.toUpperCase()} (CH ${card.chapter_num || 1})` : card.topic ? card.topic.toUpperCase() : "RETENTION"}`;

export const flashcardBackLabel = (card: RecallFlashcard) =>
  `✓ Reference Explanation • ${card.course_name ? `${card.course_name} (Ch ${card.chapter_num || 1})` : "Completed Chapter"}`;
