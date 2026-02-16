"use client";

import Link from "next/link";
import { StockStatusBadge } from "./stock-status-badge";
import { SlopeIndicator } from "./slope-indicator";
import { PriceDisplay } from "./price-display";
import { PercentDistance } from "./percent-distance";
import type { StockDisplay } from "@/types/stock";
import { cn } from "@/lib/utils";

interface StockTableProps {
  stocks: StockDisplay[];
}

export function StockTable({ stocks }: StockTableProps) {
  if (stocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-lg">No stocks tracked yet</p>
        <p className="text-sm">Add your first stock to get started</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium">Ticker</th>
            <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Company</th>
            <th className="px-4 py-3 text-right font-medium">Price</th>
            <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">200W SMA</th>
            <th className="px-4 py-3 text-right font-medium">% Dist</th>
            <th className="px-4 py-3 text-center font-medium hidden sm:table-cell">Slope</th>
            <th className="px-4 py-3 text-center font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => (
            <tr
              key={stock.id}
              className={cn(
                "border-b transition-colors hover:bg-muted/30",
                stock.status === "BUY" && "border-l-4 border-l-stock-buy",
                (stock.status === "SELL_HIGH" || stock.status === "SELL_LOW") &&
                  "border-l-4 border-l-stock-sell"
              )}
            >
              <td className="px-4 py-3">
                <Link
                  href={`/stock/${stock.ticker}`}
                  className="font-mono font-semibold hover:underline"
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
                <PriceDisplay value={stock.sma200w} />
              </td>
              <td className="px-4 py-3 text-right">
                <PercentDistance value={stock.percentDistance} />
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
