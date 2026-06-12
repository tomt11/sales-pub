import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import { applyRating, type FsrsRating } from "@/modules/dojo/lib/fsrs";
import { XP, awardXp } from "@/modules/dojo/lib/xp";

export const runtime = "nodejs";

const RATING_SCORE: Record<FsrsRating, number> = { again: 1, hard: 2, good: 3, easy: 4 };

/** Applies a self-evident rating for classify/spot drills (tap-to-answer). */
export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { reviewId, rating, answerText } = (await req.json()) as {
    reviewId: string;
    rating: FsrsRating;
    answerText?: string;
  };
  if (!["again", "hard", "good", "easy"].includes(rating)) {
    return new Response("Bad rating", { status: 400 });
  }

  const { data: review } = await supabase
    .from("reviews")
    .select("*")
    .eq("id", reviewId)
    .eq("user_id", user.id)
    .single();
  if (!review) return new Response("Review not found", { status: 404 });

  const next = applyRating(review.fsrs_state, rating);
  await supabase
    .from("reviews")
    .update({
      fsrs_state: next.fsrs_state,
      due: next.due,
      last_rating: rating,
      reps: review.reps + 1,
      lapses: review.lapses + (next.lapsed ? 1 : 0),
    })
    .eq("id", reviewId);

  await supabase.from("review_log").insert({
    review_id: reviewId,
    user_id: user.id,
    rating,
    answer_text: answerText ?? null,
    score: RATING_SCORE[rating],
  });

  await awardXp(supabase, user.id, "drill", XP.drill(rating));

  return Response.json({ ok: true, next_due: next.due });
}
