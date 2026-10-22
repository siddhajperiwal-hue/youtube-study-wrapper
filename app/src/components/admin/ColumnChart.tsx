"use client";

import { useState } from "react";
import { formatDay } from "./format";

interface ColumnChartProps {
  /** Oldest first; `date` is YYYY-MM-DD */
  points: { date: string; value: number }[];
  /** Tooltip / table value, e.g. "3 learners" */
  formatValue: (value: number) => string;
  /** Axis tick text */
  formatTick?: (value: number) => string;
  /** Names what's plotted (single series: the title is the legend) */
  label: string;
  /** Whole-number data (people, sign-ups): no fractional gridlines */
  integer?: boolean;
}

/** Round the axis top up to 1 / 2 / 5 × 10^n so the gridlines land on clean numbers */
function niceMax(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 5, 10].find((s) => s * magnitude >= max) ?? 10;
  return step * magnitude;
}

/**
 * Single-series daily column chart: 4px rounded caps from one baseline, 2px gaps, hairline
 * gridlines, a hover/focus tooltip per column, and a screen-reader table of the same data.
 */
export function ColumnChart({ points, formatValue, formatTick = (v) => String(v), label, integer }: ColumnChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const top = niceMax(Math.max(...points.map((p) => p.value), 0));
  const gridlines = [1, 0.5].filter((f) => !integer || Number.isInteger(top * f));
  const hovered = hover != null ? points[hover] : null;

  return (
    <div className="admin-chart admin-chart-wrap">
      <div className="admin-chart-plot" onMouseLeave={() => setHover(null)}>
        {gridlines.map((f) => (
          <div key={f} className="admin-chart-gridline" style={{ bottom: `${f * 100}%` }}>
            <span>{formatTick(top * f)}</span>
          </div>
        ))}
        {points.map((p, i) => (
          <div
            key={p.date}
            className="admin-chart-slot"
            tabIndex={0}
            aria-label={`${formatDay(p.date)}: ${formatValue(p.value)}`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          >
            <div
              className="admin-chart-bar"
              style={{ height: p.value > 0 ? `max(${(p.value / top) * 100}%, 3px)` : 0 }}
            />
          </div>
        ))}
        {hovered && hover != null && (
          <div
            className="admin-chart-tooltip"
            // Kept inside the plot at the first/last columns
            style={{ left: `clamp(48px, ${((hover + 0.5) / points.length) * 100}%, calc(100% - 48px))` }}
          >
            <strong>{formatDay(hovered.date)}</strong>
            <br />
            {formatValue(hovered.value)}
          </div>
        )}
      </div>
      <div className="admin-chart-axis" aria-hidden="true">
        <span>{points[0] && formatDay(points[0].date)}</span>
        <span>{points.length > 0 && formatDay(points[points.length - 1].date)}</span>
      </div>
      <table className="admin-sr-only">
        <caption>{label}</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <th scope="row">{formatDay(p.date)}</th>
              <td>{formatValue(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
