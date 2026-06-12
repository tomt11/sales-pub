import { notFound } from "next/navigation";
import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import { RoleplaySim } from "@/modules/dojo/components/RoleplaySim";

export const dynamic = "force-dynamic";

export default async function RoleplaySessionPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = supabaseServer();
  const { data: persona } = await supabase
    .from("personas")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!persona) notFound();

  return <RoleplaySim personaId={persona.id} sheet={persona.sheet} />;
}
