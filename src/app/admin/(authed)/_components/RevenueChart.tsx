"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Point = { date: string; baht: number };

export function RevenueChart({ data }: { data: Point[] }) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="revfill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="var(--pink-400)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--pink-400)" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--line-dark-2)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDay}
            tick={{ fill: "var(--on-dark-mute)", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "var(--line-dark-2)" }}
            interval="preserveStartEnd"
            minTickGap={20}
          />
          <YAxis
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
            tick={{ fill: "var(--on-dark-mute)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            cursor={{ stroke: "var(--line-dark)", strokeWidth: 1 }}
            contentStyle={{
              background:   "var(--paper)",
              border:       "1px solid var(--line-dark)",
              borderRadius: 8,
              fontSize:     12,
              color:        "var(--on-dark)",
            }}
            labelStyle={{ color: "var(--on-dark-mute)", fontSize: 11 }}
            labelFormatter={(label: string) => formatFullDate(label)}
            formatter={(v: number) => [`฿${v.toLocaleString("th-TH")}`, "Revenue"]}
          />
          <Area
            type="monotone"
            dataKey="baht"
            stroke="var(--pink-400)"
            strokeWidth={2}
            fill="url(#revfill)"
            dot={false}
            activeDot={{ r: 4, fill: "var(--pink-400)", stroke: "var(--bg-900)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function shortDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}
function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" });
}
