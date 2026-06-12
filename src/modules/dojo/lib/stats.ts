import type { SupabaseClient } from "@supabase/supabase-js";
import { BOOK_LABELS } from "./playbook";

export type RadarPoint = { axis: string; book: string; score: number | null };

/**
 * Per-framework rolling averages: drill scores (review_log.score 1-4 → 0-10)
 * averaged per concept book over the most recent 200 graded answers.
 */
export async function skillRadar(
  supabase: SupabaseClient,
  userId: string
): Promise<RadarPoint[]> {
  const { data: concepts } = await supabase.from("concepts").select("id, book");
  const bookByConcept = new Map<string, string>(
    (concepts ?? []).map((c) => [c.id as string, c.book as string])
  );

  const { data: logs } = await supabase
    .from("review_log")
    .select("score, review_id, reviews(drill_id, drills(concept_id))")
    .eq("user_id", userId)
    .not("score", "is", null)
    .order("answered_at", { ascending: false })
    .limit(200);

  const sums = new Map<string, { total: number; n: number }>();
  for (const log of logs ?? []) {
    const review = log.reviews as unknown as {
      drills?: { concept_id?: string } | null;
    } | null;
    const conceptId = review?.drills?.concept_id;
    const book = conceptId ? bookByConcept.get(conceptId) : undefined;
    if (!book || log.score == null) continue;
    const entry = sums.get(book) ?? { total: 0, n: 0 };
    entry.total += (log.score / 4) * 10;
    entry.n += 1;
    sums.set(book, entry);
  }

  return Object.entries(BOOK_LABELS)
    .filter(([book]) => book !== "capstone")
    .map(([book, axis]) => {
      const entry = sums.get(book);
      return {
        axis,
        book,
        score: entry ? Math.round((entry.total / entry.n) * 10) / 10 : null,
      };
    });
}

/** Concept ids with the lowest rolling average score (for generator + pre-brief). */
export async function weakestConcepts(
  supabase: SupabaseClient,
  userId: string,
  n = 3
): Promise<string[]> {
  const { data: logs } = await supabase
    .from("review_log")
    .select("score, reviews(drills(concept_id))")
    .eq("user_id", userId)
    .not("score", "is", null)
    .order("answered_at", { ascending: false })
    .limit(300);

  const sums = new Map<string, { total: number; n: number }>();
  for (const log of logs ?? []) {
    const review = log.reviews as unknown as {
      drills?: { concept_id?: string } | null;
    } | null;
    const conceptId = review?.drills?.concept_id;
    if (!conceptId || log.score == null) continue;
    const entry = sums.get(conceptId) ?? { total: 0, n: 0 };
    entry.total += log.score;
    entry.n += 1;
    sums.set(conceptId, entry);
  }
  return [...sums.entries()]
    .map(([id, { total, n: count }]) => ({ id, avg: total / count }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, n)
    .map((c) => c.id);
}

/** Streak: consecutive days (ending today or yesterday) with >= 5 reviews. */
export async function currentStreak(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const { data: logs } = await supabase
    .from("review_log")
    .select("answered_at")
    .eq("user_id", userId)
    .gte("answered_at", since);

  const perDay = new Map<string, number>();
  for (const log of logs ?? []) {
    const day = (log.answered_at as string).slice(0, 10);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  let streak = 0;
  const cursor = new Date();
  // today may still be in progress — don't break the streak on it
  if ((perDay.get(cursor.toISOString().slice(0, 10)) ?? 0) >= 5) streak = 1;
  cursor.setDate(cursor.getDate() - 1);
  while ((perDay.get(cursor.toISOString().slice(0, 10)) ?? 0) >= 5) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function xpThisWeek(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data } = await supabase
    .from("xp_events")
    .select("points")
    .eq("user_id", userId)
    .gte("created_at", weekAgo);
  return (data ?? []).reduce((sum, e) => sum + (e.points as number), 0);
}

export async function totalXp(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data } = await supabase
    .from("xp_events")
    .select("points")
    .eq("user_id", userId);
  return (data ?? []).reduce((sum, e) => sum + (e.points as number), 0);
}
