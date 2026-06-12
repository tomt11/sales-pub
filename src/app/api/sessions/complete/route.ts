import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import { newCardState } from "@/modules/dojo/lib/fsrs";
import { XP, awardXp } from "@/modules/dojo/lib/xp";

export const runtime = "nodejs";

/** Marks a guided session done, seeds its concepts into the drill queue, unlocks the next. */
export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { sessionId, transcript } = (await req.json()) as {
    sessionId: number;
    transcript: unknown;
  };

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (!session) return new Response("Session not found", { status: 404 });

  await supabase.from("session_progress").upsert(
    {
      user_id: user.id,
      session_id: sessionId,
      status: "done",
      transcript,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,session_id" }
  );

  // Ensure every drill for this session's concepts has a review row, due now.
  const { data: drills } = await supabase
    .from("drills")
    .select("id")
    .in("concept_id", session.concepts as string[]);
  const drillIds = (drills ?? []).map((d) => d.id);
  if (drillIds.length) {
    const { data: existing } = await supabase
      .from("reviews")
      .select("drill_id")
      .eq("user_id", user.id)
      .in("drill_id", drillIds);
    const have = new Set((existing ?? []).map((r) => r.drill_id));
    const missing = drillIds.filter((id) => !have.has(id));
    if (missing.length) {
      await supabase.from("reviews").insert(
        missing.map((drillId) => {
          const card = newCardState();
          return {
            drill_id: drillId,
            user_id: user.id,
            fsrs_state: card.fsrs_state,
            due: card.due,
          };
        })
      );
    }
    // Pull this session's concepts forward regardless.
    await supabase
      .from("reviews")
      .update({ due: new Date().toISOString() })
      .eq("user_id", user.id)
      .in("drill_id", drillIds);
  }

  // Unlock the next session.
  const { data: next } = await supabase
    .from("sessions")
    .select("id")
    .gt("id", sessionId)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (next) {
    const { data: existingProgress } = await supabase
      .from("session_progress")
      .select("status")
      .eq("user_id", user.id)
      .eq("session_id", next.id)
      .maybeSingle();
    if (!existingProgress || existingProgress.status === "locked") {
      await supabase.from("session_progress").upsert(
        { user_id: user.id, session_id: next.id, status: "available" },
        { onConflict: "user_id,session_id" }
      );
    }
  }

  await awardXp(supabase, user.id, "session", XP.sessionComplete, {
    session_id: sessionId,
  });

  return Response.json({ ok: true, unlocked: next?.id ?? null });
}
