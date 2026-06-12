import Link from "next/link";
import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import { Badge, Card, PageTitle } from "@/modules/dojo/components/ui";

export const dynamic = "force-dynamic";

const DIFFICULTY_TONE: Record<string, "green" | "gold" | "red"> = {
  easy: "green",
  medium: "gold",
  hard: "red",
  expert: "red",
};

export default async function RoleplayPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: personas }, { data: lastScores }] = await Promise.all([
    supabase.from("personas").select("*"),
    supabase
      .from("roleplays")
      .select("persona_id, overall, ended_at")
      .eq("user_id", user.id)
      .not("overall", "is", null)
      .order("ended_at", { ascending: false }),
  ]);

  const lastByPersona = new Map<string, number>();
  for (const r of lastScores ?? []) {
    if (!lastByPersona.has(r.persona_id)) lastByPersona.set(r.persona_id, r.overall);
  }

  const order = { easy: 0, medium: 1, hard: 2, expert: 3 } as Record<string, number>;
  const sorted = (personas ?? []).sort(
    (a, b) =>
      (order[(a.sheet as any).difficulty] ?? 9) - (order[(b.sheet as any).difficulty] ?? 9)
  );

  return (
    <div>
      <PageTitle
        title="Roleplay simulator"
        subtitle="Deliberate practice with a realistic counterpart — graded on END"
        action={
          <Link href="/roleplay/history" className="text-xs text-flame-400 hover:underline">
            History
          </Link>
        }
      />
      <div className="space-y-2">
        {sorted.map((p) => {
          const sheet = p.sheet as {
            name: string;
            archetype: string;
            difficulty: string;
            trains: string[];
          };
          const last = lastByPersona.get(p.id);
          return (
            <Link key={p.id} href={`/roleplay/${p.id}`} className="block">
              <Card className="transition-colors hover:border-flame-500/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{sheet.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{sheet.archetype}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {sheet.trains.slice(0, 4).map((t) => (
                        <Badge key={t}>{t}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge tone={DIFFICULTY_TONE[sheet.difficulty] ?? "default"}>
                      {sheet.difficulty}
                    </Badge>
                    {last != null && (
                      <span className="text-xs text-slate-400">last: {last}/10</span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
