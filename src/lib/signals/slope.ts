import { SLOPE_ROLLING_WEEKS, SLOPE_HISTORY_WEEKS } from "@/lib/utils/constants";
import type { SMAResult, SlopeResult } from "@/types/signal";

/**
 * Calculate the 4-week rolling slope of the 200W SMA.
 * slope_at_week(W) = (SMA[W] - SMA[W - SLOPE_ROLLING_WEEKS]) / SLOPE_ROLLING_WEEKS
 *
 * SMA results should be sorted chronologically (oldest first).
 */
export function calculateRollingSlope(smaResults: SMAResult[]): SlopeResult[] {
  const slopes: SlopeResult[] = [];

  if (smaResults.length <= SLOPE_ROLLING_WEEKS) {
    return slopes;
  }

  for (let i = SLOPE_ROLLING_WEEKS; i < smaResults.length; i++) {
    const currentSMA = smaResults[i].smaValue;
    const previousSMA = smaResults[i - SLOPE_ROLLING_WEEKS].smaValue;
    const slope = (currentSMA - previousSMA) / SLOPE_ROLLING_WEEKS;

    slopes.push({
      weekEnding: smaResults[i].weekEnding,
      slope,
    });
  }

  return slopes;
}

/**
 * Check if the 4-week rolling slope has NEVER been negative
 * over the past 7 years (364 weeks) of slope data.
 *
 * Returns true if the slope has always been >= 0 (or there's not enough history).
 * Returns false if any slope value in the 7-year window was negative.
 */
export function hasNeverHadNegativeSlope(slopes: SlopeResult[]): boolean {
  if (slopes.length === 0) return false;

  // Take the most recent SLOPE_HISTORY_WEEKS entries (or all if less)
  const lookbackCount = Math.min(slopes.length, SLOPE_HISTORY_WEEKS);
  const recentSlopes = slopes.slice(slopes.length - lookbackCount);

  return recentSlopes.every((s) => s.slope >= 0);
}

/**
 * Get the current (most recent) slope direction.
 */
export function getCurrentSlopeDirection(slopes: SlopeResult[]): "up" | "down" {
  if (slopes.length === 0) return "down";
  return slopes[slopes.length - 1].slope >= 0 ? "up" : "down";
}
