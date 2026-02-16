import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchLatestPrice } from "@/lib/stock-data/fetcher";
import { calculateFlexibleSMA } from "@/lib/signals/sma";
import { calculateRollingSlope, hasNeverHadNegativeSlope } from "@/lib/signals/slope";
import { evaluateBuySignal } from "@/lib/signals/buy-signal";
import { evaluateSellSignal } from "@/lib/signals/sell-signal";
import {
  processNotifications,
  processMarketSummary,
  type SignalWithStock,
  type StockSummaryItem,
  type NotifiableUser,
} from "@/lib/notifications";
import type { MarketTrigger } from "@/lib/notifications/email";
import type { SignalType } from "@/types/database";
import { cronAuthSchema } from "@/lib/validation/schemas";

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  // Validate authorization header via zod schema
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const parsed = cronAuthSchema.safeParse({ authorization: authHeader });
    if (parsed.success) return true;
  }

  // Fallback: check query param
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  return querySecret === secret;
}

/**
 * Determine the Monday (start) of the current ISO week.
 */
function getCurrentWeekEnding(): string {
  const now = new Date();
  const day = now.getDay();
  // Get the Friday of the current week (or next Friday if already past)
  const diff = day <= 5 ? 5 - day : 5 + (7 - day);
  const friday = new Date(now);
  friday.setDate(now.getDate() + diff);
  return friday.toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch (authError) {
    console.error("Cron auth verification failed:", authError);
    return NextResponse.json(
      { error: `Auth verification failed: ${authError instanceof Error ? authError.message : String(authError)}` },
      { status: 500 }
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (clientError) {
    console.error("Failed to create Supabase admin client:", clientError);
    return NextResponse.json(
      { error: `Admin client init failed: ${clientError instanceof Error ? clientError.message : String(clientError)}` },
      { status: 500 }
    );
  }

  // Read trigger type from query param (market_open or market_close)
  const url = new URL(request.url);
  const trigger = (url.searchParams.get("trigger") ?? "market_close") as MarketTrigger;

  const startTime = Date.now();

  const processed: string[] = [];
  const errors: { ticker: string; error: string }[] = [];
  const newSignals: SignalWithStock[] = [];
  const allStockSummaries: StockSummaryItem[] = [];

  try {
    // Step 1: Fetch all unique stock_ids from user_tickers
    const { data: userTickerRows, error: utError } = await admin
      .from("user_tickers")
      .select("stock_id");

    if (utError) {
      return NextResponse.json(
        { error: `Failed to fetch user tickers: ${utError.message}` },
        { status: 500 }
      );
    }

    const uniqueStockIds = [
      ...new Set(userTickerRows?.map((r) => r.stock_id) ?? []),
    ];

    if (uniqueStockIds.length === 0) {
      return NextResponse.json({
        message: "No stocks to process",
        processed: 0,
        errors: 0,
        duration: Date.now() - startTime,
      });
    }

    // Fetch stock details for all unique stock_ids
    const { data: stocks } = await admin
      .from("stocks")
      .select("id, ticker, company_name")
      .in("id", uniqueStockIds);

    if (!stocks || stocks.length === 0) {
      return NextResponse.json({
        message: "No stocks found",
        processed: 0,
        errors: 0,
        duration: Date.now() - startTime,
      });
    }

    // Step 2-8: Process each stock
    for (const stock of stocks) {
      try {
        // Step 2: Fetch latest price from Yahoo Finance
        const latestQuote = await fetchLatestPrice(stock.ticker);
        if (!latestQuote) {
          errors.push({
            ticker: stock.ticker,
            error: "Failed to fetch latest price",
          });
          continue;
        }

        const currentPrice = latestQuote.price;
        const companyName = latestQuote.name ?? stock.company_name ?? stock.ticker;
        const weekEnding = getCurrentWeekEnding();

        // Step 3: Insert new weekly_prices row if new week
        const { data: existingWeek } = await admin
          .from("weekly_prices")
          .select("id")
          .eq("stock_id", stock.id)
          .eq("week_ending", weekEnding)
          .single();

        if (!existingWeek) {
          await admin.from("weekly_prices").insert({
            stock_id: stock.id,
            week_ending: weekEnding,
            close_price: currentPrice,
            open_price: currentPrice,
            high_price: currentPrice,
            low_price: currentPrice,
            volume: 0,
          });
        } else {
          // Update the existing week's close price
          await admin
            .from("weekly_prices")
            .update({ close_price: currentPrice })
            .eq("id", existingWeek.id);
        }

        // Step 4: Recalculate 200W SMA from weekly_prices
        const { data: weeklyPrices } = await admin
          .from("weekly_prices")
          .select("week_ending, close_price")
          .eq("stock_id", stock.id)
          .order("week_ending", { ascending: true });

        if (!weeklyPrices || weeklyPrices.length === 0) {
          errors.push({
            ticker: stock.ticker,
            error: "No weekly price data available",
          });
          continue;
        }

        const closePrices = weeklyPrices.map((w) => ({
          weekEnding: w.week_ending,
          closePrice: w.close_price,
        }));

        const { results: smaResults } = calculateFlexibleSMA(closePrices);

        // Step 5: Recalculate 4-week rolling slope
        const slopes = calculateRollingSlope(smaResults);

        // Step 6: Evaluate buy/sell signals
        const buyEval = evaluateBuySignal(currentPrice, smaResults, slopes);
        const sellEval = evaluateSellSignal(currentPrice, smaResults);
        const slopeNeverNegative = hasNeverHadNegativeSlope(slopes);

        // Step 7: Update stocks table with new values
        await admin
          .from("stocks")
          .update({
            company_name: companyName,
            current_price: currentPrice,
            sma_200w: buyEval.sma200w || null,
            price_vs_sma_pct: buyEval.percentDistance,
            sma_slope_ever_negative: !slopeNeverNegative,
            last_data_fetch: new Date().toISOString(),
          })
          .eq("id", stock.id);

        // Determine signal type
        let signalType: SignalType = "NEUTRAL";
        if (buyEval.meetsAllCriteria) signalType = "BUY";
        else if (sellEval.isSixtyPercentAbove) signalType = "SELL_HIGH";
        else if (sellEval.isFivePercentBelow) signalType = "SELL_LOW";

        // Step 8: Update stock_signals (deactivate old, create new if changed)
        // Check current active signal
        const { data: currentActiveSignal } = await admin
          .from("stock_signals")
          .select("id, signal_type")
          .eq("stock_id", stock.id)
          .eq("is_active", true)
          .single();

        let signalChanged = false;
        let newSignalId: string | undefined;

        if (
          !currentActiveSignal ||
          currentActiveSignal.signal_type !== signalType
        ) {
          signalChanged = true;

          // Deactivate old signals
          if (currentActiveSignal) {
            await admin
              .from("stock_signals")
              .update({
                is_active: false,
                resolved_at: new Date().toISOString(),
              })
              .eq("stock_id", stock.id)
              .eq("is_active", true);
          }

          // Create new signal
          const { data: insertedSignal } = await admin
            .from("stock_signals")
            .insert({
              stock_id: stock.id,
              signal_type: signalType,
              is_active: true,
              metadata: {
                price: currentPrice,
                sma: buyEval.sma200w,
                pct_distance: buyEval.percentDistance,
              },
            })
            .select("id")
            .single();

          newSignalId = insertedSignal?.id;
        }

        // Update SMA values in weekly_prices for the most recent entries
        const recentSmaResults = smaResults.slice(-10);
        for (const sma of recentSmaResults) {
          await admin
            .from("weekly_prices")
            .update({ sma_200w_at_week: sma.smaValue })
            .eq("stock_id", stock.id)
            .eq("week_ending", sma.weekEnding);
        }

        processed.push(stock.ticker);

        // Collect ALL stock summaries for market summary email
        allStockSummaries.push({
          stockId: stock.id,
          ticker: stock.ticker,
          companyName: companyName,
          signalType,
          currentPrice,
          sma200w: buyEval.sma200w,
          percentDistance: buyEval.percentDistance,
        });

        // Collect new/changed signals for notifications
        if (signalChanged && newSignalId) {
          newSignals.push({
            signalId: newSignalId,
            stockId: stock.id,
            ticker: stock.ticker,
            companyName: companyName,
            signalType,
            currentPrice,
            sma200w: buyEval.sma200w,
            percentDistance: buyEval.percentDistance,
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to process ${stock.ticker}:`, errorMessage);
        errors.push({ ticker: stock.ticker, error: errorMessage });
        // Continue processing other stocks
      }
    }

    // Step 9-11: Notifications — always send market summary to all users
    let notificationResults: Awaited<ReturnType<typeof processNotifications>> = [];
    let summaryResults: Awaited<ReturnType<typeof processMarketSummary>> = [];

    try {
      // Find ALL users with notifications enabled
      const { data: preferencesData } = await admin
        .from("user_preferences")
        .select("*")
        .eq("email_notifications_enabled", true);

      if (preferencesData && preferencesData.length > 0) {
        // Get user emails from auth
        const userIds = preferencesData.map((p) => p.user_id);
        const { data: authUsers } = await admin.auth.admin.listUsers();

        const authUserMap = new Map(
          authUsers?.users
            ?.filter((u) => userIds.includes(u.id))
            .map((u) => [u.id, u.email]) ?? []
        );

        // Get tracked stock IDs per user
        const { data: allUserTickers } = await admin
          .from("user_tickers")
          .select("user_id, stock_id")
          .in("user_id", userIds);

        const userTickerMap = new Map<string, string[]>();
        for (const ut of allUserTickers ?? []) {
          const existing = userTickerMap.get(ut.user_id) ?? [];
          existing.push(ut.stock_id);
          userTickerMap.set(ut.user_id, existing);
        }

        const notifiableUsers: NotifiableUser[] = preferencesData
          .filter((p) => authUserMap.has(p.user_id))
          .map((p) => ({
            userId: p.user_id,
            email: authUserMap.get(p.user_id)!,
            notificationEmail: p.notification_email,
            emailNotificationsEnabled: p.email_notifications_enabled,
            dailyDigestEnabled: p.daily_digest_enabled,
            trackedStockIds: userTickerMap.get(p.user_id) ?? [],
          }));

        // Send individual buy/sell alerts for changed signals (deduped)
        if (newSignals.length > 0) {
          notificationResults = await processNotifications(
            newSignals,
            notifiableUsers
          );
        }

        // Always send market summary email (market open or market close)
        if (allStockSummaries.length > 0) {
          summaryResults = await processMarketSummary(
            allStockSummaries,
            newSignals,
            notifiableUsers,
            trigger
          );
        }
      }
    } catch (error) {
      console.error("Notification processing failed:", error);
      errors.push({
        ticker: "NOTIFICATIONS",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    const allResults = [...notificationResults, ...summaryResults];
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      trigger,
      summary: {
        processed: processed.length,
        errors: errors.length,
        signalChanges: newSignals.length,
        notificationsSent: allResults.filter((r) => r.success).length,
        notificationsFailed: allResults.filter((r) => !r.success).length,
        marketSummariesSent: summaryResults.filter((r) => r.success).length,
        duration,
      },
      processed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Daily cron job failed:", error);
    return NextResponse.json(
      {
        error: `Daily job failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        processed,
        errors,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
