import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import { MODEL_DIALOGUE, jsonCall } from "@/modules/dojo/lib/anthropic";
import { prebriefPrompt } from "@/modules/dojo/lib/prompts";
import { prebriefSchema } from "@/modules/dojo/lib/schemas";
import { weakestConcepts } from "@/modules/dojo/lib/stats";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { meetingId } = (await req.json()) as { meetingId: string };

  const { data: meeting } = await supabase
    .from("meetings")
    .select("*, contacts(*)")
    .eq("id", meetingId)
    .eq("user_id", user.id)
    .single();
  if (!meeting) return new Response("Meeting not found", { status: 404 });

  const { data: recentDebriefs } = await supabase
    .from("meetings")
    .select("debrief, outcome, scheduled_at")
    .eq("contact_id", meeting.contact_id)
    .not("debrief", "is", null)
    .order("scheduled_at", { ascending: false })
    .limit(3);

  const weak = await weakestConcepts(supabase, user.id, 5);

  const prebrief = await jsonCall({
    model: MODEL_DIALOGUE,
    system: prebriefPrompt({
      contact: meeting.contacts,
      purpose: meeting.purpose ?? "relationship development",
      recentDebriefs: recentDebriefs ?? [],
      weakConcepts: weak,
    }),
    messages: [{ role: "user", content: "Generate the pre-brief." }],
    schema: prebriefSchema,
    maxTokens: 800,
  });

  await supabase
    .from("meetings")
    .update({ prebrief, technique_practised: prebrief.technique.concept_id })
    .eq("id", meetingId);

  return Response.json(prebrief);
}
