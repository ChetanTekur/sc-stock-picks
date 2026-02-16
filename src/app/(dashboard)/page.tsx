import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";
import type { StockDisplay, DashboardSummary } from "@/types/stock";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch user's tracked tickers with stock data and signals
  const { data: userTickers } = await supabase
    .from("user_tickers")
    .select(`
      id,
      is_owned,
      stock_id,
      stocks (
        id,
        ticker,
        company_name,
        current_price,
        sma_200w,
        price_vs_sma_pct,
        sma_slope_ever_negative,
        last_data_fetch
      )
    `)
    .eq("user_id", user.id);

  // Fetch active signals for all stocks
  const { data: signals } = await supabase
    .from("stock_signals")
    .select("*")
    .eq("is_active", true);

  const signalMap = new Map(
    (signals ?? []).map((s) => [s.stock_id, s])
  );

  const stocks: StockDisplay[] = (userTickers ?? [])
    .filter((ut) => ut.stocks)
    .map((ut) => {
      const s = ut.stocks as any;
      const signal = signalMap.get(s.id);
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
        status: signal?.signal_type ?? "NEUTRAL",
        isOwned: ut.is_owned,
        lastUpdated: s.last_data_fetch ?? "",
      };
    });

  const summary: DashboardSummary = {
    totalTracked: stocks.length,
    buyCount: stocks.filter((s) => s.status === "BUY").length,
    sellCount: stocks.filter((s) => s.status === "SELL_HIGH" || s.status === "SELL_LOW").length,
    neutralCount: stocks.filter((s) => s.status === "NEUTRAL").length,
  };

  return <DashboardClient stocks={stocks} summary={summary} />;
}
