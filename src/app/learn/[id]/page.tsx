import { notFound } from "next/navigation";
import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import { SessionTutor } from "@/modules/dojo/components/SessionTutor";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: session }, { data: progress }] = await Promise.all([
    supabase.from("sessions").select("*").eq("id", Number(params.id)).single(),
    user
      ? supabase
          .from("session_progress")
          .select("status, transcript")
          .eq("user_id", user.id)
          .eq("session_id", Number(params.id))
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!session) notFound();

  return (
    <SessionTutor
      sessionId={session.id}
      title={session.title}
      concepts={session.concepts}
      initialMessages={
        (progress?.transcript as { role: "user" | "assistant"; content: string }[]) ??
        []
      }
      progressStatus={progress?.status ?? "available"}
    />
  );
}
