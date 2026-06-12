import type { SupabaseClient } from "@supabase/supabase-js";

// XP values per SPEC §4 Gamification
export const XP = {
  drill: (rating: string) =>
    ({ again: 5, hard: 10, good: 15, easy: 20 })[rating] ?? 5,
  sessionComplete: 100,
  roleplayComplete: (overall: number) => 50 + 10 * overall,
  advanceSecured: 150,
  touchWithoutAsk: 25,
  streakBonus: 50,
} as const;

export const RANKS = [
  { name: "Prospector", min: 0 },
  { name: "Originator", min: 1000 },
  { name: "Advisor", min: 3000 },
  { name: "Trusted Advisor", min: 7000 },
  { name: "Rainmaker", min: 15000 }, // capstone-gated in UI
] as const;

export function rankFor(totalXp: number, capstoneDone: boolean) {
  let rank: (typeof RANKS)[number] = RANKS[0];
  for (const r of RANKS) {
    if (totalXp >= r.min) rank = r;
  }
  if (rank.name === "Rainmaker" && !capstoneDone) rank = RANKS[3];
  return rank;
}

export async function awardXp(
  supabase: SupabaseClient,
  userId: string,
  source: string,
  points: number,
  meta?: Record<string, unknown>
) {
  await supabase.from("xp_events").insert({
    user_id: userId,
    source,
    points,
    meta: meta ?? null,
  });
}
