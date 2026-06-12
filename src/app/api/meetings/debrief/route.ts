import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import { MODEL_DIALOGUE, jsonCall } from "@/modules/dojo/lib/anthropic";
import { applyRating, scoreToRating } from "@/modules/dojo/lib/fsrs";
import { debriefPrompt } from "@/modules/dojo/lib/prompts";
import { debriefSchema } from "@/modules/dojo/lib/schemas";
import { XP, awardXp } from "@/modules/dojo/lib/xp";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { meetingId, raw } = (await req.json()) as { meetingId: string; raw: string };

  const { data: meeting } = await supabase
    .from("meetings")
    .select("*, contacts(*)")
    .eq("id", meetingId)
    .eq("user_id", user.id)
    .single();
  if (!meeting) return new Response("Meeting not found", { status: 404 });

  const debrief = await jsonCall({
    model: MODEL_DIALOGUE,
    system: debriefPrompt({ prebrief: meeting.prebrief, contact: meeting.contacts }),
    messages: [{ role: "user", content: raw }],
    schema: debriefSchema,
    maxTokens: 800,
  });

  await supabase
    .from("meetings")
    .update({
      debrief_raw: raw,
      debrief,
      outcome: debrief.outcome,
      technique_score: debrief.technique_score,
    })
    .eq("id", meetingId);

  // Feed the technique score into FSRS for that concept's soonest review.
  const technique = meeting.technique_practised as string | null;
  if (technique) {
    const { data: conceptDrills } = await supabase
      .from("drills")
      .select("id")
      .eq("concept_id", technique);
    const ids = (conceptDrills ?? []).map((d) => d.id);
    if (ids.length) {
      const { data: review } = await supabase
        .from("reviews")
        .select("*")
        .eq("user_id", user.id)
        .in("drill_id", ids)
        .order("due", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (review) {
        const rating = scoreToRating(debrief.technique_score);
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
          .eq("id", review.id);
        await supabase.from("review_log").insert({
          review_id: review.id,
          user_id: user.id,
          rating,
          answer_text: `[field application] ${raw.slice(0, 500)}`,
          ai_feedback: debrief.technique_feedback,
          score: debrief.technique_score,
        });
      }
    }
  }

  // Merge new personal details into the contact record; bump last_touch.
  const contact = meeting.contacts as {
    id: string;
    personal_notes: Record<string, string>;
  };
  await supabase
    .from("contacts")
    .update({
      personal_notes: { ...contact.personal_notes, ...debrief.new_personal_details },
      last_touch: new Date().toISOString().slice(0, 10),
    })
    .eq("id", contact.id);

  if (debrief.outcome === "advance") {
    await awardXp(supabase, user.id, "field_advance", XP.advanceSecured, {
      meeting_id: meetingId,
    });
  }

  return Response.json(debrief);
}
