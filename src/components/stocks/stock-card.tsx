"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StockStatusBadge } from "./stock-status-badge";
import { SlopeIndicator } from "./slope-indicator";
import { PriceDisplay } from "./price-display";
import { PercentDistance } from "./percent-distance";
import type { StockDisplay } from "@/types/stock";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

interface StockCardProps {
  stock: StockDisplay;
  onRemove?: (userTickerId: string, ticker: string) => Promise<void>;
}

export function StockCard({ stock, onRemove }: StockCardProps) {
  const hasSMA = stock.sma200w !== null && stock.sma200w !== undefined && stock.sma200w !== 0;

  return (
    <Card
      className={cn(
        "relative",
        stock.status === "BUY" && "border-l-4 border-l-stock-buy",
        (stock.status === "SELL_HIGH" || stock.status === "SELL_LOW") &&
          "border-l-4 border-l-stock-sell"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-mono">{stock.ticker}</CardTitle>
          <CardDescription className="text-xs">{stock.companyName}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <StockStatusBadge status={stock.status} />
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(stock.userTickerId, stock.ticker)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground text-xs">Price</span>
          <div><PriceDisplay value={stock.currentPrice} /></div>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">200W SMA</span>
          <div>
            {hasSMA ? (
              <PriceDisplay value={stock.sma200w!} />
            ) : (
              <span className="font-mono text-muted-foreground">N/A</span>
            )}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">% Distance</span>
          <div>
            {hasSMA && stock.percentDistance !== null ? (
              <PercentDistance value={stock.percentDistance} />
            ) : (
              <span className="font-mono text-muted-foreground">—</span>
            )}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Slope</span>
          <SlopeIndicator direction={stock.smaSlope} />
        </div>
      </CardContent>
    </Card>
  );
}
