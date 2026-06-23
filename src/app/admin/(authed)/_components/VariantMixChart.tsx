"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

type Point = { days: number; count: number };

// Match the kawaii palette in priority order — most common duration
// gets the strongest accent.
const PALETTE = [
  "var(--pink-400)",
  "var(--cyan-400)",
  "var(--violet-400)",
  "var(--pink-300)",
  "var(--cyan-300)",
];

export function VariantMixChart({ data }: { data: Point[] }) {
  if (data.length === 0 || data.every((d) => d.count === 0)) {
    return (
      <div className="flex h-[200px] items-center justify-center text-[12px] text-fg-dark-mute">
        ยังไม่มีข้อมูลในช่วงนี้
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.count, 0);
  const labelled = data.map((d, i) => ({
    name:    `${d.days} วัน`,
    value:   d.count,
    color:   PALETTE[i % PALETTE.length]!,
    percent: total === 0 ? 0 : Math.round((d.count / total) * 100),
  }));

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={labelled}
            dataKey="value"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="var(--bg-900)"
            strokeWidth={2}
          >
            {labelled.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background:   "var(--paper)",
              border:       "1px solid var(--line-dark)",
              borderRadius: 8,
              fontSize:     12,
              color:        "var(--on-dark)",
            }}
            itemStyle={{ color: "var(--on-dark)" }}
            formatter={(v: number, _name, entry) => {
              const pct = (entry?.payload as { percent: number })?.percent ?? 0;
              return [`${v} (${pct}%)`, ""];
            }}
          />
          <Legend
            verticalAlign="middle"
            align="right"
            layout="vertical"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: "var(--on-dark-soft)" }}
            formatter={(value: string) => <span className="text-fg-dark-soft">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
