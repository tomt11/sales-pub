import { notFound } from "next/navigation";
import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import { SessionTutor } from "@/modules/dojo/components/SessionTutor";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", Number(params.id))
    .single();
  if (!session) notFound();

  return (
    <SessionTutor
      sessionId={session.id}
      title={session.title}
      concepts={session.concepts}
    />
  );
}
