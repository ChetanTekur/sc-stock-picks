import { BUY_ABOVE_SMA_MAX_PCT } from "@/lib/utils/constants";
import type { BuySignalEvaluation } from "@/types/signal";
import type { SMAResult, SlopeResult } from "@/types/signal";
import { getCurrentSMA } from "./sma";
import { hasNeverHadNegativeSlope } from "./slope";

/**
 * Evaluate BUY signal criteria for a stock.
 *
 * BUY when ALL three are true:
 * 1. Current price > 200W SMA (price is above SMA)
 * 2. 200W SMA 4-week rolling slope has never been negative in past 7 years
 * 3. Current price is within 5% above the 200W SMA (price <= SMA * 1.05)
 */
export function evaluateBuySignal(
  currentPrice: number,
  smaResults: SMAResult[],
  slopes: SlopeResult[]
): BuySignalEvaluation {
  const sma200w = getCurrentSMA(smaResults);

  if (sma200w === null || sma200w === 0) {
    return {
      meetsAllCriteria: false,
      priceAboveSMA: false,
      slopeNeverNegative: false,
      withinFivePercent: false,
      currentPrice,
      sma200w: 0,
      percentDistance: 0,
    };
  }

  const percentDistance = ((currentPrice - sma200w) / sma200w) * 100;
  const priceAboveSMA = currentPrice > sma200w;
  const slopeNeverNegative = hasNeverHadNegativeSlope(slopes);
  const withinFivePercent = priceAboveSMA && percentDistance <= BUY_ABOVE_SMA_MAX_PCT;

  return {
    meetsAllCriteria: priceAboveSMA && slopeNeverNegative && withinFivePercent,
    priceAboveSMA,
    slopeNeverNegative,
    withinFivePercent,
    currentPrice,
    sma200w,
    percentDistance,
  };
}
