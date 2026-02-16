import { SMA_WEEKS } from "@/lib/utils/constants";
import type { SMAResult } from "@/types/signal";

/**
 * Calculate the 200-week simple moving average for a series of weekly close prices.
 * Prices should be sorted chronologically (oldest first).
 * Returns SMA values for each week where enough data exists (starting at index SMA_WEEKS - 1).
 */
export function calculate200WSMA(
  weeklyCloses: { weekEnding: string; closePrice: number }[]
): SMAResult[] {
  const results: SMAResult[] = [];

  if (weeklyCloses.length < SMA_WEEKS) {
    return results;
  }

  // Calculate initial sum for the first window
  let windowSum = 0;
  for (let i = 0; i < SMA_WEEKS; i++) {
    windowSum += weeklyCloses[i].closePrice;
  }
  results.push({
    weekEnding: weeklyCloses[SMA_WEEKS - 1].weekEnding,
    smaValue: windowSum / SMA_WEEKS,
  });

  // Slide the window forward
  for (let i = SMA_WEEKS; i < weeklyCloses.length; i++) {
    windowSum += weeklyCloses[i].closePrice;
    windowSum -= weeklyCloses[i - SMA_WEEKS].closePrice;
    results.push({
      weekEnding: weeklyCloses[i].weekEnding,
      smaValue: windowSum / SMA_WEEKS,
    });
  }

  return results;
}

/**
 * Get the current (most recent) 200W SMA value.
 */
export function getCurrentSMA(smaResults: SMAResult[]): number | null {
  if (smaResults.length === 0) return null;
  return smaResults[smaResults.length - 1].smaValue;
}
