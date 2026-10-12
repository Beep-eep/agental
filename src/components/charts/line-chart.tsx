"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { fmt } from "@/lib/format";

export type LineSeries = { key: string; label: string; color: string; values: number[] };

type Props = {
  title: string;
  description?: string;
  x: string[]; // ISO dates or labels, one per value
  series: LineSeries[];
  height?: number;
};

const PAD = { top: 16, right: 92, bottom: 28, left: 44 };

function niceMax(v: number) {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * exp;
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/**
 * Multi-series line chart: 2px lines, one y-axis, hairline grid, legend +
 * direct end labels, crosshair tooltip listing every series, keyboard support,
 * and a table view (the aqua slot sits below 3:1, so values must be reachable).
 */
export function LineChart({ title, description, x, series, height = 260 }: Props) {
  const formatX = defaultX;
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // Draw at the real pixel width so type and strokes keep their specified sizes.
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = height;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const yMax = useMemo(() => niceMax(Math.max(1, ...series.flatMap((s) => s.values))), [series]);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * yMax);
  const xi = (i: number) => PAD.left + (x.length <= 1 ? innerW / 2 : (i / (x.length - 1)) * innerW);
  const yv = (v: number) => PAD.top + innerH - (v / yMax) * innerH;

  const paths = series.map((s) => s.values.map((v, i) => `${i === 0 ? "M" : "L"}${xi(i).toFixed(1)},${yv(v).toFixed(1)}`).join(""));

  // end labels, nudged apart only when they would overlap
  const ends = series
    .map((s) => ({ s, y: yv(s.values.at(-1) ?? 0) }))
    .sort((a, b) => a.y - b.y)
    .reduce<{ s: LineSeries; y: number }[]>((acc, e) => {
      const prev = acc.at(-1);
      acc.push({ ...e, y: prev && e.y - prev.y < 14 ? prev.y + 14 : e.y });
      return acc;
    }, []);

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.left) / innerW) * (x.length - 1));
    setHover(Math.max(0, Math.min(x.length - 1, i)));
  }

  const labelEvery = Math.max(1, Math.ceil(x.length / Math.max(2, Math.floor(W / 110))));

  return (
    <figure className="min-w-0">
      <figcaption className="mb-3">
        <span className="font-semibold">{title}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </figcaption>

      {series.length > 1 && (
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2" aria-label="Legend">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-4 rounded" style={{ background: s.color }} aria-hidden="true" />
              {s.label}
            </li>
          ))}
        </ul>
      )}

      <div className="relative" ref={boxRef}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-none select-none"
          role="img"
          aria-labelledby={`${id}-t`}
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setHover((h) => Math.min(x.length - 1, (h ?? -1) + 1));
            if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? x.length) - 1));
            if (e.key === "Escape") setHover(null);
          }}
          onBlur={() => setHover(null)}
        >
          <title id={`${id}-t`}>{title}</title>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={yv(t)} y2={yv(t)} stroke={t === 0 ? "var(--viz-axis)" : "var(--viz-grid)"} strokeWidth="1" />
              <text x={PAD.left - 8} y={yv(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--viz-muted)" className="tabular">
                {compact.format(t)}
              </text>
            </g>
          ))}
          {x.map((d, i) =>
            i % labelEvery === 0 || (i === x.length - 1 && i % labelEvery > labelEvery / 2) ? (
              <text key={d} x={xi(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--viz-muted)">
                {formatX(d)}
              </text>
            ) : null,
          )}
          {series.map((s, si) => (
            <path key={s.key} d={paths[si]} fill="none" style={{ stroke: s.color }} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {ends.map(({ s, y }) => (
            <g key={s.key}>
              <circle cx={xi(x.length - 1)} cy={yv(s.values.at(-1) ?? 0)} r="4" style={{ fill: s.color, stroke: "var(--viz-surface)" }} strokeWidth="2" />
              <text x={W - PAD.right + 10} y={y} dy="0.32em" fontSize="11" fill="var(--ink-2)">
                {s.label} {fmt(s.values.at(-1))}
              </text>
            </g>
          ))}
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={xi(hover)} x2={xi(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--viz-axis)" strokeWidth="1" />
              {series.map((s) => (
                <circle key={s.key} cx={xi(hover)} cy={yv(s.values[hover] ?? 0)} r="4" style={{ fill: s.color, stroke: "var(--viz-surface)" }} strokeWidth="2" />
              ))}
            </g>
          )}
        </svg>

        {hover !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-lg bg-card px-3 py-2 text-sm shadow-lg ring-1 ring-line"
            style={{ left: `${(xi(hover) / W) * 100}%`, transform: hover > x.length / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
            role="status"
          >
            <p className="mb-1 text-xs text-muted">{formatX(x[hover])}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center gap-2">
                <span className="inline-block h-[2px] w-3" style={{ background: s.color }} aria-hidden="true" />
                <strong className="tabular">{fmt(s.values[hover])}</strong>
                <span className="text-muted">{s.label}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-muted hover:text-ink">Show as table</summary>
          <div className="mt-2 max-h-56 overflow-auto rounded-lg ring-1 ring-line">
            <table className="w-full text-left tabular">
              <thead className="sticky top-0 bg-paper text-muted">
                <tr>
                  <th className="px-3 py-1.5 font-medium">Date</th>
                  {series.map((s) => (
                    <th key={s.key} className="px-3 py-1.5 text-right font-medium">
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {x.map((d, i) => (
                  <tr key={d} className="border-t border-line">
                    <td className="px-3 py-1">{formatX(d)}</td>
                    {series.map((s) => (
                      <td key={s.key} className="px-3 py-1 text-right">
                        {fmt(s.values[i])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
    </figure>
  );
}

function defaultX(d: string) {
  const date = new Date(`${d}T00:00:00`);
  return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
