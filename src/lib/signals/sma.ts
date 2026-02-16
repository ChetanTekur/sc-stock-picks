import { SMA_WEEKS, SMA_MIN_WEEKS } from "@/lib/utils/constants";
import type { SMAResult } from "@/types/signal";

/**
 * Calculate a simple moving average for a series of weekly close prices.
 * Uses 200-week window by default (SMA_WEEKS).
 * If fewer than 200 weeks are available but >= SMA_MIN_WEEKS (20),
 * falls back to using all available weeks as the SMA period.
 *
 * Prices should be sorted chronologically (oldest first).
 * Returns SMA values for each week where enough data exists.
 */
export function calculate200WSMA(
  weeklyCloses: { weekEnding: string; closePrice: number }[]
): SMAResult[] {
  return calculateSMA(weeklyCloses, SMA_WEEKS);
}

/**
 * Calculate SMA with a flexible period. If not enough data for the
 * requested period but at least SMA_MIN_WEEKS available, uses all
 * available weeks as the window.
 *
 * Returns { results, period } where period is the actual window used.
 */
export function calculateFlexibleSMA(
  weeklyCloses: { weekEnding: string; closePrice: number }[]
): { results: SMAResult[]; period: number } {
  // Prefer 200-week SMA if enough data
  if (weeklyCloses.length >= SMA_WEEKS) {
    return { results: calculateSMA(weeklyCloses, SMA_WEEKS), period: SMA_WEEKS };
  }

  // Fallback: use all available data as the SMA period if >= minimum
  if (weeklyCloses.length >= SMA_MIN_WEEKS) {
    const period = weeklyCloses.length;
    return { results: calculateSMA(weeklyCloses, period), period };
  }

  // Not enough data at all
  return { results: [], period: 0 };
}

/**
 * Core SMA calculation with a given window size.
 */
function calculateSMA(
  weeklyCloses: { weekEnding: string; closePrice: number }[],
  window: number
): SMAResult[] {
  const results: SMAResult[] = [];

  if (weeklyCloses.length < window) {
    return results;
  }

  // Calculate initial sum for the first window
  let windowSum = 0;
  for (let i = 0; i < window; i++) {
    windowSum += weeklyCloses[i].closePrice;
  }
  results.push({
    weekEnding: weeklyCloses[window - 1].weekEnding,
    smaValue: windowSum / window,
  });

  // Slide the window forward
  for (let i = window; i < weeklyCloses.length; i++) {
    windowSum += weeklyCloses[i].closePrice;
    windowSum -= weeklyCloses[i - window].closePrice;
    results.push({
      weekEnding: weeklyCloses[i].weekEnding,
      smaValue: windowSum / window,
    });
  }

  return results;
}

/**
 * Get the current (most recent) SMA value.
 */
export function getCurrentSMA(smaResults: SMAResult[]): number | null {
  if (smaResults.length === 0) return null;
  return smaResults[smaResults.length - 1].smaValue;
}
