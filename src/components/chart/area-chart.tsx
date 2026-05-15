"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatUsd } from "@/lib/format";

export function MagentaAreaChart({
  data,
  dataKey = "value",
  xKey = "label",
  height = 240,
  yFormatter = (v: number) => formatUsd(v, { compact: true }),
}: {
  data: Array<Record<string, unknown>>;
  dataKey?: string;
  xKey?: string;
  height?: number;
  yFormatter?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="magentaArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF3DA0" stopOpacity={0.45} />
            <stop offset="60%" stopColor="#FF3DA0" stopOpacity={0.1} />
            <stop offset="100%" stopColor="#FF3DA0" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
          axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => yFormatter(v)}
          width={56}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(20,8,16,0.95)",
            border: "1px solid rgba(255,61,160,0.3)",
            borderRadius: 10,
            backdropFilter: "blur(8px)",
            padding: "8px 10px",
            fontSize: 12,
          }}
          labelStyle={{ color: "rgba(255,255,255,0.6)", fontSize: 10, marginBottom: 4 }}
          formatter={(v: number) => [yFormatter(v), "Value"]}
          cursor={{ stroke: "rgba(255,61,160,0.3)", strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke="#FF3DA0"
          strokeWidth={2}
          fill="url(#magentaArea)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
