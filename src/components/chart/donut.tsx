"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatPct, formatUsd } from "@/lib/format";

const COLORS = [
  "#FF3DA0",
  "#F59E0B",
  "#C2410C",
  "#A855F7",
  "#10B981",
  "#3B82F6",
  "#FACC15",
  "#EF4444",
  "#06B6D4",
  "#84CC16",
];

export function Donut({
  data,
  size = 200,
}: {
  data: Array<{ name: string; value: number }>;
  size?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={size}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="62%"
          outerRadius="92%"
          stroke="rgba(0,0,0,0.5)"
          paddingAngle={1.5}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(20,8,16,0.95)",
            border: "1px solid rgba(255,61,160,0.3)",
            borderRadius: 10,
            fontSize: 12,
          }}
          formatter={(v: number, _name: string, entry: { payload: { name: string } }) => {
            const total = data.reduce((a, b) => a + b.value, 0);
            return [
              `${formatUsd(v, { compact: true })} · ${formatPct((v / total) * 100)}`,
              entry.payload.name,
            ];
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export const DONUT_COLORS = COLORS;
