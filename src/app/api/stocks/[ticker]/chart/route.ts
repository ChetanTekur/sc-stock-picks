import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ChartDataPoint } from "@/types/stock";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const supabase = await createServerSupabaseClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the stock record
  const { data: stock } = await supabase
    .from("stocks")
    .select("id")
    .eq("ticker", ticker.toUpperCase())
    .single();

  if (!stock) {
    return NextResponse.json({ error: "Stock not found" }, { status: 404 });
  }

  // Fetch weekly prices with SMA
  const { data: weeklyPrices } = await supabase
    .from("weekly_prices")
    .select("week_ending, close_price, sma_200w_at_week")
    .eq("stock_id", stock.id)
    .order("week_ending", { ascending: true });

  const chartData: ChartDataPoint[] = (weeklyPrices ?? []).map((wp) => ({
    date: wp.week_ending,
    price: wp.close_price,
    sma200w: wp.sma_200w_at_week,
  }));

  return NextResponse.json({ data: chartData });
}
