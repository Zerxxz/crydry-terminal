"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { formatUsd } from "@/lib/format";

export function FlowBar({
  data,
  height = 240,
}: {
  data: Array<{ label: string; inflow: number; outflow: number }>;
  height?: number;
}) {
  const merged = data.map((d) => ({
    label: d.label,
    inflow: d.inflow,
    outflow: -d.outflow,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={merged} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} stackOffset="sign">
        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} tickLine={false} />
        <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatUsd(v, { compact: true })} width={56} />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(20,8,16,0.95)",
            border: "1px solid rgba(255,61,160,0.3)",
            borderRadius: 10,
            fontSize: 12,
          }}
          formatter={(v: number, name: string) => [formatUsd(Math.abs(v), { compact: true }), name === "inflow" ? "Inflow" : "Outflow"]}
          cursor={{ fill: "rgba(255,61,160,0.06)" }}
        />
        <Bar dataKey="inflow" radius={[4, 4, 0, 0]} stackId="flow">
          {merged.map((_, i) => (<Cell key={i} fill="#10b981" />))}
        </Bar>
        <Bar dataKey="outflow" radius={[0, 0, 4, 4]} stackId="flow">
          {merged.map((_, i) => (<Cell key={i} fill="#FF3DA0" />))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
