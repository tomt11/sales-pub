import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import { MODEL_GRADER, jsonCall } from "@/modules/dojo/lib/anthropic";
import { loadAllPlaybooks } from "@/modules/dojo/lib/playbook";
import { roleplayGraderPrompt } from "@/modules/dojo/lib/prompts";
import { roleplayGradeSchema } from "@/modules/dojo/lib/schemas";
import { XP, awardXp } from "@/modules/dojo/lib/xp";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { roleplayId } = (await req.json()) as { roleplayId: string };

  const { data: roleplay } = await supabase
    .from("roleplays")
    .select("*, personas(sheet)")
    .eq("id", roleplayId)
    .eq("user_id", user.id)
    .single();
  if (!roleplay) return new Response("Roleplay not found", { status: 404 });

  const sheet = (roleplay.personas as { sheet?: unknown } | null)?.sheet;
  const grade = await jsonCall({
    model: MODEL_GRADER,
    system: roleplayGraderPrompt(loadAllPlaybooks()),
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          persona_sheet: sheet,
          trains: (sheet as { trains?: string[] } | undefined)?.trains ?? [],
          transcript: roleplay.transcript,
        }),
      },
    ],
    schema: roleplayGradeSchema,
    maxTokens: 2500,
  });

  await supabase
    .from("roleplays")
    .update({
      grade,
      overall: grade.overall,
      advance_secured: grade.advance_secured,
      ended_at: new Date().toISOString(),
    })
    .eq("id", roleplayId);

  // Pull weak concepts' reviews forward so they surface in the next drill session.
  if (grade.drill_seeds.length) {
    const { data: seedDrills } = await supabase
      .from("drills")
      .select("id")
      .in("concept_id", grade.drill_seeds);
    const ids = (seedDrills ?? []).map((d) => d.id);
    if (ids.length) {
      await supabase
        .from("reviews")
        .update({ due: new Date().toISOString() })
        .eq("user_id", user.id)
        .in("drill_id", ids);
    }
  }

  await awardXp(supabase, user.id, "roleplay", XP.roleplayComplete(grade.overall), {
    roleplay_id: roleplayId,
  });

  return Response.json(grade);
}
