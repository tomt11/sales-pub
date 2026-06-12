"use client";

import { useState } from "react";
import { Flame, Pencil } from "lucide-react";
import { supabaseBrowser } from "../lib/supabase/client";

export function BlueFlame({ initial }: { initial: string }) {
  const [text, setText] = useState(initial);
  const [editing, setEditing] = useState(false);

  async function save() {
    setEditing(false);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("profiles")
      .upsert({ user_id: user.id, blue_flame: text }, { onConflict: "user_id" });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Flame size={14} className="shrink-0 text-flame-400" />
        <input
          autoFocus
          className="w-full rounded border border-ink-600 bg-ink-800 px-2 py-1 text-xs text-slate-200 focus:outline-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-2 text-left"
    >
      <Flame size={14} className="shrink-0 text-flame-400" />
      <span className="text-xs italic text-slate-400">
        {text || "Set your blue-flame statement"}
      </span>
      <Pencil size={11} className="text-slate-600 opacity-0 group-hover:opacity-100" />
    </button>
  );
}
