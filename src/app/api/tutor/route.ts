import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import { MODEL_DIALOGUE, streamText, type ChatMessage } from "@/modules/dojo/lib/anthropic";
import { loadAllPlaybooks, loadPlaybook } from "@/modules/dojo/lib/playbook";
import { tutorPrompt } from "@/modules/dojo/lib/prompts";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { sessionId, messages } = (await req.json()) as {
    sessionId: number;
    messages: ChatMessage[];
  };

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (!session) return new Response("Session not found", { status: 404 });

  const { data: progress } = await supabase
    .from("session_progress")
    .select("status")
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (progress?.status !== "done") {
    await supabase.from("session_progress").upsert(
      { user_id: user.id, session_id: sessionId, status: "in_progress" },
      { onConflict: "user_id,session_id" }
    );
  }

  const playbook =
    session.book === "capstone" ? loadAllPlaybooks() : loadPlaybook(session.book);

  return streamText({
    model: MODEL_DIALOGUE,
    system: tutorPrompt({
      sessionTitle: session.title,
      concepts: session.concepts,
      playbook,
      applicationPrompt: session.application_prompt,
    }),
    messages: messages.length
      ? messages
      : [{ role: "user", content: "I'm ready to start the session." }],
    maxTokens: 1500,
  });
}
