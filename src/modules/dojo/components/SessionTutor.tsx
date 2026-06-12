"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, PageTitle } from "./ui";
import { ChatInput } from "./ChatInput";
import { useStreamChat } from "../hooks/useStreamChat";
import { cn } from "../lib/utils";

const PHASES = ["ACTIVATE", "TEACH", "TEACHBACK", "APPLY", "CLOSE"] as const;
const PHASE_LABEL: Record<string, string> = {
  ACTIVATE: "Activate",
  TEACH: "Teach",
  TEACHBACK: "Teach-back",
  APPLY: "Apply",
  CLOSE: "Close",
};

export function SessionTutor({
  sessionId,
  title,
  concepts,
}: {
  sessionId: number;
  title: string;
  concepts: string[];
}) {
  const router = useRouter();
  const { messages, send, streaming } = useStreamChat("/api/tutor", { sessionId });
  const [completing, setCompleting] = useState(false);
  const started = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      send("I'm ready to start the session.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const transcript = messages.map((m) => m.content).join("\n");
  const currentPhase = [...PHASES].reverse().find((p) =>
    transcript.includes(`[PHASE:${p}]`)
  );
  const phaseIndex = currentPhase ? PHASES.indexOf(currentPhase) : 0;
  const closeReached = transcript.includes("[PHASE:CLOSE]");

  async function complete() {
    setCompleting(true);
    const res = await fetch("/api/sessions/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, transcript: messages }),
    });
    if (res.ok) {
      router.push("/learn");
      router.refresh();
    } else {
      setCompleting(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] flex-col">
      <PageTitle
        title={title}
        subtitle={concepts.join(" · ")}
        action={
          closeReached ? (
            <Button onClick={complete} disabled={completing}>
              {completing ? "Saving…" : "Complete +100 XP"}
            </Button>
          ) : undefined
        }
      />
      <div className="mb-3 flex gap-1">
        {PHASES.map((p, i) => (
          <div key={p} className="flex-1">
            <div
              className={cn(
                "h-1.5 rounded-full",
                i < phaseIndex
                  ? "bg-paddock"
                  : i === phaseIndex
                    ? "bg-flame-500"
                    : "bg-ink-700"
              )}
            />
            <p
              className={cn(
                "mt-1 text-center text-[9px]",
                i === phaseIndex ? "text-flame-400" : "text-slate-600"
              )}
            >
              {PHASE_LABEL[p]}
            </p>
          </div>
        ))}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}
          >
            {m.content.replace(/\[PHASE:[A-Z]+\]\n?/g, "")}
            {m.role === "assistant" && !m.content && (
              <Badge tone="blue">thinking…</Badge>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={(t) => send(t)} disabled={streaming} />
    </div>
  );
}
