import { describe, it, expect } from "vitest";
import { pickQuizQuestions } from "../quiz-rotation";

const questions = Array.from({ length: 20 }, (_, i) => ({ id: `q${i}`, timestamp_sec: i * 30 }));
const ids = (qs: { id: string }[]) => qs.map((q) => q.id);

describe("pickQuizQuestions", () => {
  it("picks 5 questions, in video order", () => {
    const picked = pickQuizQuestions(questions, new Map());
    expect(picked).toHaveLength(5);
    const times = picked.map((q) => q.timestamp_sec);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("never repeats a question until every question has been asked", () => {
    const answered = new Map<string, string>();
    const asked: string[] = [];
    for (let attempt = 0; attempt < 4; attempt++) {
      const picked = pickQuizQuestions(questions, answered);
      for (const q of picked) answered.set(q.id, `2026-10-0${attempt + 1}T00:00:00Z`);
      asked.push(...ids(picked));
    }
    expect(new Set(asked).size).toBe(20);
  });

  it("after a full round, asks the questions answered longest ago", () => {
    const answered = new Map(questions.map((q, i) => [q.id, i < 5 ? "2026-09-01T00:00:00Z" : "2026-10-01T00:00:00Z"]));
    expect(ids(pickQuizQuestions(questions, answered)).sort()).toEqual(["q0", "q1", "q2", "q3", "q4"]);
  });

  it("returns every question when a video has fewer than 5", () => {
    expect(pickQuizQuestions(questions.slice(0, 3), new Map())).toHaveLength(3);
  });
});
