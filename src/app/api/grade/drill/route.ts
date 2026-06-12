import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import { MODEL_GRADER, jsonCall } from "@/modules/dojo/lib/anthropic";
import { applyRating } from "@/modules/dojo/lib/fsrs";
import { loadPlaybook } from "@/modules/dojo/lib/playbook";
import { drillGraderPrompt } from "@/modules/dojo/lib/prompts";
import { drillGradeSchema } from "@/modules/dojo/lib/schemas";
import { XP, awardXp } from "@/modules/dojo/lib/xp";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { drillId, reviewId, answer } = (await req.json()) as {
    drillId: string;
    reviewId: string;
    answer: string;
  };

  const { data: drill } = await supabase
    .from("drills")
    .select("*, concepts(book)")
    .eq("id", drillId)
    .single();
  if (!drill) return new Response("Drill not found", { status: 404 });

  const book = (drill.concepts as { book?: string } | null)?.book ?? "trusted-advisor";
  const grade = await jsonCall({
    model: MODEL_GRADER,
    system: drillGraderPrompt(loadPlaybook(book)),
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          drill_prompt: drill.prompt,
          grading_focus: drill.grading_focus,
          toms_answer: answer,
        }),
      },
    ],
    schema: drillGradeSchema,
    maxTokens: 600,
  });

  const { data: review } = await supabase
    .from("reviews")
    .select("*")
    .eq("id", reviewId)
    .eq("user_id", user.id)
    .single();
  if (!review) return new Response("Review not found", { status: 404 });

  const next = applyRating(review.fsrs_state, grade.fsrs_rating);
  await supabase
    .from("reviews")
    .update({
      fsrs_state: next.fsrs_state,
      due: next.due,
      last_rating: grade.fsrs_rating,
      reps: review.reps + 1,
      lapses: review.lapses + (next.lapsed ? 1 : 0),
    })
    .eq("id", reviewId);

  await supabase.from("review_log").insert({
    review_id: reviewId,
    user_id: user.id,
    rating: grade.fsrs_rating,
    answer_text: answer,
    ai_feedback: grade.feedback,
    score: grade.score,
  });

  await awardXp(supabase, user.id, "drill", XP.drill(grade.fsrs_rating), {
    drill_id: drillId,
  });

  return Response.json({ ...grade, next_due: next.due });
}
