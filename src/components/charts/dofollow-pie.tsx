"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

type PieDataItem = { name: string; value: number; fill: string };

export default function DofollowPie({ data }: { data: PieDataItem[] }) {
  return (
    <ResponsiveContainer width={120} height={120}>
      <PieChart>
        <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55} strokeWidth={0}>
          {data.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
