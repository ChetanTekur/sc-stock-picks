import { describe, it, expect } from "vitest";
import { evaluateBuySignal } from "@/lib/signals/buy-signal";
import type { SMAResult, SlopeResult } from "@/types/signal";

function makeSMAResults(currentSMA: number): SMAResult[] {
  return [{ weekEnding: "2024-01-01", smaValue: currentSMA }];
}

function makePositiveSlopes(count: number = 400): SlopeResult[] {
  return Array.from({ length: count }, (_, i) => ({
    weekEnding: `w${i}`,
    slope: 0.5,
  }));
}

function makeMixedSlopes(): SlopeResult[] {
  const slopes = makePositiveSlopes(400);
  slopes[380].slope = -0.1; // one negative within the 7-year window
  return slopes;
}

describe("evaluateBuySignal", () => {
  it("returns meetsAllCriteria=true when all conditions are met", () => {
    // Price: 103, SMA: 100, distance: +3% (within 5%), slopes all positive
    const result = evaluateBuySignal(103, makeSMAResults(100), makePositiveSlopes());
    expect(result.meetsAllCriteria).toBe(true);
    expect(result.priceAboveSMA).toBe(true);
    expect(result.slopeNeverNegative).toBe(true);
    expect(result.withinFivePercent).toBe(true);
    expect(result.percentDistance).toBeCloseTo(3, 1);
  });

  it("returns false when price is below SMA", () => {
    const result = evaluateBuySignal(95, makeSMAResults(100), makePositiveSlopes());
    expect(result.meetsAllCriteria).toBe(false);
    expect(result.priceAboveSMA).toBe(false);
  });

  it("returns false when price is more than 5% above SMA", () => {
    // Price: 106, SMA: 100, distance: +6%
    const result = evaluateBuySignal(106, makeSMAResults(100), makePositiveSlopes());
    expect(result.meetsAllCriteria).toBe(false);
    expect(result.priceAboveSMA).toBe(true);
    expect(result.withinFivePercent).toBe(false);
  });

  it("returns false when slope has been negative", () => {
    const result = evaluateBuySignal(103, makeSMAResults(100), makeMixedSlopes());
    expect(result.meetsAllCriteria).toBe(false);
    expect(result.slopeNeverNegative).toBe(false);
  });

  it("returns true at exactly 5% boundary", () => {
    // Price: 105, SMA: 100, distance: exactly 5%
    const result = evaluateBuySignal(105, makeSMAResults(100), makePositiveSlopes());
    expect(result.meetsAllCriteria).toBe(true);
    expect(result.withinFivePercent).toBe(true);
    expect(result.percentDistance).toBeCloseTo(5, 1);
  });

  it("returns false just above 5% boundary", () => {
    const result = evaluateBuySignal(105.01, makeSMAResults(100), makePositiveSlopes());
    expect(result.meetsAllCriteria).toBe(false);
    expect(result.withinFivePercent).toBe(false);
  });

  it("handles null/zero SMA gracefully", () => {
    const result = evaluateBuySignal(100, [], makePositiveSlopes());
    expect(result.meetsAllCriteria).toBe(false);
    expect(result.sma200w).toBe(0);
  });
});
