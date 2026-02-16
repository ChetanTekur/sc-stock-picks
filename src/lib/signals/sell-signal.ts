import { SELL_ABOVE_SMA_PCT, SELL_BELOW_SMA_PCT } from "@/lib/utils/constants";
import type { SellSignalEvaluation } from "@/types/signal";
import type { SMAResult } from "@/types/signal";
import { getCurrentSMA } from "./sma";

/**
 * Evaluate SELL signal criteria for a stock.
 *
 * SELL when EITHER is true (for owned stocks):
 * 1. Price >= 60% above 200W SMA (price >= SMA * 1.60)
 * 2. Price dips >= 5% below 200W SMA (price <= SMA * 0.95)
 */
export function evaluateSellSignal(
  currentPrice: number,
  smaResults: SMAResult[]
): SellSignalEvaluation {
  const sma200w = getCurrentSMA(smaResults);

  if (sma200w === null || sma200w === 0) {
    return {
      hasSellSignal: false,
      isSixtyPercentAbove: false,
      isFivePercentBelow: false,
      currentPrice,
      sma200w: 0,
      percentDistance: 0,
    };
  }

  const percentDistance = ((currentPrice - sma200w) / sma200w) * 100;
  const isSixtyPercentAbove = percentDistance >= SELL_ABOVE_SMA_PCT;
  const isFivePercentBelow = percentDistance <= -SELL_BELOW_SMA_PCT;

  return {
    hasSellSignal: isSixtyPercentAbove || isFivePercentBelow,
    isSixtyPercentAbove,
    isFivePercentBelow,
    currentPrice,
    sma200w,
    percentDistance,
  };
}
