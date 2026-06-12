"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, PageTitle, Textarea } from "./ui";
import { useSpeech } from "../hooks/useSpeech";
import { supabaseBrowser } from "../lib/supabase/client";
import type { Debrief, Prebrief } from "../lib/schemas";
import { timeAgo } from "../lib/utils";
import { HandHeart, Mic, MicOff, Star, Upload, UserPlus } from "lucide-react";

type Contact = {
  id: string;
  name: string;
  firm: string | null;
  type: string;
  ladder_level: number;
  super_connector: boolean;
  glue: string | null;
  personal_notes: Record<string, string>;
  cadence_days: number;
  last_touch: string | null;
  priority: number;
};

function daysOverdue(c: Contact): number {
  if (!c.last_touch) return 999;
  const elapsed = Math.floor(
    (Date.now() - new Date(c.last_touch).getTime()) / 86400000
  );
  return elapsed - c.cadence_days;
}

export function FieldView({ initialContacts }: { initialContacts: Contact[] }) {
  const router = useRouter();
  const [contacts, setContacts] = useState(initialContacts);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [importing, setImporting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFirm, setNewFirm] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(
    () =>
      [...contacts].sort((a, b) => {
        const overdueDiff = daysOverdue(b) - daysOverdue(a);
        if (overdueDiff !== 0) return overdueDiff;
        return a.priority - b.priority;
      }),
    [contacts]
  );

  async function importCsv(file: File) {
    setImporting(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/contacts/import", { method: "POST", body: formData });
      if (!res.ok) {
        alert(await res.text());
        return;
      }
      router.refresh();
      window.location.reload();
    } finally {
      setImporting(false);
    }
  }

  async function addContact() {
    if (!newName.trim()) return;
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("contacts")
      .insert({ user_id: user.id, name: newName.trim(), firm: newFirm.trim() || null })
      .select("*")
      .single();
    if (data) {
      setContacts((c) => [...c, data as Contact]);
      setNewName("");
      setNewFirm("");
      setAdding(false);
    }
  }

  async function logTouch(contact: Contact) {
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("contacts").update({ last_touch: today }).eq("id", contact.id);
    await supabase
      .from("xp_events")
      .insert({ user_id: user.id, source: "touch_without_ask", points: 25 });
    setContacts((cs) =>
      cs.map((c) => (c.id === contact.id ? { ...c, last_touch: today } : c))
    );
  }

  if (selected) {
    return (
      <MeetingFlow
        contact={selected}
        onBack={(updated) => {
          if (updated) {
            setContacts((cs) => cs.map((c) => (c.id === updated.id ? updated : c)));
          }
          setSelected(null);
        }}
      />
    );
  }

  return (
    <div>
      <PageTitle
        title="Field"
        subtitle={`${contacts.length} contacts — transfer loop: pre-brief → meet → debrief`}
        action={
          <div className="flex gap-1">
            <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={importing}>
              <Upload size={16} />
            </Button>
            <Button variant="ghost" onClick={() => setAdding(!adding)}>
              <UserPlus size={16} />
            </Button>
          </div>
        }
      />
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importCsv(f);
        }}
      />

      {adding && (
        <Card className="mb-3 space-y-2">
          <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input placeholder="Firm (optional)" value={newFirm} onChange={(e) => setNewFirm(e.target.value)} />
          <Button onClick={addContact} className="w-full">
            Add contact
          </Button>
        </Card>
      )}

      {contacts.length === 0 && !adding && (
        <Card className="text-center">
          <p className="text-sm text-slate-300">No contacts yet.</p>
          <p className="mt-1 text-xs text-slate-500">
            Import your CRM as CSV (header row with at least a name column) or add one
            manually.
          </p>
          <Button className="mt-3" onClick={() => fileRef.current?.click()} disabled={importing}>
            <Upload size={16} /> {importing ? "Importing…" : "Import CSV"}
          </Button>
        </Card>
      )}

      <div className="space-y-2">
        {sorted.map((c) => {
          const overdue = daysOverdue(c);
          return (
            <Card key={c.id} className="cursor-pointer transition-colors hover:border-flame-500/50">
              <div onClick={() => setSelected(c)}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-slate-100">{c.name}</p>
                    {c.super_connector && <Star size={13} className="text-gold" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge tone="default">L{c.ladder_level}</Badge>
                    {overdue > 0 && overdue < 999 && (
                      <Badge tone="red">{overdue}d overdue</Badge>
                    )}
                    {overdue >= 999 && <Badge tone="red">never touched</Badge>}
                  </div>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  {[c.firm, c.type, c.glue && `glue: ${c.glue}`].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  last touch {timeAgo(c.last_touch)} · cadence {c.cadence_days}d
                </p>
              </div>
              <div className="mt-2 flex gap-2">
                <Button variant="secondary" className="flex-1 py-1.5 text-xs" onClick={() => setSelected(c)}>
                  Meeting
                </Button>
                <Button
                  variant="ghost"
                  className="py-1.5 text-xs"
                  onClick={() => logTouch(c)}
                  title="Log a touch-without-ask (+25 XP)"
                >
                  <HandHeart size={14} /> touch
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function MeetingFlow({
  contact,
  onBack,
}: {
  contact: Contact;
  onBack: (updated?: Contact) => void;
}) {
  const [purpose, setPurpose] = useState("");
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [prebrief, setPrebrief] = useState<Prebrief | null>(null);
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [debriefText, setDebriefText] = useState("");
  const [busy, setBusy] = useState(false);
  const { listening, interim, sttSupported, startListening, stopListening } =
    useSpeech({
      onFinalResult: (t) => setDebriefText((prev) => (prev ? `${prev} ${t}` : t)),
    });

  async function createAndPrebrief() {
    setBusy(true);
    try {
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: meeting, error } = await supabase
        .from("meetings")
        .insert({
          user_id: user.id,
          contact_id: contact.id,
          purpose: purpose || "relationship development",
          scheduled_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error || !meeting) throw error;
      setMeetingId(meeting.id);
      const res = await fetch("/api/meetings/prebrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: meeting.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      setPrebrief(await res.json());
    } catch (err) {
      console.error(err);
      alert("Pre-brief failed — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitDebrief() {
    if (!meetingId || !debriefText.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/meetings/debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, raw: debriefText.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      setDebrief(await res.json());
    } catch (err) {
      console.error(err);
      alert("Debrief failed — your notes are still in the box; try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageTitle
        title={contact.name}
        subtitle={[contact.firm, contact.glue && `glue: ${contact.glue}`]
          .filter(Boolean)
          .join(" · ")}
        action={
          <Button variant="ghost" onClick={() => onBack()}>
            Back
          </Button>
        }
      />

      {Object.keys(contact.personal_notes ?? {}).length > 0 && (
        <Card className="mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Personal file
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-300">
            {Object.entries(contact.personal_notes).map(([k, v]) => (
              <li key={k}>
                <span className="text-slate-500">{k}:</span> {v}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!prebrief && (
        <Card className="space-y-2">
          <p className="text-sm font-semibold text-slate-100">New meeting</p>
          <Input
            placeholder="Purpose (e.g. annual review, succession intro)"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
          <Button className="w-full" onClick={createAndPrebrief} disabled={busy}>
            {busy ? "Briefing…" : "Generate pre-brief"}
          </Button>
        </Card>
      )}

      {prebrief && !debrief && (
        <div className="space-y-3">
          <Card className="border-flame-500/40">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-flame-400">
              Practise this meeting
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              {prebrief.technique.concept_id}
            </p>
            <p className="mt-0.5 text-sm text-slate-300">{prebrief.technique.instruction}</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-paddock">Best case:</span>{" "}
              {prebrief.best_case_advance}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              <span className="font-semibold text-gold">Minimum:</span>{" "}
              {prebrief.minimum_advance}
            </p>
          </Card>
          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Prepared questions
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-200">
              {prebrief.prepared_questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Load before walking in
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-300">
              {prebrief.personal_loadout.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </Card>

          <Card className="space-y-2">
            <p className="text-sm font-semibold text-slate-100">After the meeting</p>
            <Textarea
              rows={4}
              placeholder="Debrief — what happened, what they said, next steps. Big mic button for the car park."
              value={listening && interim ? `${debriefText} ${interim}` : debriefText}
              onChange={(e) => setDebriefText(e.target.value)}
            />
            <div className="flex gap-2">
              {sttSupported && (
                <Button
                  variant={listening ? "danger" : "secondary"}
                  onClick={listening ? stopListening : startListening}
                  className="h-14 w-14 shrink-0 p-0"
                  aria-label="Dictate debrief"
                >
                  {listening ? <MicOff size={22} /> : <Mic size={22} />}
                </Button>
              )}
              <Button
                className="h-14 flex-1"
                onClick={submitDebrief}
                disabled={busy || !debriefText.trim()}
              >
                {busy ? "Processing…" : "Submit debrief"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {debrief && (
        <div className="space-y-3">
          <Card className="text-center">
            <Badge
              tone={
                debrief.outcome === "advance"
                  ? "green"
                  : debrief.outcome === "setback"
                    ? "red"
                    : "gold"
              }
            >
              {debrief.outcome}
              {debrief.outcome === "advance" ? " +150 XP" : ""}
            </Badge>
            <p className="mt-2 text-sm text-slate-300">{debrief.outcome_reason}</p>
          </Card>
          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Technique: {debrief.technique_score}/4
            </p>
            <p className="mt-1 text-sm text-slate-300">{debrief.technique_feedback}</p>
          </Card>
          <Card className="border-gold/40 bg-gold/5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gold">
              Reflect before the next touch
            </p>
            <p className="mt-1 text-sm text-slate-200">{debrief.reflection_question}</p>
            {debrief.next_touch_suggestion && (
              <p className="mt-2 text-xs text-slate-400">
                Next touch: {debrief.next_touch_suggestion}
              </p>
            )}
          </Card>
          <Button
            className="w-full"
            onClick={() =>
              onBack({
                ...contact,
                last_touch: new Date().toISOString().slice(0, 10),
                personal_notes: {
                  ...contact.personal_notes,
                  ...debrief.new_personal_details,
                },
              })
            }
          >
            Done
          </Button>
        </div>
      )}
    </div>
  );
}
