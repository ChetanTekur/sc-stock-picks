import { createServerSupabaseClient } from "@/lib/supabase/server";
import { StockTable } from "@/components/stocks/stock-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TrendingDown, AlertTriangle } from "lucide-react";
import type { StockDisplay } from "@/types/stock";

export default async function SellWatchlistPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userTickers } = await supabase
    .from("user_tickers")
    .select(`id, is_owned, stocks (id, ticker, company_name, current_price, sma_200w, price_vs_sma_pct, sma_slope_ever_negative, last_data_fetch)`)
    .eq("user_id", user.id)
    .eq("is_owned", true);

  const { data: signals } = await supabase
    .from("stock_signals")
    .select("*")
    .eq("is_active", true)
    .in("signal_type", ["SELL_HIGH", "SELL_LOW"]);

  const signalMap = new Map((signals ?? []).map((s) => [s.stock_id, s]));

  const stocks: StockDisplay[] = (userTickers ?? [])
    .filter((ut) => ut.stocks && signalMap.has((ut.stocks as any).id))
    .map((ut) => {
      const s = ut.stocks as any;
      const signal = signalMap.get(s.id)!;
      const hasSMA = s.sma_200w !== null && s.sma_200w !== undefined && Number(s.sma_200w) > 0;
      return {
        id: s.id,
        userTickerId: ut.id,
        ticker: s.ticker,
        companyName: s.company_name ?? s.ticker,
        currentPrice: s.current_price ?? 0,
        sma200w: hasSMA ? Number(s.sma_200w) : null,
        percentDistance: hasSMA ? Number(s.price_vs_sma_pct) : null,
        smaSlope: s.sma_slope_ever_negative ? "down" : "up",
        status: signal.signal_type,
        isOwned: true,
        lastUpdated: s.last_data_fetch ?? "",
      };
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingDown className="h-6 w-6 text-stock-sell" />
        <h2 className="text-2xl font-semibold">Sell Watchlist</h2>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Sell Warning</AlertTitle>
        <AlertDescription>
          These owned stocks show sell signals: either 60%+ above their 200W SMA or 5%+ below it.
        </AlertDescription>
      </Alert>

      {stocks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No sell signals</p>
          <p className="text-sm">None of your owned stocks currently show sell signals.</p>
        </div>
      ) : (
        <StockTable stocks={stocks} />
      )}
    </div>
  );
}
