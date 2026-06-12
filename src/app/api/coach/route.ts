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

  const [{ count: dueCount }, weak, { data: lastRoleplay }, { data: contacts }] =
    await Promise.all([
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
    supabase
      .from("contacts")
      .select("name, firm, glue, cadence_days, last_touch, personal_notes")
      .eq("user_id", user.id),
  ]);

  const oneThing =
    (lastRoleplay?.grade as { one_thing?: string } | null)?.one_thing ?? null;

  const overdueContacts = (contacts ?? [])
    .map((c) => {
      const elapsed = c.last_touch
        ? Math.floor((Date.now() - new Date(c.last_touch).getTime()) / 86400000)
        : 9999;
      return { ...c, overdue: elapsed - c.cadence_days };
    })
    .filter((c) => c.overdue > 0)
    .sort((a, b) => b.overdue - a.overdue)
    .slice(0, 5)
    .map(
      (c) =>
        `${c.name}${c.firm ? ` (${c.firm})` : ""} — ${
          c.overdue >= 9000 ? "never touched" : `${c.overdue}d overdue`
        }${c.glue ? `, glue: ${c.glue}` : ""}`
    );

  return streamText({
    model: MODEL_DIALOGUE,
    system: coachPrompt({
      playbookExcerpts: loadAllPlaybooks(),
      dueCount: dueCount ?? 0,
      weakConcepts: weak,
      oneThing,
      overdueContacts,
    }),
    messages,
    maxTokens: 400,
  });
}
