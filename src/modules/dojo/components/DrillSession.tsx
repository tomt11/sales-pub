"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, PageTitle, Progress, Textarea } from "./ui";
import { useSpeech } from "../hooks/useSpeech";
import { Mic, MicOff, Sparkles } from "lucide-react";
import { cn } from "../lib/utils";

type QueueItem = {
  reviewId: string;
  drill: {
    id: string;
    type: string;
    prompt: string;
    options: string[] | null;
    answer: number | null;
    explain: string | null;
    concept_id: string;
  };
};

type Feedback = {
  kind: "mc" | "ai";
  correct?: boolean;
  explain?: string;
  score?: number;
  feedback?: string;
  rating: string;
};

const EST_SECONDS: Record<string, number> = {
  classify: 20,
  spot: 20,
  produce: 70,
  rewrite: 70,
  plan: 90,
};

export function DrillSession({
  initialQueue,
  weakConcepts,
}: {
  initialQueue: QueueItem[];
  weakConcepts: string[];
}) {
  const router = useRouter();
  const [queue, setQueue] = useState(initialQueue);
  const [index, setIndex] = useState(0);
  const [answerText, setAnswerText] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [shownAt, setShownAt] = useState(() => Date.now());
  const [generating, setGenerating] = useState(false);

  const { listening, interim, sttSupported, startListening, stopListening } =
    useSpeech({
      onFinalResult: (t) => setAnswerText((prev) => (prev ? `${prev} ${t}` : t)),
    });

  const item = queue[index];
  const totalEst = queue
    .slice(index)
    .reduce((s, q) => s + (EST_SECONDS[q.drill.type] ?? 40), 0);

  async function answerChoice(choiceIndex: number) {
    if (!item || feedback || busy) return;
    const correct = choiceIndex === item.drill.answer;
    const fast = Date.now() - shownAt < 8000;
    const rating = correct ? (fast ? "easy" : "good") : "again";
    setFeedback({ kind: "mc", correct, explain: item.drill.explain ?? "", rating });
    setBusy(true);
    await fetch("/api/drill/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewId: item.reviewId,
        rating,
        answerText: item.drill.options?.[choiceIndex],
      }),
    });
    setBusy(false);
  }

  async function submitFreeText() {
    if (!item || !answerText.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/grade/drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drillId: item.drill.id,
          reviewId: item.reviewId,
          answer: answerText.trim(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const grade = await res.json();
      setFeedback({
        kind: "ai",
        score: grade.score,
        feedback: grade.feedback,
        rating: grade.fsrs_rating,
      });
    } catch {
      setFeedback({
        kind: "ai",
        feedback: "Grading failed — your answer wasn't lost; try submitting again.",
        rating: "",
      });
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setFeedback(null);
    setAnswerText("");
    setDoneCount((c) => c + 1);
    setIndex((i) => i + 1);
    setShownAt(Date.now());
  }

  async function generateMore() {
    setGenerating(true);
    try {
      for (const conceptId of weakConcepts.length ? weakConcepts : ["write_implication_question"]) {
        await fetch("/api/generate/drills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conceptId, n: 2, difficulty: "normal" }),
        });
      }
      router.refresh();
      window.location.reload();
    } finally {
      setGenerating(false);
    }
  }

  if (!item) {
    return (
      <div>
        <PageTitle title="Daily drills" subtitle="Spaced retrieval — the retention engine" />
        <Card className="text-center">
          <p className="text-3xl">🎯</p>
          <p className="mt-2 font-semibold text-slate-100">
            {doneCount > 0 ? `Queue clear — ${doneCount} reviews done` : "Nothing due"}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {doneCount >= 5
              ? "Today counts toward your streak."
              : "A day counts toward your streak at 5+ reviews."}
          </p>
          <Button className="mt-4" onClick={generateMore} disabled={generating}>
            <Sparkles size={16} />
            {generating
              ? "Generating…"
              : "Generate fresh drills for my weakest concepts"}
          </Button>
        </Card>
      </div>
    );
  }

  const isChoice = item.drill.type === "classify" || item.drill.type === "spot";

  return (
    <div>
      <PageTitle
        title="Daily drills"
        subtitle={`${queue.length - index} in queue · ~${Math.ceil(totalEst / 60)} min`}
      />
      <Progress value={(doneCount / (doneCount + queue.length - index)) * 100} className="mb-4" />

      <Card>
        <div className="mb-2 flex items-center gap-2">
          <Badge tone="blue">{item.drill.type}</Badge>
          <span className="text-[11px] text-slate-500">{item.drill.concept_id}</span>
        </div>
        <p className="text-sm leading-relaxed text-slate-100">{item.drill.prompt}</p>

        {isChoice && (
          <div className="mt-4 space-y-2">
            {(item.drill.options ?? []).map((opt, i) => {
              const isAnswer = i === item.drill.answer;
              const revealed = feedback?.kind === "mc";
              return (
                <button
                  key={i}
                  onClick={() => answerChoice(i)}
                  disabled={!!feedback}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    revealed && isAnswer
                      ? "border-paddock bg-paddock/10 text-paddock"
                      : revealed
                        ? "border-ink-700 bg-ink-800 text-slate-500"
                        : "border-ink-600 bg-ink-800 text-slate-200 hover:border-flame-500"
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {!isChoice && !feedback && (
          <div className="mt-4 space-y-2">
            <Textarea
              rows={5}
              value={listening && interim ? `${answerText} ${interim}` : answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Your answer — type it or dictate it"
            />
            <div className="flex gap-2">
              {sttSupported && (
                <Button
                  variant={listening ? "danger" : "secondary"}
                  onClick={listening ? stopListening : startListening}
                  type="button"
                >
                  {listening ? <MicOff size={16} /> : <Mic size={16} />}
                  {listening ? "Stop" : "Dictate"}
                </Button>
              )}
              <Button
                className="flex-1"
                onClick={submitFreeText}
                disabled={busy || !answerText.trim()}
              >
                {busy ? "Grading…" : "Submit for grading"}
              </Button>
            </div>
          </div>
        )}

        {feedback && (
          <div
            className={cn(
              "mt-4 rounded-lg border p-3 text-sm",
              feedback.kind === "mc"
                ? feedback.correct
                  ? "border-paddock/50 bg-paddock/5"
                  : "border-red-500/50 bg-red-500/5"
                : "border-flame-500/40 bg-flame-500/5"
            )}
          >
            {feedback.kind === "mc" ? (
              <>
                <p className="font-semibold text-slate-100">
                  {feedback.correct ? "Correct" : "Not quite"}
                </p>
                <p className="mt-1 text-slate-300">{feedback.explain}</p>
              </>
            ) : (
              <>
                {feedback.score != null && (
                  <p className="font-semibold text-slate-100">
                    Score: {feedback.score}/4{" "}
                    <Badge
                      tone={feedback.score >= 3 ? "green" : "gold"}
                      className="ml-1"
                    >
                      {feedback.rating}
                    </Badge>
                  </p>
                )}
                <p className="mt-1 text-slate-300">{feedback.feedback}</p>
              </>
            )}
            {feedback.rating !== "" && (
              <Button className="mt-3 w-full" onClick={next}>
                Next
              </Button>
            )}
            {feedback.rating === "" && (
              <Button
                className="mt-3 w-full"
                variant="secondary"
                onClick={() => setFeedback(null)}
              >
                Try again
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
