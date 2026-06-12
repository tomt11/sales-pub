import { Badge, Card, Progress } from "./ui";
import type { RoleplayGrade } from "../lib/schemas";

export function Scorecard({ grade }: { grade: RoleplayGrade }) {
  const mix = grade.question_mix;
  const mixEntries = [
    ["Situation", mix.situation ?? 0],
    ["Problem", mix.problem ?? 0],
    ["Implication", mix.implication ?? 0],
    ["Need-payoff", mix.need_payoff ?? 0],
  ] as const;
  const mixTotal = mixEntries.reduce((s, [, n]) => s + n, 0) || 1;

  return (
    <div className="space-y-3">
      <Card className="text-center">
        <p className="text-4xl font-bold text-slate-100">{grade.overall}/10</p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <Badge tone={grade.advance_secured ? "green" : "red"}>
            {grade.advance_quality}
          </Badge>
          {mix.talk_ratio_estimate && <Badge>{mix.talk_ratio_estimate}</Badge>}
        </div>
      </Card>

      <Card className="border-gold/40 bg-gold/5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gold">
          The one thing
        </p>
        <p className="mt-1 text-sm text-slate-200">{grade.one_thing}</p>
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-100">Framework scores</h3>
        <div className="space-y-3">
          {grade.framework_scores.map((f) => (
            <div key={f.framework}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-slate-300">{f.framework}</span>
                <span className="font-semibold text-slate-100">{f.score}/10</span>
              </div>
              <Progress value={f.score * 10} />
              <p className="mt-1 text-[11px] italic text-slate-500">“{f.evidence}”</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-2 text-sm font-semibold text-slate-100">Question mix</h3>
        <div className="flex h-3 w-full overflow-hidden rounded-full">
          {mixEntries.map(([label, n], i) => (
            <div
              key={label}
              title={`${label}: ${n}`}
              style={{ width: `${(n / mixTotal) * 100}%` }}
              className={
                ["bg-slate-500", "bg-gold", "bg-flame-500", "bg-paddock"][i]
              }
            />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-400">
          {mixEntries.map(([label, n], i) => (
            <span key={label} className="flex items-center gap-1.5">
              <span
                className={
                  "inline-block h-2 w-2 rounded-full " +
                  ["bg-slate-500", "bg-gold", "bg-flame-500", "bg-paddock"][i]
                }
              />
              {label}: {n}
            </span>
          ))}
        </div>
      </Card>

      <Card className="border-paddock/40">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-paddock">
          Best moment
        </p>
        <p className="mt-1 text-sm text-slate-200">{grade.best_moment}</p>
      </Card>

      {grade.self_orientation_incidents.length > 0 && (
        <Card className="border-red-500/30">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-red-400">
            Self-orientation incidents
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-300">
            {grade.self_orientation_incidents.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Card>
      )}

      {grade.premature_solving_incidents.length > 0 && (
        <Card className="border-red-500/30">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-red-400">
            Premature solving
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-300">
            {grade.premature_solving_incidents.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Card>
      )}

      {grade.drill_seeds.length > 0 && (
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Pulled forward in your drill queue
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {grade.drill_seeds.map((d) => (
              <Badge key={d} tone="blue">
                {d}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
