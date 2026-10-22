import { describe, it, expect } from "vitest";
import { shuffleQuestionOptions } from "../quiz-shuffle";

// Deterministic RNG for reproducible orders
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const base = {
  text: "Which is right?",
  options: ["right", "wrong 1", "wrong 2", "wrong 3"],
  correct_index: 0,
  explanation: "It is right.",
};

describe("shuffleQuestionOptions", () => {
  it("keeps the same options and correct_index always points at the correct option", () => {
    const rand = seeded(1);
    for (let i = 0; i < 200; i++) {
      const q = shuffleQuestionOptions(base, rand);
      expect([...q.options].sort()).toEqual([...base.options].sort());
      expect(q.options[q.correct_index]).toBe("right");
    }
  });

  it("spreads the correct answer roughly evenly across A–D", () => {
    const counts = [0, 0, 0, 0];
    const rand = seeded(42);
    for (let i = 0; i < 4000; i++) counts[shuffleQuestionOptions(base, rand).correct_index]++;
    for (const c of counts) expect(c).toBeGreaterThan(850); // expected 1000 each
  });

  it("rewrites letter references in the explanation to the new letters", () => {
    const q = shuffleQuestionOptions(
      {
        ...base,
        options: ["w0", "right", "w2", "w3"],
        correct_index: 1,
        explanation: "Option B is correct. Options A, C, and D are wrong; see (Option C) too.",
      },
      () => 0 // always swap with index 0 → order [1, 2, 3, 0]
    );
    // old B (index 1) → A, old A (0) → D, old C (2) → B, old D (3) → C
    expect(q.options).toEqual(["right", "w2", "w3", "w0"]);
    expect(q.correct_index).toBe(0);
    expect(q.explanation).toBe("Option A is correct. Options D, B, and C are wrong; see (Option B) too.");
  });

  it("does not touch text that only looks like a letter reference", () => {
    const explanation = "Given cos(A) = 4/5, the options are limited. Optional C++ code is shown.";
    const q = shuffleQuestionOptions({ ...base, explanation }, seeded(3));
    expect(q.explanation).toBe(explanation);
  });

  it("leaves questions with position-dependent options in their original order", () => {
    const q = { ...base, options: ["one", "two", "three", "None of the above"], correct_index: 3 };
    const out = shuffleQuestionOptions(q, seeded(7));
    expect(out.options).toEqual(q.options);
    expect(out.correct_index).toBe(3);
  });

  it("strips letter prefixes baked into the option text before shuffling", () => {
    const q = { ...base, options: ["A) right", "B) wrong 1", "C) wrong 2", "D) wrong 3"] };
    const out = shuffleQuestionOptions(q, seeded(9));
    expect([...out.options].sort()).toEqual(["right", "wrong 1", "wrong 2", "wrong 3"]);
    expect(out.options[out.correct_index]).toBe("right");
  });
});
