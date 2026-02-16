import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StockStatusBadge } from "./stock-status-badge";
import { SlopeIndicator } from "./slope-indicator";
import { PriceDisplay } from "./price-display";
import { PercentDistance } from "./percent-distance";
import type { StockDisplay } from "@/types/stock";
import { cn } from "@/lib/utils";

export function StockCard({ stock }: { stock: StockDisplay }) {
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
        <StockStatusBadge status={stock.status} />
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground text-xs">Price</span>
          <div><PriceDisplay value={stock.currentPrice} /></div>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">200W SMA</span>
          <div><PriceDisplay value={stock.sma200w} /></div>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">% Distance</span>
          <div><PercentDistance value={stock.percentDistance} /></div>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Slope</span>
          <SlopeIndicator direction={stock.smaSlope} />
        </div>
      </CardContent>
    </Card>
  );
}
