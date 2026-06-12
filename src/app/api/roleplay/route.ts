import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import {
  MODEL_DIALOGUE,
  jsonCall,
  streamText,
  type ChatMessage,
} from "@/modules/dojo/lib/anthropic";
import { remixPrompt, roleplayPrompt } from "@/modules/dojo/lib/prompts";
import { remixedPersonaSchema } from "@/modules/dojo/lib/schemas";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { personaId, messages, mode, sheet } = (await req.json()) as {
    personaId: string;
    messages: ChatMessage[];
    mode?: "play" | "remix";
    sheet?: Record<string, unknown>; // remixed sheet from a prior remix call
  };

  const { data: persona } = await supabase
    .from("personas")
    .select("*")
    .eq("id", personaId)
    .single();
  if (!persona) return new Response("Persona not found", { status: 404 });

  const baseSheet = persona.sheet as Record<string, unknown>;
  const activeSheet = sheet ? { ...baseSheet, ...sheet } : baseSheet;

  if (mode === "remix") {
    const remixed = await jsonCall({
      model: MODEL_DIALOGUE,
      system: "You design realistic Australian agricultural finance roleplay scenarios.",
      messages: [{ role: "user", content: remixPrompt({ personaSheet: baseSheet }) }],
      schema: remixedPersonaSchema,
      maxTokens: 1500,
    });
    return Response.json(remixed);
  }

  return streamText({
    model: MODEL_DIALOGUE,
    system: roleplayPrompt({ personaSheet: activeSheet }),
    messages,
    maxTokens: 600,
  });
}
