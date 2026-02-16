import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchStockData, fetchLatestPrice } from "@/lib/stock-data/fetcher";
import { calculate200WSMA } from "@/lib/signals/sma";
import { calculateRollingSlope, hasNeverHadNegativeSlope } from "@/lib/signals/slope";
import { evaluateBuySignal } from "@/lib/signals/buy-signal";
import { evaluateSellSignal } from "@/lib/signals/sell-signal";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const ticker = body.ticker?.toUpperCase();

  if (!ticker) {
    return NextResponse.json({ error: "Ticker required" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    // Fetch historical weekly data
    const weeklyData = await fetchStockData(ticker);

    // Get or create stock record
    const { data: stock } = await admin
      .from("stocks")
      .select("id")
      .eq("ticker", ticker)
      .single();

    if (!stock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    // Insert weekly prices (upsert to handle re-runs)
    const priceRows = weeklyData.map((w) => ({
      stock_id: stock.id,
      week_ending: w.weekEnding,
      open_price: w.open,
      high_price: w.high,
      low_price: w.low,
      close_price: w.close,
      volume: w.volume,
    }));

    // Insert in batches of 500
    for (let i = 0; i < priceRows.length; i += 500) {
      const batch = priceRows.slice(i, i + 500);
      await admin
        .from("weekly_prices")
        .upsert(batch, { onConflict: "stock_id,week_ending" });
    }

    // Calculate signals
    const closePrices = weeklyData.map((w) => ({
      weekEnding: w.weekEnding,
      closePrice: w.close,
    }));

    const smaResults = calculate200WSMA(closePrices);
    const slopes = calculateRollingSlope(smaResults);

    // Get current price
    const latestQuote = await fetchLatestPrice(ticker);
    const currentPrice = latestQuote?.price ?? weeklyData[weeklyData.length - 1]?.close ?? 0;
    const companyName = latestQuote?.name ?? ticker;

    // Evaluate signals
    const buyEval = evaluateBuySignal(currentPrice, smaResults, slopes);
    const sellEval = evaluateSellSignal(currentPrice, smaResults);

    const slopeNeverNegative = !hasNeverHadNegativeSlope(slopes);

    // Update stock record
    await admin
      .from("stocks")
      .update({
        company_name: companyName,
        current_price: currentPrice,
        sma_200w: buyEval.sma200w || null,
        price_vs_sma_pct: buyEval.percentDistance,
        sma_slope_ever_negative: slopeNeverNegative,
        last_data_fetch: new Date().toISOString(),
      })
      .eq("id", stock.id);

    // Determine signal type
    let signalType = "NEUTRAL";
    if (buyEval.meetsAllCriteria) signalType = "BUY";
    else if (sellEval.isSixtyPercentAbove) signalType = "SELL_HIGH";
    else if (sellEval.isFivePercentBelow) signalType = "SELL_LOW";

    // Deactivate old signals
    await admin
      .from("stock_signals")
      .update({ is_active: false, resolved_at: new Date().toISOString() })
      .eq("stock_id", stock.id)
      .eq("is_active", true);

    // Insert new signal
    await admin.from("stock_signals").insert({
      stock_id: stock.id,
      signal_type: signalType,
      is_active: true,
      metadata: {
        price: currentPrice,
        sma: buyEval.sma200w,
        pct_distance: buyEval.percentDistance,
      },
    });

    // Update SMA values in weekly_prices
    for (const sma of smaResults) {
      await admin
        .from("weekly_prices")
        .update({ sma_200w_at_week: sma.smaValue })
        .eq("stock_id", stock.id)
        .eq("week_ending", sma.weekEnding);
    }

    return NextResponse.json({
      success: true,
      ticker,
      signal: signalType,
      weeksLoaded: weeklyData.length,
    });
  } catch (error) {
    console.error(`Backfill failed for ${ticker}:`, error);
    return NextResponse.json(
      { error: `Backfill failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
