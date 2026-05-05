"use client";

import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";

type ChartItem = { name: string; da: number; isUser: boolean };

type Props = {
  data: ChartItem[];
  userColor: string;
  competitorColor: string;
};

export default function CompetitorDaBar({ data, userColor, competitorColor }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
        barCategoryGap="28%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(220, 10%, 18%)"
          horizontal={false}
        />
        <XAxis
          type="number"
          domain={[0, 70]}
          tick={{ fill: "hsl(220, 10%, 50%)", fontSize: 12 }}
          axisLine={{ stroke: "hsl(220, 10%, 20%)" }}
          tickLine={false}
        />
        <YAxis
          dataKey="name"
          type="category"
          width={120}
          tick={{ fill: "hsl(220, 10%, 65%)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <RechartsTooltip
          contentStyle={{
            background: "hsl(220, 15%, 12%)",
            border: "1px solid hsl(220, 10%, 20%)",
            borderRadius: "8px",
            color: "hsl(220, 10%, 85%)",
            fontSize: "13px",
          }}
          formatter={(value) => [`AP ${value}`, ""]}
          cursor={{ fill: "hsl(220, 10%, 15%)" }}
        />
        <Bar dataKey="da" radius={[0, 6, 6, 0]} barSize={28}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.isUser ? userColor : competitorColor}
              opacity={entry.isUser ? 1 : 0.6}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
