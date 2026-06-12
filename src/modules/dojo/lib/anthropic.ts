import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Server-side only. Never import this module from a client component.
let _client: Anthropic | null = null;
export function claude(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

// Per SPEC.md: sonnet for tutor/roleplay/coach quality, haiku for grading/generation speed.
export const MODEL_DIALOGUE = "claude-sonnet-4-6";
export const MODEL_GRADER = "claude-haiku-4-5";

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Stream a Claude completion as a plain-text HTTP response. */
export function streamText(opts: {
  model: string;
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
}): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = claude().messages.stream({
          model: opts.model,
          max_tokens: opts.maxTokens ?? 2048,
          system: opts.system,
          messages: opts.messages,
        });
        stream.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
        await stream.finalMessage();
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode("\n\n[The coach hit a snag — please try again.]")
        );
        controller.close();
        console.error("streamText error", err);
      }
    },
  });
  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/** Strip markdown fences and parse the first JSON value in a model reply. */
export function extractJson(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const start = t.search(/[[{]/);
  if (start > 0) t = t.slice(start);
  return JSON.parse(t);
}

/**
 * JSON-mode call with fence-stripping, zod validation, and one retry that
 * feeds the validation error back to the model (per SPEC §5 guards).
 */
export async function jsonCall<T>(opts: {
  model: string;
  system: string;
  messages: ChatMessage[];
  schema: z.ZodType<T>;
  maxTokens?: number;
}): Promise<T> {
  const attempt = async (messages: ChatMessage[]): Promise<T> => {
    const response = await claude().messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 2048,
      system: opts.system,
      messages,
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return opts.schema.parse(extractJson(text));
  };

  try {
    return await attempt(opts.messages);
  } catch (err) {
    const retryMessages: ChatMessage[] = [
      ...opts.messages,
      {
        role: "user",
        content: `Your previous reply was not valid for the required JSON schema (${String(
          err
        ).slice(0, 400)}). Reply again with ONLY the corrected JSON — no prose, no fences.`,
      },
    ];
    return await attempt(retryMessages);
  }
}
