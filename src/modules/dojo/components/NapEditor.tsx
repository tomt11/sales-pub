"use client";

import { useState } from "react";
import { Badge, Button, Card, Input, PageTitle, Textarea } from "./ui";
import { supabaseBrowser } from "../lib/supabase/client";
import { weeklyNapTask } from "../lib/nap";

type NapGoal = {
  id?: string;
  horizon: "3yr" | "1yr" | "90d";
  goal_a: string | null;
  goal_b: string | null;
  people: string[];
  actions: string[];
  cycle_start: string | null;
};

const HORIZONS: { key: NapGoal["horizon"]; label: string }[] = [
  { key: "3yr", label: "3-year" },
  { key: "1yr", label: "1-year" },
  { key: "90d", label: "90-day cycle" },
];

const empty = (horizon: NapGoal["horizon"]): NapGoal => ({
  horizon,
  goal_a: "",
  goal_b: "",
  people: [],
  actions: [],
  cycle_start: horizon === "90d" ? new Date().toISOString().slice(0, 10) : null,
});

export function NapEditor({ initialGoals }: { initialGoals: NapGoal[] }) {
  const [goals, setGoals] = useState<Record<string, NapGoal>>(() => {
    const byHorizon: Record<string, NapGoal> = {};
    for (const h of HORIZONS) {
      byHorizon[h.key] =
        initialGoals.find((g) => g.horizon === h.key) ?? empty(h.key);
    }
    return byHorizon;
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function update(horizon: string, patch: Partial<NapGoal>) {
    setGoals((g) => ({ ...g, [horizon]: { ...g[horizon], ...patch } }));
  }

  async function save() {
    setSaving(true);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    for (const goal of Object.values(goals)) {
      if (goal.id) {
        await supabase.from("nap_goals").update({ ...goal }).eq("id", goal.id);
      } else {
        const { data } = await supabase
          .from("nap_goals")
          .insert({ ...goal, user_id: user.id })
          .select("id")
          .single();
        if (data) update(goal.horizon, { id: data.id });
      }
    }
    setSaving(false);
    setSavedAt(Date.now());
  }

  const napTask = weeklyNapTask(goals["90d"]);

  return (
    <div>
      <PageTitle
        title="Networking Action Plan"
        subtitle="Blue flame → 3yr → 1yr → 90-day cycle (Never Eat Alone, session 14)"
        action={
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : savedAt ? "Saved ✓" : "Save"}
          </Button>
        }
      />

      {napTask && (
        <Card className="mb-3 border-flame-500/40">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-flame-400">
            This week (cycle week {napTask.week})
          </p>
          <p className="mt-1 text-sm text-slate-200">{napTask.task}</p>
        </Card>
      )}

      <div className="space-y-3">
        {HORIZONS.map(({ key, label }) => {
          const g = goals[key];
          return (
            <Card key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-100">{label}</p>
                <Badge tone="blue">{key}</Badge>
              </div>
              <Input
                placeholder="A-goal"
                value={g.goal_a ?? ""}
                onChange={(e) => update(key, { goal_a: e.target.value })}
              />
              <Input
                placeholder="B-goal"
                value={g.goal_b ?? ""}
                onChange={(e) => update(key, { goal_b: e.target.value })}
              />
              <Textarea
                rows={2}
                placeholder="People to meet (one per line)"
                value={g.people.join("\n")}
                onChange={(e) =>
                  update(key, {
                    people: e.target.value.split("\n").filter(Boolean),
                  })
                }
              />
              <Textarea
                rows={2}
                placeholder="Actions / places / tools (one per line — 90d actions become weekly tasks)"
                value={g.actions.join("\n")}
                onChange={(e) =>
                  update(key, {
                    actions: e.target.value.split("\n").filter(Boolean),
                  })
                }
              />
              {key === "90d" && (
                <Input
                  type="date"
                  value={g.cycle_start ?? ""}
                  onChange={(e) => update(key, { cycle_start: e.target.value })}
                />
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
