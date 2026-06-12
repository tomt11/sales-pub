"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Input, PageTitle, Textarea } from "./ui";
import { supabaseBrowser } from "../lib/supabase/client";
import { Plus, Trash2 } from "lucide-react";

type Story = {
  id: string;
  region: string | null;
  commodity: string | null;
  scale: string | null;
  story: string;
};

/**
 * Case-story library (Cialdini social proof): the active ingredient is
 * SIMILARITY — filter by region/commodity to find the story that matches the
 * client in front of you. Stories are captured automatically from meeting
 * debriefs or added here, always de-identified.
 */
export function StoriesView({ initialStories }: { initialStories: Story[] }) {
  const [stories, setStories] = useState(initialStories);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ region: "", commodity: "", scale: "", story: "" });

  const shown = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return stories;
    return stories.filter((s) =>
      [s.region, s.commodity, s.scale, s.story]
        .filter(Boolean)
        .some((f) => f!.toLowerCase().includes(q))
    );
  }, [stories, query]);

  async function add() {
    if (!draft.story.trim()) return;
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("case_stories")
      .insert({ user_id: user.id, ...draft, deidentified: true })
      .select("*")
      .single();
    if (data) {
      setStories((s) => [...s, data as Story]);
      setDraft({ region: "", commodity: "", scale: "", story: "" });
      setAdding(false);
    }
  }

  async function remove(id: string) {
    const supabase = supabaseBrowser();
    await supabase.from("case_stories").delete().eq("id", id);
    setStories((s) => s.filter((x) => x.id !== id));
  }

  return (
    <div>
      <PageTitle
        title="Case-story library"
        subtitle="Social proof fires on SIMILARITY — match region, commodity, scale"
        action={
          <Button variant="ghost" onClick={() => setAdding(!adding)}>
            <Plus size={16} />
          </Button>
        }
      />

      <Input
        className="mb-3"
        placeholder="Filter by region, commodity, scale…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {adding && (
        <Card className="mb-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Region"
              value={draft.region}
              onChange={(e) => setDraft({ ...draft, region: e.target.value })}
            />
            <Input
              placeholder="Commodity"
              value={draft.commodity}
              onChange={(e) => setDraft({ ...draft, commodity: e.target.value })}
            />
            <Input
              placeholder="Scale"
              value={draft.scale}
              onChange={(e) => setDraft({ ...draft, scale: e.target.value })}
            />
          </div>
          <Textarea
            rows={3}
            placeholder="The de-identified story: situation → what was done → result. No names."
            value={draft.story}
            onChange={(e) => setDraft({ ...draft, story: e.target.value })}
          />
          <Button className="w-full" onClick={add} disabled={!draft.story.trim()}>
            Save story
          </Button>
        </Card>
      )}

      {shown.length === 0 && (
        <Card className="text-center text-sm text-slate-400">
          No stories yet. They&apos;re captured automatically from meeting debriefs, or
          add one with +.
        </Card>
      )}

      <div className="space-y-2">
        {shown.map((s) => (
          <Card key={s.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {s.region && <Badge tone="blue">{s.region}</Badge>}
                {s.commodity && <Badge tone="green">{s.commodity}</Badge>}
                {s.scale && <Badge>{s.scale}</Badge>}
              </div>
              <button
                onClick={() => remove(s.id)}
                className="text-slate-600 hover:text-red-400"
                aria-label="Delete story"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-200">{s.story}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
