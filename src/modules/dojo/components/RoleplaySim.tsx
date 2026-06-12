"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, PageTitle } from "./ui";
import { ChatInput } from "./ChatInput";
import { Scorecard } from "./Scorecard";
import { useStreamChat } from "../hooks/useStreamChat";
import { useSpeech } from "../hooks/useSpeech";
import { supabaseBrowser } from "../lib/supabase/client";
import type { RoleplayGrade } from "../lib/schemas";
import { Pause, Play, Shuffle, Square, Volume2, VolumeX } from "lucide-react";

export function RoleplaySim({
  personaId,
  sheet,
}: {
  personaId: string;
  sheet: Record<string, unknown>;
}) {
  const [remixedSheet, setRemixedSheet] = useState<Record<string, unknown> | null>(null);
  const activeSheet = remixedSheet ? { ...sheet, ...remixedSheet } : sheet;
  const { messages, setMessages, send, streaming } = useStreamChat("/api/roleplay", {
    personaId,
    ...(remixedSheet ? { sheet: remixedSheet } : {}),
  });
  const [paused, setPaused] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const [grading, setGrading] = useState(false);
  const [grade, setGrade] = useState<RoleplayGrade | null>(null);
  const [remixing, setRemixing] = useState(false);
  const { speak, stopSpeaking, ttsSupported } = useSpeech();
  const voiceOutRef = useRef(voiceOut);
  voiceOutRef.current = voiceOut;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, grade]);

  function sendTurn(text: string) {
    send(text, (reply) => {
      if (voiceOutRef.current && reply) speak(reply);
    });
  }

  async function togglePause() {
    const next = !paused;
    setPaused(next);
    sendTurn(next ? "PAUSE" : "RESUME");
  }

  async function endAndGrade() {
    stopSpeaking();
    setGrading(true);
    try {
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data: row, error } = await supabase
        .from("roleplays")
        .insert({
          user_id: user.id,
          persona_id: personaId,
          transcript: messages,
        })
        .select("id")
        .single();
      if (error || !row) throw error;
      const res = await fetch("/api/grade/roleplay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleplayId: row.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      setGrade(await res.json());
    } catch (err) {
      console.error(err);
      alert("Grading failed — the transcript was saved; try END again.");
    } finally {
      setGrading(false);
    }
  }

  async function remix() {
    setRemixing(true);
    try {
      const res = await fetch("/api/roleplay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId, mode: "remix", messages: [] }),
      });
      if (res.ok) {
        setRemixedSheet(await res.json());
        setMessages([]);
        setGrade(null);
      }
    } finally {
      setRemixing(false);
    }
  }

  const s = activeSheet as {
    name?: string;
    archetype?: string;
    context?: string;
    difficulty?: string;
  };

  if (grade) {
    return (
      <div>
        <PageTitle title={`Scorecard — ${s.name}`} />
        <Scorecard grade={grade} />
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={remix} disabled={remixing}>
            <Shuffle size={16} /> {remixing ? "Remixing…" : "Replay (remixed)"}
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              setMessages([]);
              setGrade(null);
            }}
          >
            Replay same scenario
          </Button>
        </div>
        <div ref={bottomRef} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] flex-col">
      <PageTitle
        title={s.name ?? personaId}
        subtitle={s.archetype}
        action={<Badge tone="red">{s.difficulty}</Badge>}
      />

      {messages.length === 0 && (
        <Card className="mb-3">
          <p className="text-xs leading-relaxed text-slate-400">{s.context}</p>
          <p className="mt-2 text-xs text-slate-500">
            You open the meeting. PAUSE for a coaching timeout; END to finish and get graded.
          </p>
        </Card>
      )}

      <div className="mb-2 flex gap-2">
        <Button variant="secondary" onClick={togglePause} disabled={streaming || grading || messages.length === 0}>
          {paused ? <Play size={14} /> : <Pause size={14} />}
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button
          variant="danger"
          onClick={endAndGrade}
          disabled={streaming || grading || messages.length < 2}
        >
          <Square size={14} /> {grading ? "Grading…" : "End + grade"}
        </Button>
        {ttsSupported && (
          <Button
            variant="ghost"
            onClick={() => {
              if (voiceOut) stopSpeaking();
              setVoiceOut(!voiceOut);
            }}
            aria-label="Toggle voice output"
          >
            {voiceOut ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </Button>
        )}
        <Button variant="ghost" onClick={remix} disabled={remixing || streaming}>
          <Shuffle size={16} />
        </Button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}>
            {m.content || (m.role === "assistant" ? "…" : "")}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <ChatInput
        onSend={sendTurn}
        disabled={streaming || grading}
        placeholder={paused ? "Ask the coach…" : "Your line in the meeting…"}
        autoSendVoice
      />
    </div>
  );
}
