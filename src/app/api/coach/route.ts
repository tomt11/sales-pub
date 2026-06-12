import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import { MODEL_DIALOGUE, streamText, type ChatMessage } from "@/modules/dojo/lib/anthropic";
import { loadAllPlaybooks } from "@/modules/dojo/lib/playbook";
import { coachPrompt } from "@/modules/dojo/lib/prompts";
import { weakestConcepts } from "@/modules/dojo/lib/stats";

export const runtime = "nodejs";

/** Voice AI coach — short spoken-style replies grounded in the playbooks. */
export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { messages } = (await req.json()) as { messages: ChatMessage[] };

  const [{ count: dueCount }, weak, { data: lastRoleplay }] = await Promise.all([
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .lte("due", new Date().toISOString()),
    weakestConcepts(supabase, user.id, 3),
    supabase
      .from("roleplays")
      .select("grade")
      .eq("user_id", user.id)
      .not("grade", "is", null)
      .order("ended_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const oneThing =
    (lastRoleplay?.grade as { one_thing?: string } | null)?.one_thing ?? null;

  return streamText({
    model: MODEL_DIALOGUE,
    system: coachPrompt({
      playbookExcerpts: loadAllPlaybooks(),
      dueCount: dueCount ?? 0,
      weakConcepts: weak,
      oneThing,
    }),
    messages,
    maxTokens: 400,
  });
}
