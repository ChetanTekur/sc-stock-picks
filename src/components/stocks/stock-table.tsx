"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, Trash2, Loader2 } from "lucide-react";
import { StockStatusBadge } from "./stock-status-badge";
import { SlopeIndicator } from "./slope-indicator";
import { PriceDisplay } from "./price-display";
import { PercentDistance } from "./percent-distance";
import { StockMiniChart } from "./stock-mini-chart";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StockDisplay } from "@/types/stock";
import type { ChartDataPoint } from "@/types/stock";
import { cn } from "@/lib/utils";

interface StockTableProps {
  stocks: StockDisplay[];
  onRemove?: (userTickerId: string, ticker: string) => Promise<void>;
}

export function StockTable({ stocks, onRemove }: StockTableProps) {
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [chartCache, setChartCache] = useState<Record<string, ChartDataPoint[]>>({});
  const [loadingChart, setLoadingChart] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{
    userTickerId: string;
    ticker: string;
  } | null>(null);
  const [removing, setRemoving] = useState(false);

  async function handleExpand(ticker: string) {
    if (expandedTicker === ticker) {
      setExpandedTicker(null);
      return;
    }

    setExpandedTicker(ticker);

    // Fetch chart data if not cached
    if (!chartCache[ticker]) {
      setLoadingChart(ticker);
      try {
        const res = await fetch(`/api/stocks/${ticker}/chart`);
        if (res.ok) {
          const { data } = await res.json();
          setChartCache((prev) => ({ ...prev, [ticker]: data }));
        }
      } catch (err) {
        console.error(`Failed to load chart for ${ticker}:`, err);
      } finally {
        setLoadingChart(null);
      }
    }
  }

  async function handleRemove() {
    if (!confirmRemove || !onRemove) return;
    setRemoving(true);
    try {
      await onRemove(confirmRemove.userTickerId, confirmRemove.ticker);
    } finally {
      setRemoving(false);
      setConfirmRemove(null);
    }
  }

  if (stocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-lg">No stocks tracked yet</p>
        <p className="text-sm">Add your first stock to get started</p>
      </div>
    );
  }

  const colCount = onRemove ? 8 : 7;

  return (
    <>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-2 py-3 w-8"></th>
              <th className="px-4 py-3 text-left font-medium">Ticker</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">
                Company
              </th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">
                200W SMA
              </th>
              <th className="px-4 py-3 text-right font-medium">% Dist</th>
              <th className="px-4 py-3 text-center font-medium hidden sm:table-cell">
                Slope
              </th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              {onRemove && (
                <th className="px-2 py-3 w-10"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => {
              const isExpanded = expandedTicker === stock.ticker;
              const hasSMA = stock.sma200w !== null && stock.sma200w !== undefined && stock.sma200w !== 0;

              return (
                <Fragment key={stock.id}>
                  <tr
                    className={cn(
                      "border-b transition-colors hover:bg-muted/30 cursor-pointer",
                      stock.status === "BUY" && "border-l-4 border-l-stock-buy",
                      (stock.status === "SELL_HIGH" ||
                        stock.status === "SELL_LOW") &&
                        "border-l-4 border-l-stock-sell",
                      isExpanded && "bg-muted/20"
                    )}
                    onClick={() => handleExpand(stock.ticker)}
                  >
                    <td className="px-2 py-3 text-muted-foreground">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/stock/${stock.ticker}`}
                        className="font-mono font-semibold hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {stock.ticker}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                      {stock.companyName}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PriceDisplay value={stock.currentPrice} />
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      {hasSMA ? (
                        <PriceDisplay value={stock.sma200w!} />
                      ) : (
                        <span className="font-mono text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {hasSMA && stock.percentDistance !== null ? (
                        <PercentDistance value={stock.percentDistance} />
                      ) : (
                        <span className="font-mono text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex justify-center">
                        <SlopeIndicator direction={stock.smaSlope} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <StockStatusBadge status={stock.status} />
                      </div>
                    </td>
                    {onRemove && (
                      <td className="px-2 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmRemove({
                              userTickerId: stock.userTickerId,
                              ticker: stock.ticker,
                            });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                  {isExpanded && (
                    <tr className="border-b bg-muted/10">
                      <td colSpan={colCount} className="px-4 py-4">
                        {loadingChart === stock.ticker ? (
                          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            Loading chart...
                          </div>
                        ) : chartCache[stock.ticker] ? (
                          <StockMiniChart
                            data={chartCache[stock.ticker]}
                            ticker={stock.ticker}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                            Failed to load chart data
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Remove confirmation dialog */}
      <Dialog
        open={confirmRemove !== null}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Stock</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-mono font-semibold">
                {confirmRemove?.ticker}
              </span>{" "}
              from your watchlist? This will stop tracking this stock.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmRemove(null)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
