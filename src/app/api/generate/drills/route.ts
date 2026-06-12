import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import { MODEL_GRADER, jsonCall } from "@/modules/dojo/lib/anthropic";
import { newCardState } from "@/modules/dojo/lib/fsrs";
import { loadPlaybook } from "@/modules/dojo/lib/playbook";
import { drillGeneratorPrompt } from "@/modules/dojo/lib/prompts";
import { generatedDrillsSchema } from "@/modules/dojo/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { conceptId, n = 3, difficulty = "normal" } = (await req.json()) as {
    conceptId: string;
    n?: number;
    difficulty?: string;
  };

  const { data: concept } = await supabase
    .from("concepts")
    .select("*")
    .eq("id", conceptId)
    .single();
  if (!concept) return new Response("Concept not found", { status: 404 });

  const { data: recent } = await supabase
    .from("drills")
    .select("prompt")
    .eq("concept_id", conceptId)
    .limit(20);

  const generated = await jsonCall({
    model: MODEL_GRADER,
    system: "You write sharp, scenario-based sales training drills. JSON only.",
    messages: [
      {
        role: "user",
        content: drillGeneratorPrompt({
          conceptId,
          playbookSection: loadPlaybook(concept.book),
          recentDrillSummaries: (recent ?? []).map((d) =>
            (d.prompt as string).slice(0, 120)
          ),
          difficulty,
          n: Math.min(n, 5),
        }),
      },
    ],
    schema: generatedDrillsSchema,
    maxTokens: 3000,
  });

  const rows = generated.map((g) => ({
    concept_id: conceptId,
    type: g.type,
    prompt: g.prompt,
    options: g.options ?? null,
    answer: g.answer ?? null,
    grading_focus: g.grading_focus ?? null,
    explain: g.explain ?? null,
    source: "generated",
    difficulty,
    user_id: user.id,
  }));

  const { data: inserted, error } = await supabase
    .from("drills")
    .insert(rows)
    .select("id");
  if (error) return new Response(error.message, { status: 500 });

  // Immediately reviewable.
  const reviews = (inserted ?? []).map((d) => {
    const card = newCardState();
    return {
      drill_id: d.id,
      user_id: user.id,
      fsrs_state: card.fsrs_state,
      due: card.due,
    };
  });
  if (reviews.length) await supabase.from("reviews").insert(reviews);

  return Response.json({ inserted: inserted?.length ?? 0 });
}
