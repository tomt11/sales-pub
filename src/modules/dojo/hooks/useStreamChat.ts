"use client";

import { useCallback, useRef, useState } from "react";

export type Msg = { role: "user" | "assistant"; content: string };

/**
 * Minimal streaming chat state against a plain-text streaming endpoint.
 * send() posts {…body, messages} and appends the streamed assistant reply.
 */
export function useStreamChat(
  endpoint: string,
  body: Record<string, unknown> = {},
  initial: Msg[] = []
) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [streaming, setStreaming] = useState(false);
  const bodyRef = useRef(body);
  bodyRef.current = body;

  const send = useCallback(
    async (content: string, onDone?: (reply: string, all: Msg[]) => void) => {
      const userMsg: Msg = { role: "user", content };
      let history: Msg[] = [];
      setMessages((prev) => {
        history = [...prev, userMsg];
        return [...history, { role: "assistant", content: "" }];
      });
      setStreaming(true);
      let reply = "";
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...bodyRef.current, messages: history }),
        });
        if (!res.ok || !res.body) throw new Error(await res.text());
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          reply += decoder.decode(value, { stream: true });
          const current = reply;
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: "assistant", content: current },
          ]);
        }
      } catch (err) {
        reply = reply || "Something went wrong — try again.";
        setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: reply }]);
        console.error(err);
      } finally {
        setStreaming(false);
      }
      onDone?.(reply, [...history, { role: "assistant", content: reply }]);
      return reply;
    },
    [endpoint]
  );

  return { messages, setMessages, send, streaming };
}
