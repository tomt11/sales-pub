import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import { NapEditor } from "@/modules/dojo/components/NapEditor";

export const dynamic = "force-dynamic";

export default async function NapPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: goals } = await supabase
    .from("nap_goals")
    .select("*")
    .eq("user_id", user.id);

  return <NapEditor initialGoals={goals ?? []} />;
}
