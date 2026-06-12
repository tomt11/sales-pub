"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Card, PageTitle } from "./ui";
import { Scorecard } from "./Scorecard";
import { roleplayGradeSchema } from "../lib/schemas";
import { timeAgo } from "../lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

type Row = {
  id: string;
  personaName: string;
  endedAt: string;
  overall: number;
  advanceSecured: boolean;
  grade: unknown;
};

export function RoleplayHistory({ rows }: { rows: Row[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div>
      <PageTitle
        title="Roleplay history"
        subtitle="Watch the framework scores climb"
        action={
          <Link href="/roleplay" className="text-xs text-flame-400 hover:underline">
            Back to personas
          </Link>
        }
      />
      {rows.length === 0 && (
        <Card className="text-center text-sm text-slate-400">
          No graded roleplays yet — finish one with END to see it here.
        </Card>
      )}
      <div className="space-y-2">
        {rows.map((r) => {
          const expanded = open === r.id;
          const parsed = expanded
            ? roleplayGradeSchema.safeParse(r.grade)
            : null;
          return (
            <div key={r.id}>
              <Card
                className="cursor-pointer transition-colors hover:border-flame-500/50"
                onClick={() => setOpen(expanded ? null : r.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      {r.personaName}
                    </p>
                    <p className="text-[11px] text-slate-500">{timeAgo(r.endedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={r.advanceSecured ? "green" : "red"}>
                      {r.advanceSecured ? "advance" : "no advance"}
                    </Badge>
                    <span className="text-lg font-bold text-slate-100">
                      {r.overall}/10
                    </span>
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </Card>
              {expanded && parsed?.success && (
                <div className="mt-2 border-l-2 border-ink-700 pl-2">
                  <Scorecard grade={parsed.data} />
                </div>
              )}
              {expanded && parsed && !parsed.success && (
                <Card className="mt-2 text-xs text-slate-400">
                  Stored grade can&apos;t be displayed in the scorecard view.
                </Card>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
