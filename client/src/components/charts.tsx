// Chart building blocks. Single-series charts only, so no legend boxes: each card's title names
// its series. Mark colours were checked with the dataviz palette validator against the white
// card surface (lightness band, chroma floor, >= 3:1 contrast).
import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export const chartColors = {
  teal: '#0e8c6a',
  tealHover: '#3aa585',
  violet: '#6250d6',
  grid: '#ebe6dc',
  axis: '#4b5f5c',
  surface: '#ffffff',
};

const axisTick = { fill: chartColors.axis, fontSize: 11 };

export interface Point {
  x: number;
  y: number | null;
  label: string;
}

function TooltipBox({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 shadow-lift ring-1 ring-sand-200">
      <p className="text-base font-bold text-ink">{value}</p>
      <p className="text-xs text-ink-soft">{label}</p>
    </div>
  );
}

/** Line over time with a crosshair tooltip. x is epoch ms of each day. */
export function TrendLine({
  data,
  domain,
  yDomain,
  yTicks,
  color = chartColors.teal,
  height = 140,
  format = (v) => String(v),
}: {
  data: Point[];
  domain: [number, number];
  yDomain: [number, number];
  yTicks?: number[];
  color?: string;
  height?: number;
  format?: (value: number) => string;
}) {
  const showDots = data.length <= 16;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
        <CartesianGrid vertical={false} stroke={chartColors.grid} />
        <XAxis
          dataKey="x"
          type="number"
          scale="time"
          domain={domain}
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: chartColors.grid }}
          tickFormatter={(x: number) => new Date(x).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          minTickGap={24}
        />
        <YAxis domain={yDomain} ticks={yTicks} tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ stroke: chartColors.axis, strokeWidth: 1 }}
          isAnimationActive={false}
          content={({ active, payload }) => {
            const point = active ? (payload?.[0]?.payload as Point | undefined) : undefined;
            return point && point.y !== null ? <TooltipBox value={format(point.y)} label={point.label} /> : null;
          }}
        />
        <Line
          type="linear"
          dataKey="y"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          connectNulls
          dot={showDots ? { r: 4, fill: color, stroke: chartColors.surface, strokeWidth: 2 } : false}
          activeDot={{ r: 5, fill: color, stroke: chartColors.surface, strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Columns from a single baseline with a per-bar tooltip. */
export function Columns({
  data,
  height = 160,
  format,
}: {
  data: { key: string; label: string; value: number; tick: string }[];
  height?: number;
  format: (value: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke={chartColors.grid} />
        <XAxis
          dataKey="tick"
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: chartColors.grid }}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          cursor={false}
          isAnimationActive={false}
          content={({ active, payload }) => {
            const bar = active ? (payload?.[0]?.payload as (typeof data)[number] | undefined) : undefined;
            return bar ? <TooltipBox value={format(bar.value)} label={bar.label} /> : null;
          }}
        />
        <Bar
          dataKey="value"
          fill={chartColors.teal}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
          activeBar={{ fill: chartColors.tealHover }}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** The same numbers as the chart above it, for screen readers and anyone who prefers a table. */
export function DataTable({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer font-semibold text-brand-700">Show as table</summary>
      <div className="mt-2 max-h-64 overflow-y-auto rounded-2xl ring-1 ring-sand-200">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-sand-50 text-xs text-ink-soft">
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col" className="px-3 py-2 font-semibold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-sand-200">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-1.5">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
