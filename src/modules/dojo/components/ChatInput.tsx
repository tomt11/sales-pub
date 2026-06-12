"use client";

import { useState } from "react";
import { Mic, MicOff, SendHorizonal } from "lucide-react";
import { Button } from "./ui";
import { useSpeech } from "../hooks/useSpeech";
import { cn } from "../lib/utils";

/** Text input with optional voice dictation (Web Speech API, graceful fallback). */
export function ChatInput({
  onSend,
  disabled,
  placeholder = "Type or speak…",
  autoSendVoice = false,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoSendVoice?: boolean;
}) {
  const [text, setText] = useState("");
  const { listening, interim, sttSupported, startListening, stopListening } =
    useSpeech({
      onFinalResult: (transcript) => {
        if (autoSendVoice) onSend(transcript);
        else setText((t) => (t ? `${t} ${transcript}` : transcript));
      },
    });

  function submit() {
    const t = text.trim();
    if (!t) return;
    setText("");
    onSend(t);
  }

  return (
    <div className="flex items-end gap-2">
      <textarea
        className="max-h-32 min-h-[44px] w-full resize-none rounded-xl border border-ink-600 bg-ink-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-flame-500 focus:outline-none"
        rows={1}
        value={listening ? interim || text : text}
        placeholder={listening ? "Listening…" : placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        disabled={disabled}
      />
      {sttSupported && (
        <Button
          variant={listening ? "danger" : "secondary"}
          className={cn("h-[44px] w-[44px] shrink-0 p-0", listening && "animate-pulse")}
          onClick={listening ? stopListening : startListening}
          disabled={disabled}
          aria-label="Voice input"
          type="button"
        >
          {listening ? <MicOff size={18} /> : <Mic size={18} />}
        </Button>
      )}
      <Button
        className="h-[44px] w-[44px] shrink-0 p-0"
        onClick={submit}
        disabled={disabled || !text.trim()}
        aria-label="Send"
        type="button"
      >
        <SendHorizonal size={18} />
      </Button>
    </div>
  );
}
