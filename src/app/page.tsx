import Link from "next/link";
import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import {
  currentStreak,
  skillRadar,
  totalXp,
  xpThisWeek,
} from "@/modules/dojo/lib/stats";
import { rankFor } from "@/modules/dojo/lib/xp";
import { Badge, Card } from "@/modules/dojo/components/ui";
import { BlueFlame } from "@/modules/dojo/components/BlueFlame";
import { Radar } from "@/modules/dojo/components/Radar";
import { Flame, Target, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const nowIso = new Date().toISOString();
  const [
    { count: dueCount },
    { data: profile },
    { data: nextSession },
    { data: pendingMeetings },
    { data: lastRoleplay },
    radar,
    streak,
    weekXp,
    total,
    { data: capstone },
  ] = await Promise.all([
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .lte("due", nowIso),
    supabase.from("profiles").select("blue_flame").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("session_progress")
      .select("session_id, status, sessions(title)")
      .eq("user_id", user.id)
      .in("status", ["available", "in_progress"])
      .order("session_id", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("meetings")
      .select("id, purpose, scheduled_at, contacts(name)")
      .eq("user_id", user.id)
      .is("prebrief", null)
      .gte("scheduled_at", new Date(Date.now() - 86400000).toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(3),
    supabase
      .from("roleplays")
      .select("grade")
      .eq("user_id", user.id)
      .not("grade", "is", null)
      .order("ended_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    skillRadar(supabase, user.id),
    currentStreak(supabase, user.id),
    xpThisWeek(supabase, user.id),
    totalXp(supabase, user.id),
    supabase
      .from("session_progress")
      .select("status, sessions!inner(book)")
      .eq("user_id", user.id)
      .eq("status", "done")
      .eq("sessions.book", "capstone")
      .limit(1)
      .maybeSingle(),
  ]);

  const oneThing = (lastRoleplay?.grade as { one_thing?: string } | null)?.one_thing;
  const rank = rankFor(total, !!capstone);
  const sessionTitle = (nextSession?.sessions as { title?: string } | null)?.title;

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-100">Origination Dojo</h1>
          <Badge tone="gold">{rank.name}</Badge>
        </div>
        <BlueFlame initial={profile?.blue_flame ?? ""} />
      </header>

      {oneThing && (
        <Card className="border-gold/40 bg-gold/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gold">
            One thing to change
          </p>
          <p className="mt-1 text-sm text-slate-200">{oneThing}</p>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <Zap className="mx-auto text-flame-400" size={18} />
          <p className="mt-1 text-2xl font-bold text-slate-100">{dueCount ?? 0}</p>
          <p className="text-[11px] text-slate-400">drills due</p>
        </Card>
        <Card className="text-center">
          <Flame className="mx-auto text-gold" size={18} />
          <p className="mt-1 text-2xl font-bold text-slate-100">{streak}</p>
          <p className="text-[11px] text-slate-400">day streak</p>
        </Card>
        <Card className="text-center">
          <Target className="mx-auto text-paddock" size={18} />
          <p className="mt-1 text-2xl font-bold text-slate-100">{weekXp}</p>
          <p className="text-[11px] text-slate-400">XP this week</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-2 text-sm font-semibold text-slate-100">Today</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/drill" className="flex items-center justify-between rounded-lg bg-ink-800 px-3 py-2.5 hover:bg-ink-700">
              <span>Daily drills</span>
              <Badge tone={dueCount ? "blue" : "green"}>
                {dueCount ? `${dueCount} due` : "clear"}
              </Badge>
            </Link>
          </li>
          {sessionTitle && (
            <li>
              <Link
                href={`/learn/${nextSession!.session_id}`}
                className="flex items-center justify-between rounded-lg bg-ink-800 px-3 py-2.5 hover:bg-ink-700"
              >
                <span>Next session: {sessionTitle}</span>
                <Badge tone="gold">
                  {nextSession!.status === "in_progress" ? "resume" : "start"}
                </Badge>
              </Link>
            </li>
          )}
          <li>
            <Link href="/nap" className="flex items-center justify-between rounded-lg bg-ink-800 px-3 py-2.5 hover:bg-ink-700">
              <span>Networking Action Plan</span>
              <Badge>NAP</Badge>
            </Link>
          </li>
          {(pendingMeetings ?? []).map((m) => (
            <li key={m.id}>
              <Link href="/field" className="flex items-center justify-between rounded-lg bg-ink-800 px-3 py-2.5 hover:bg-ink-700">
                <span>
                  Pre-brief: {(m.contacts as { name?: string } | null)?.name ?? "meeting"}
                </span>
                <Badge tone="red">needed</Badge>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold text-slate-100">Skill radar</h2>
        <Radar points={radar} />
      </Card>
    </div>
  );
}
