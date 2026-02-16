"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ChartDataPoint } from "@/types/stock";

interface StockMiniChartProps {
  data: ChartDataPoint[];
  ticker: string;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { year: "2-digit", month: "short" });
}

function formatPrice(value: number) {
  return `$${value.toFixed(0)}`;
}

export function StockMiniChart({ data, ticker }: StockMiniChartProps) {
  const hasSMA = data.some((d) => d.sma200w !== null && d.sma200w !== undefined);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        No price data available for {ticker}
      </div>
    );
  }

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 10, fill: "#888" }}
            interval="preserveStartEnd"
            minTickGap={80}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatPrice}
            tick={{ fontSize: 10, fill: "#888" }}
            width={50}
            domain={["auto", "auto"]}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              color: "hsl(var(--card-foreground))",
              fontSize: "12px",
            }}
            labelFormatter={(label) =>
              new Date(label).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            }
            formatter={(value: number, name: string) => [
              `$${value.toFixed(2)}`,
              name,
            ]}
          />
          <Line
            type="monotone"
            dataKey="price"
            name="Price"
            stroke="#3b82f6"
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
          {hasSMA && (
            <Line
              type="monotone"
              dataKey="sma200w"
              name="200W SMA"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
              connectNulls
              strokeDasharray="4 4"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      {!hasSMA && (
        <p className="text-xs text-muted-foreground text-center -mt-2">
          200W SMA not available — needs ~4 years of trading history
        </p>
      )}
    </div>
  );
}
