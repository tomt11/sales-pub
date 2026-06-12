"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, PageTitle } from "./ui";
import { ChatInput } from "./ChatInput";
import { useStreamChat } from "../hooks/useStreamChat";
import { useSpeech } from "../hooks/useSpeech";
import { supabaseBrowser } from "../lib/supabase/client";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { cn } from "../lib/utils";

type QuizItem = {
  reviewId: string;
  drill: { id: string; prompt: string; type: string; concept_id: string };
};

/**
 * Voice AI coach. Two modes:
 *  - Coach: free conversation with the playbook-grounded coach (spoken replies,
 *    hands-free loop: it listens again after it finishes speaking).
 *  - Quiz: hands-free drill quiz over due free-text drills — the coach reads the
 *    drill, you answer aloud, the AI grader scores it and FSRS is updated.
 */
export function VoiceCoach() {
  const [mode, setMode] = useState<"coach" | "quiz">("coach");
  const [handsFree, setHandsFree] = useState(true);
  const { messages, send, streaming } = useStreamChat("/api/coach");
  const {
    listening,
    speaking,
    interim,
    sttSupported,
    ttsSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  } = useSpeech({ onFinalResult: (t) => handleVoice(t) });

  // ----- quiz state -----
  const [quizQueue, setQuizQueue] = useState<QuizItem[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizStatus, setQuizStatus] = useState<string>("");
  const [lastFeedback, setLastFeedback] = useState<string>("");
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const handsFreeRef = useRef(handsFree);
  handsFreeRef.current = handsFree;
  const quizRef = useRef({ queue: quizQueue, index: quizIndex });
  quizRef.current = { queue: quizQueue, index: quizIndex };
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, lastFeedback, quizStatus]);

  function maybeListen() {
    if (handsFreeRef.current && sttSupported) startListening();
  }

  function handleVoice(transcript: string) {
    if (modeRef.current === "coach") sendToCoach(transcript);
    else answerQuiz(transcript);
  }

  function sendToCoach(text: string) {
    stopSpeaking();
    send(text, (reply) => {
      if (ttsSupported) speak(reply, maybeListen);
    });
  }

  async function startQuiz() {
    setMode("quiz");
    setQuizStatus("Loading your due drills…");
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("reviews")
      .select("id, drills(id, prompt, type, concept_id)")
      .eq("user_id", user.id)
      .lte("due", new Date().toISOString())
      .order("due", { ascending: true })
      .limit(30);
    const queue: QuizItem[] = (data ?? [])
      .filter((r) => {
        const d = r.drills as unknown as { type: string } | null;
        return d && ["produce", "rewrite", "plan"].includes(d.type);
      })
      .map((r) => ({
        reviewId: r.id as string,
        drill: r.drills as unknown as QuizItem["drill"],
      }))
      .slice(0, 10);
    setQuizQueue(queue);
    setQuizIndex(0);
    if (!queue.length) {
      const msg = "No spoken-answer drills due right now. Switch to coach mode, or generate fresh drills on the drill screen.";
      setQuizStatus(msg);
      speak(msg);
      return;
    }
    askCurrent(queue, 0);
  }

  function askCurrent(queue: QuizItem[], index: number) {
    const item = queue[index];
    if (!item) {
      const msg = `Quiz done — ${queue.length} drills graded and scheduled. Nice work.`;
      setQuizStatus(msg);
      speak(msg);
      return;
    }
    setLastFeedback("");
    setQuizStatus(`Drill ${index + 1} of ${queue.length}: ${item.drill.prompt}`);
    speak(`Drill ${index + 1}. ${item.drill.prompt}`, maybeListen);
  }

  async function answerQuiz(transcript: string) {
    const { queue, index } = quizRef.current;
    const item = queue[index];
    if (!item) return;
    setQuizStatus("Grading…");
    try {
      const res = await fetch("/api/grade/drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drillId: item.drill.id,
          reviewId: item.reviewId,
          answer: transcript,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const grade = await res.json();
      const fb = `Score ${grade.score} out of 4. ${grade.feedback}`;
      setLastFeedback(fb);
      speak(fb, () => {
        const next = index + 1;
        setQuizIndex(next);
        askCurrent(queue, next);
      });
    } catch {
      const msg = "Grading hit a snag — say your answer again.";
      setQuizStatus(msg);
      speak(msg, maybeListen);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] flex-col">
      <PageTitle
        title="Voice coach"
        subtitle="Talk it out — lines, labels and implication questions are spoken skills"
      />

      <div className="mb-3 flex gap-2">
        <Button
          variant={mode === "coach" ? "primary" : "secondary"}
          className="flex-1"
          onClick={() => {
            stopSpeaking();
            setMode("coach");
          }}
        >
          Coach chat
        </Button>
        <Button
          variant={mode === "quiz" ? "primary" : "secondary"}
          className="flex-1"
          onClick={startQuiz}
        >
          Voice drill quiz
        </Button>
      </div>

      {!sttSupported && (
        <Card className="mb-3 border-gold/40">
          <p className="text-xs text-slate-300">
            This browser doesn&apos;t support speech recognition — the coach still works
            by text below, and replies {ttsSupported ? "are spoken aloud" : "appear as text"}.
          </p>
        </Card>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto pb-3">
        {mode === "coach" ? (
          <>
            {messages.length === 0 && (
              <Card>
                <p className="text-sm text-slate-300">
                  Try: <em>“Quiz me on implication questions.”</em> ·{" "}
                  <em>“Let me rehearse the label for Bruce&apos;s retention offer.”</em> ·{" "}
                  <em>“Pre-brief me — I see Greg Hartley at ten.”</em>
                </p>
              </Card>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}>
                {m.content || "…"}
              </div>
            ))}
          </>
        ) : (
          <>
            <Card>
              <p className="whitespace-pre-wrap text-sm text-slate-200">{quizStatus}</p>
              {listening && (
                <p className="mt-2 text-xs italic text-flame-400">
                  {interim || "Listening…"}
                </p>
              )}
            </Card>
            {lastFeedback && (
              <Card className="border-flame-500/40 bg-flame-500/5">
                <p className="text-sm text-slate-200">{lastFeedback}</p>
              </Card>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="space-y-2">
        {sttSupported && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={listening ? stopListening : startListening}
              disabled={streaming || speaking}
              className={cn(
                "flex h-20 w-20 items-center justify-center rounded-full border-4 transition-all",
                listening
                  ? "animate-pulse border-red-500 bg-red-500/20 text-red-400"
                  : speaking
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-flame-500 bg-flame-500/10 text-flame-400 hover:bg-flame-500/20"
              )}
              aria-label={listening ? "Stop listening" : "Start listening"}
            >
              {speaking ? (
                <Volume2 size={30} />
              ) : listening ? (
                <MicOff size={30} />
              ) : (
                <Mic size={30} />
              )}
            </button>
            <label className="flex items-center gap-1.5 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={handsFree}
                onChange={(e) => setHandsFree(e.target.checked)}
                className="accent-flame-500"
              />
              hands-free
            </label>
          </div>
        )}
        {mode === "coach" && (
          <ChatInput
            onSend={sendToCoach}
            disabled={streaming}
            placeholder="Or type to the coach…"
          />
        )}
      </div>
    </div>
  );
}
