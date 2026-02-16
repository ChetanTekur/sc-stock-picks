"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ChartDataPoint } from "@/types/stock";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StockChartProps {
  data: ChartDataPoint[];
  ticker: string;
}

function formatChartDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { year: "2-digit", month: "short" });
}

function formatChartPrice(value: number) {
  return `$${value.toFixed(0)}`;
}

export function StockChart({ data, ticker }: StockChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            No price data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasSMA = data.some((d) => d.sma200w !== null && d.sma200w !== undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {hasSMA ? `Price vs SMA - ${ticker}` : `Price History - ${ticker}`}
        </CardTitle>
        {!hasSMA && (
          <CardDescription>
            Not enough trading history to calculate a moving average (need at least 20 weeks).
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <XAxis
                dataKey="date"
                tickFormatter={formatChartDate}
                tick={{ fontSize: 12, fill: "#888" }}
                interval="preserveStartEnd"
                minTickGap={60}
              />
              <YAxis
                tickFormatter={formatChartPrice}
                tick={{ fontSize: 12, fill: "#888" }}
                width={60}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--card-foreground))",
                }}
                labelFormatter={(label) =>
                  new Date(label).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                }
                formatter={(value: number, name: string) => [
                  `$${value.toFixed(2)}`,
                  name,
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="price"
                name="Price"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              {hasSMA && (
                <Line
                  type="monotone"
                  dataKey="sma200w"
                  name="SMA"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  strokeDasharray="5 5"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
