import Link from "next/link";
import { supabaseServer } from "@/modules/dojo/lib/supabase/server";
import { BOOK_LABELS } from "@/modules/dojo/lib/playbook";
import { Badge, Card, PageTitle } from "@/modules/dojo/components/ui";
import { CheckCircle2, Lock, PlayCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: sessions }, { data: progress }] = await Promise.all([
    supabase.from("sessions").select("*").order("id"),
    supabase.from("session_progress").select("*").eq("user_id", user.id),
  ]);

  const progressById = new Map((progress ?? []).map((p) => [p.session_id, p]));
  const statusOf = (id: number) =>
    progressById.get(id)?.status ?? (id === 1 ? "available" : "locked");

  const doneCount = (sessions ?? []).filter((s) => statusOf(s.id) === "done").length;

  return (
    <div>
      <PageTitle
        title="Guided sessions"
        subtitle={`${doneCount} of ${sessions?.length ?? 0} complete — encoding before drilling`}
      />
      <div className="space-y-2">
        {(sessions ?? []).map((s) => {
          const status = statusOf(s.id);
          const locked = status === "locked";
          const inner = (
            <Card
              className={
                locked
                  ? "opacity-50"
                  : "transition-colors hover:border-flame-500/50"
              }
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge>{BOOK_LABELS[s.book] ?? s.book}</Badge>
                    <span className="text-[11px] text-slate-500">Session {s.id}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{s.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {(s.concepts as string[]).length} concepts → drill queue
                  </p>
                </div>
                {status === "done" ? (
                  <CheckCircle2 className="shrink-0 text-paddock" size={22} />
                ) : locked ? (
                  <Lock className="shrink-0 text-slate-600" size={20} />
                ) : (
                  <PlayCircle className="shrink-0 text-flame-400" size={24} />
                )}
              </div>
            </Card>
          );
          return locked ? (
            <div key={s.id}>{inner}</div>
          ) : (
            <Link key={s.id} href={`/learn/${s.id}`} className="block">
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
