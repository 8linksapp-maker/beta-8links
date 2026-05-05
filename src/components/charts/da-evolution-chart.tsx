"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";

type Props = {
  data: { month: string; da: number }[];
};

export default function DaEvolutionChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="gradDa" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(24, 100%, 55%)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="hsl(24, 100%, 55%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(20, 10%, 12%)" vertical={false} />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "hsl(20, 8%, 50%)", fontSize: 11, fontFamily: "var(--font-mono)" }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(20, 8%, 50%)", fontSize: 11, fontFamily: "var(--font-mono)" }} />
        <RechartsTooltip contentStyle={{ background: "hsl(20, 12%, 7%)", border: "1px solid hsl(20, 10%, 18%)", borderRadius: "10px", fontSize: "12px" }} />
        <Area
          type="monotone"
          dataKey="da"
          stroke="hsl(24, 100%, 55%)"
          strokeWidth={2.5}
          fill="url(#gradDa)"
          name="DA"
          dot={false}
          activeDot={{ r: 4, fill: "hsl(24, 100%, 55%)", stroke: "hsl(20, 12%, 7%)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
