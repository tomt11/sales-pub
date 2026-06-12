import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import { RoleplayHistory } from "@/modules/dojo/components/RoleplayHistory";

export const dynamic = "force-dynamic";

export default async function RoleplayHistoryPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: roleplays } = await supabase
    .from("roleplays")
    .select("id, persona_id, ended_at, overall, advance_secured, grade, personas(sheet)")
    .eq("user_id", user.id)
    .not("grade", "is", null)
    .order("ended_at", { ascending: false })
    .limit(50);

  const rows = (roleplays ?? []).map((r) => ({
    id: r.id as string,
    personaName:
      ((r.personas as { sheet?: { name?: string } } | null)?.sheet?.name as string) ??
      r.persona_id,
    endedAt: r.ended_at as string,
    overall: r.overall as number,
    advanceSecured: r.advance_secured as boolean,
    grade: r.grade,
  }));

  return <RoleplayHistory rows={rows} />;
}
