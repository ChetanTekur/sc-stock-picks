import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { StockChart } from "@/components/stocks/stock-chart";
import { StockStatusBadge } from "@/components/stocks/stock-status-badge";
import { SlopeIndicator } from "@/components/stocks/slope-indicator";
import { PriceDisplay } from "@/components/stocks/price-display";
import { PercentDistance } from "@/components/stocks/percent-distance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPrice } from "@/lib/utils";
import type { ChartDataPoint } from "@/types/stock";
import type { SignalType } from "@/types/database";
import { ArrowLeft } from "lucide-react";

interface StockDetailPageProps {
  params: Promise<{ ticker: string }>;
}

export default async function StockDetailPage({ params }: StockDetailPageProps) {
  const { ticker } = await params;
  const supabase = await createServerSupabaseClient();

  // Fetch stock data
  const { data: stock } = await supabase
    .from("stocks")
    .select("*")
    .eq("ticker", ticker.toUpperCase())
    .single();

  if (!stock) {
    notFound();
  }

  // Fetch weekly prices for chart
  const { data: weeklyPrices } = await supabase
    .from("weekly_prices")
    .select("week_ending, close_price, sma_200w_at_week")
    .eq("stock_id", stock.id)
    .order("week_ending", { ascending: true });

  // Fetch signal history
  const { data: signals } = await supabase
    .from("stock_signals")
    .select("*")
    .eq("stock_id", stock.id)
    .order("triggered_at", { ascending: false });

  // Fetch active signal
  const activeSignal = (signals ?? []).find((s) => s.is_active);
  const currentStatus: SignalType = activeSignal?.signal_type ?? "NEUTRAL";

  // Prepare chart data
  const chartData: ChartDataPoint[] = (weeklyPrices ?? []).map((wp) => ({
    date: wp.week_ending,
    price: wp.close_price,
    sma200w: wp.sma_200w_at_week,
  }));

  // Prepare signal history
  const signalHistory = (signals ?? []).map((s) => ({
    type: s.signal_type as SignalType,
    triggeredAt: s.triggered_at,
    resolvedAt: s.resolved_at,
    isActive: s.is_active,
  }));

  const slopeDirection: "up" | "down" = stock.sma_slope_ever_negative ? "down" : "up";

  return (
    <div className="space-y-6">
      {/* Back link and header */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold font-mono">{stock.ticker}</h2>
            <StockStatusBadge status={currentStatus} />
          </div>
          <p className="text-muted-foreground">
            {stock.company_name ?? stock.ticker}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold font-mono tabular-nums">
            {stock.current_price ? formatPrice(stock.current_price) : "N/A"}
          </p>
          {stock.last_data_fetch && (
            <p className="text-xs text-muted-foreground">
              Updated {formatDate(stock.last_data_fetch)}
            </p>
          )}
        </div>
      </div>

      {/* Key metrics cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>200W SMA</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {stock.sma_200w ? formatPrice(stock.sma_200w) : "N/A"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>% Distance from SMA</CardDescription>
            <CardTitle className="text-2xl">
              {stock.price_vs_sma_pct !== null ? (
                <PercentDistance value={stock.price_vs_sma_pct} />
              ) : (
                "N/A"
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Slope Direction</CardDescription>
            <CardTitle className="text-2xl">
              <SlopeIndicator direction={slopeDirection} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Signal Status</CardDescription>
            <CardTitle className="text-2xl">
              <StockStatusBadge status={currentStatus} />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Price chart */}
      <StockChart data={chartData} ticker={stock.ticker} />

      {/* Signal history table */}
      <Card>
        <CardHeader>
          <CardTitle>Signal History</CardTitle>
          <CardDescription>
            Historical buy and sell signals for {stock.ticker}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {signalHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No signal history available
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Signal</th>
                    <th className="px-4 py-3 text-left font-medium">Triggered</th>
                    <th className="px-4 py-3 text-left font-medium">Resolved</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {signalHistory.map((signal, idx) => (
                    <tr key={idx} className="border-b transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <StockStatusBadge status={signal.type} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(signal.triggeredAt)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {signal.resolvedAt ? formatDate(signal.resolvedAt) : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {signal.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Resolved</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
