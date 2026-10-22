import { useRef } from "react";
import type { CardsResponse } from "./types";

export type CardTarget = "quiz" | "flashcard";

/** Fetch the next quiz question / flashcard, excluding the ones already seen. Resolves null on failure. */
export function requestNextCard(target: CardTarget, seenIds: string[]): Promise<CardsResponse | null> {
  const param = target === "quiz" ? "exclude_question_ids" : "exclude_flashcard_ids";
  const excludeParam = seenIds.length > 0 ? `&${param}=${seenIds.join(",")}` : "";
  return fetch(`/api/dashboard/cards?target=${target}${excludeParam}&_t=${Date.now()}`, { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);
}

/**
 * Next card prefetched while the current one is on screen, so "Next Question" / "Got it" swap
 * instantly. The prefetch is keyed by the exclude list it was requested with.
 */
export function useNextCardPrefetch(target: CardTarget) {
  const slot = useRef<{ key: string; promise: Promise<CardsResponse | null> } | undefined>(undefined);

  const prefetch = (seenIds: string[]) => {
    const key = seenIds.join(",");
    if (slot.current?.key === key) return;
    slot.current = { key, promise: requestNextCard(target, seenIds) };
  };

  // Use the prefetched response if it matches the current exclude list, otherwise fetch now
  const take = (seenIds: string[]): Promise<CardsResponse | null> => {
    const prefetched = slot.current;
    slot.current = undefined;
    return prefetched?.key === seenIds.join(",") ? prefetched.promise : requestNextCard(target, seenIds);
  };

  return { prefetch, take };
}
