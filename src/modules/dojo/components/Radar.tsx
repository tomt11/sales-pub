import type { RadarPoint } from "../lib/stats";

/** Lightweight SVG radar chart of per-framework rolling averages (0–10). */
export function Radar({ points }: { points: RadarPoint[] }) {
  const size = 280;
  const center = size / 2;
  const radius = size / 2 - 36;
  const n = points.length;

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const coord = (i: number, r: number) => [
    center + r * Math.cos(angle(i)),
    center + r * Math.sin(angle(i)),
  ];

  const ringPath = (frac: number) =>
    points
      .map((_, i) => {
        const [x, y] = coord(i, radius * frac);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ") + " Z";

  const hasData = points.some((p) => p.score !== null);
  const dataPath =
    points
      .map((p, i) => {
        const frac = (p.score ?? 0) / 10;
        const [x, y] = coord(i, radius * frac);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ") + " Z";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-xs">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <path key={f} d={ringPath(f)} fill="none" stroke="#243345" strokeWidth={1} />
        ))}
        {points.map((_, i) => {
          const [x, y] = coord(i, radius);
          return (
            <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#243345" strokeWidth={1} />
          );
        })}
        {hasData && (
          <path d={dataPath} fill="rgba(47,155,255,0.25)" stroke="#2f9bff" strokeWidth={2} />
        )}
        {points.map((p, i) => {
          const [x, y] = coord(i, radius + 18);
          return (
            <text
              key={p.axis}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-400"
              fontSize={11}
            >
              {p.axis}
              {p.score !== null ? ` ${p.score}` : ""}
            </text>
          );
        })}
      </svg>
      {!hasData && (
        <p className="text-xs text-slate-500">Complete drills to populate the radar</p>
      )}
    </div>
  );
}
