import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import { weakestConcepts } from "@/modules/dojo/lib/stats";
import { DrillSession } from "@/modules/dojo/components/DrillSession";

export const dynamic = "force-dynamic";

export default async function DrillPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: due } = await supabase
    .from("reviews")
    .select("id, due, drills(*)")
    .eq("user_id", user.id)
    .lte("due", new Date().toISOString())
    .order("due", { ascending: true })
    .limit(40);

  const queue = (due ?? [])
    .filter((r) => r.drills)
    .map((r) => ({
      reviewId: r.id as string,
      drill: r.drills as unknown as {
        id: string;
        type: string;
        prompt: string;
        options: string[] | null;
        answer: number | null;
        explain: string | null;
        concept_id: string;
      },
    }));

  const weak = await weakestConcepts(supabase, user.id, 3);

  return <DrillSession initialQueue={queue} weakConcepts={weak} />;
}
