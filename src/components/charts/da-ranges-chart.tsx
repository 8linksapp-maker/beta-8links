"use client";

import {
  BarChart, Bar, Cell, XAxis, YAxis,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";

type RangeItem = { range: string; count: number };

export default function DaRangesChart({ data }: { data: RangeItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} layout="vertical">
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="range"
          axisLine={false}
          tickLine={false}
          width={55}
          tick={{ fill: "hsl(20, 8%, 50%)", fontSize: 10, fontFamily: "var(--font-mono)" }}
        />
        <RechartsTooltip
          contentStyle={{ background: "hsl(20, 12%, 7%)", border: "1px solid hsl(20, 10%, 18%)", borderRadius: "8px", fontSize: "11px" }}
          formatter={(value) => [`${value} domínios`, ""]}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
          {data.map((_, idx) => (
            <Cell
              key={idx}
              fill={idx >= 3 ? "hsl(140, 70%, 45%)" : idx >= 2 ? "hsl(24, 100%, 55%)" : "hsl(20, 10%, 30%)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
