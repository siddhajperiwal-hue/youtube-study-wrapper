import { useState } from "react";
import type { CourseData } from "./types";

/**
 * Settings tab form state (Section 4.7). Lives on the page (not in the tab) so unsaved edits survive
 * switching tabs; `sync` fills it from loaded course data.
 */
export function useSettingsForm() {
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [quizzes, setQuizzes] = useState(true);
  const [flashcards, setFlashcards] = useState(true);

  const sync = (course: CourseData) => {
    setName(course.name);
    setDeadline(course.deadlineDate ? course.deadlineDate.split("T")[0] : "");
    setQuizzes(course.quizzesEnabled);
    setFlashcards(course.flashcardsEnabled);
  };

  return { name, setName, deadline, setDeadline, quizzes, setQuizzes, flashcards, setFlashcards, sync };
}

export type SettingsForm = ReturnType<typeof useSettingsForm>;
