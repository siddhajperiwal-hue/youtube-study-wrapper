// LLMs place the correct MCQ answer first far more often than chance (in our generated bank,
// ~59% of answers were "A" and <2% were "D"), so option order is randomized in code instead.

export interface ShuffleableQuestion {
  options: string[];
  correct_index: number;
  explanation?: string | null;
}

const LETTERS = "ABCDEFGHIJ";

// Options whose meaning depends on their position, e.g. "None of the above" — never reorder these
const POSITIONAL_OPTION = /\b(all|none|both|neither)\s+of\s+the\s+above\b|\babove\s+options\b/i;

// "A) ...", "(B) ...", "C. ...", "D: ..." prefixes the model sometimes bakes into option text
const OWN_LETTER_PREFIX = /^\s*\(?([A-J])[).:]\s+/;

// Letter references in explanations: "Option B", "Options B, C, and D", "Choice (C)", "Options A and C".
// Letters must be uppercase standalone tokens, so "options are" or "cos(A)" are not touched.
const LETTER_REF =
  /\b([Oo]ptions?|[Cc]hoices?)((?:\s+|\s*,\s*(?:(?:and|or)\s+)?|\s+(?:and|or|&)\s+)\(?[A-J]\)?(?![A-Za-z0-9]))+/g;

function stripOwnLetterPrefixes(options: string[]): string[] {
  const allPrefixedInOrder = options.every((o, i) => {
    const m = o.match(OWN_LETTER_PREFIX);
    return m !== null && m[1] === LETTERS[i];
  });
  return allPrefixedInOrder ? options.map((o) => o.replace(OWN_LETTER_PREFIX, "")) : options;
}

/**
 * Returns a copy of the question with its options in a uniformly random order.
 * `correct_index` follows the correct option, and letter references in the explanation
 * ("Option B is correct") are rewritten to the new letters.
 */
export function shuffleQuestionOptions<T extends ShuffleableQuestion>(
  question: T,
  random: () => number = Math.random
): T {
  const options = stripOwnLetterPrefixes(question.options);

  if (options.length < 2 || options.some((o) => POSITIONAL_OPTION.test(o))) {
    return { ...question, options };
  }

  // Fisher–Yates: order[newIndex] = oldIndex
  const order = options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const newIndexOf = new Map(order.map((oldIndex, newIndex) => [oldIndex, newIndex]));
  const remapLetter = (letter: string) => {
    const oldIndex = LETTERS.indexOf(letter);
    return oldIndex >= 0 && oldIndex < options.length ? LETTERS[newIndexOf.get(oldIndex)!] : letter;
  };

  const explanation =
    typeof question.explanation === "string"
      ? question.explanation.replace(LETTER_REF, (ref: string, word: string) =>
          word + ref.slice(word.length).replace(/[A-J](?![A-Za-z0-9])/g, remapLetter)
        )
      : question.explanation;

  return {
    ...question,
    options: order.map((oldIndex) => options[oldIndex]),
    correct_index: newIndexOf.get(question.correct_index)!,
    explanation,
  };
}
