"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface TrackedStock {
  tickerId: string;
  ticker: string;
  companyName: string;
  isOwned: boolean;
}

interface OwnedStocksManagerProps {
  stocks: TrackedStock[];
}

export function OwnedStocksManager({ stocks: initialStocks }: OwnedStocksManagerProps) {
  const [stocks, setStocks] = useState(initialStocks);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  async function handleToggleOwned(tickerId: string, newValue: boolean) {
    setLoadingIds((prev) => new Set(prev).add(tickerId));

    try {
      const res = await fetch(`/api/tickers/${tickerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_owned: newValue }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update stock");
      }

      setStocks((prev) =>
        prev.map((s) => (s.tickerId === tickerId ? { ...s, isOwned: newValue } : s))
      );

      const stock = stocks.find((s) => s.tickerId === tickerId);
      toast.success(
        `${stock?.ticker} marked as ${newValue ? "owned" : "not owned"}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update stock");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(tickerId);
        return next;
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Owned Stocks</CardTitle>
        <CardDescription>
          Toggle which stocks you currently own. This helps tailor sell signal notifications.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stocks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No tracked stocks. Add stocks from the dashboard to manage ownership.
          </div>
        ) : (
          <div className="space-y-4">
            {stocks.map((stock) => (
              <div
                key={stock.tickerId}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="space-y-0.5">
                  <p className="font-mono font-semibold">{stock.ticker}</p>
                  <p className="text-sm text-muted-foreground">{stock.companyName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {stock.isOwned ? "Owned" : "Not owned"}
                  </span>
                  <Switch
                    checked={stock.isOwned}
                    onCheckedChange={(checked) => handleToggleOwned(stock.tickerId, checked)}
                    disabled={loadingIds.has(stock.tickerId)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
