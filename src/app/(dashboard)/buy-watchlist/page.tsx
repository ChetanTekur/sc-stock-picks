import { createServerSupabaseClient } from "@/lib/supabase/server";
import { StockTable } from "@/components/stocks/stock-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TrendingUp, Info } from "lucide-react";
import type { StockDisplay } from "@/types/stock";

export default async function BuyWatchlistPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userTickers } = await supabase
    .from("user_tickers")
    .select(`id, is_owned, stocks (id, ticker, company_name, current_price, sma_200w, price_vs_sma_pct, sma_slope_ever_negative, last_data_fetch)`)
    .eq("user_id", user.id);

  const { data: signals } = await supabase
    .from("stock_signals")
    .select("*")
    .eq("is_active", true)
    .eq("signal_type", "BUY");

  const buyStockIds = new Set((signals ?? []).map((s) => s.stock_id));

  const stocks: StockDisplay[] = (userTickers ?? [])
    .filter((ut) => ut.stocks && buyStockIds.has((ut.stocks as any).id))
    .map((ut) => {
      const s = ut.stocks as any;
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
        status: "BUY" as const,
        isOwned: ut.is_owned,
        lastUpdated: s.last_data_fetch ?? "",
      };
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-stock-buy" />
        <h2 className="text-2xl font-semibold">Buy Watchlist</h2>
      </div>

      <Alert variant="success">
        <Info className="h-4 w-4" />
        <AlertTitle>Buy Criteria</AlertTitle>
        <AlertDescription>
          Stocks meeting all 3 criteria: price above 200W SMA, SMA slope never negative in 7 years, and price within 5% of SMA.
        </AlertDescription>
      </Alert>

      <StockTable stocks={stocks} />
    </div>
  );
}
