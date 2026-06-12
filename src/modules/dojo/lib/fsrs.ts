import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  type Card,
  type Grade,
} from "ts-fsrs";

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

export type FsrsRating = "again" | "hard" | "good" | "easy";

const RATING_MAP: Record<FsrsRating, Grade> = {
  again: Rating.Again as Grade,
  hard: Rating.Hard as Grade,
  good: Rating.Good as Grade,
  easy: Rating.Easy as Grade,
};

export function newCardState(): { fsrs_state: Card; due: string } {
  const card = createEmptyCard(new Date());
  return { fsrs_state: card, due: card.due.toISOString() };
}

function reviveCard(state: Record<string, unknown>): Card {
  return {
    ...(state as unknown as Card),
    due: new Date(state.due as string),
    last_review: state.last_review ? new Date(state.last_review as string) : undefined,
  };
}

export function applyRating(
  state: Record<string, unknown>,
  rating: FsrsRating,
  now = new Date()
): { fsrs_state: Card; due: string; lapsed: boolean } {
  const card = reviveCard(state);
  const result = scheduler.repeat(card, now)[RATING_MAP[rating]];
  return {
    fsrs_state: result.card,
    due: result.card.due.toISOString(),
    lapsed: rating === "again",
  };
}

/** Pull a review forward so it surfaces in the next drill session. */
export function pullForward(state: Record<string, unknown>): { due: string } {
  return { due: new Date().toISOString() };
}

export function scoreToRating(score: number): FsrsRating {
  if (score <= 1) return "again";
  if (score === 2) return "hard";
  if (score === 3) return "good";
  return "easy";
}
