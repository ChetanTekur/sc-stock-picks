import { describe, it, expect } from "vitest";
import { evaluateSellSignal } from "@/lib/signals/sell-signal";
import type { SMAResult } from "@/types/signal";

function makeSMAResults(currentSMA: number): SMAResult[] {
  return [{ weekEnding: "2024-01-01", smaValue: currentSMA }];
}

describe("evaluateSellSignal", () => {
  // SELL_ABOVE_SMA_PCT = 57% (60% base - 3% margin)
  // SELL_BELOW_SMA_PCT = 2% (5% base - 3% margin)

  it("no sell signal for price moderately above SMA", () => {
    // Price: 120, SMA: 100, distance: +20%
    const result = evaluateSellSignal(120, makeSMAResults(100));
    expect(result.hasSellSignal).toBe(false);
    expect(result.isSixtyPercentAbove).toBe(false);
    expect(result.isFivePercentBelow).toBe(false);
  });

  it("triggers SELL_HIGH when price is 57%+ above SMA", () => {
    // Price: 158, SMA: 100, distance: +58% (clearly above 57% threshold)
    const result = evaluateSellSignal(158, makeSMAResults(100));
    expect(result.hasSellSignal).toBe(true);
    expect(result.isSixtyPercentAbove).toBe(true);
    expect(result.isFivePercentBelow).toBe(false);
    expect(result.percentDistance).toBeCloseTo(58, 1);
  });

  it("triggers SELL_HIGH above the boundary", () => {
    const result = evaluateSellSignal(180, makeSMAResults(100));
    expect(result.hasSellSignal).toBe(true);
    expect(result.isSixtyPercentAbove).toBe(true);
  });

  it("does not trigger at +56.99% (just below 57% threshold)", () => {
    const result = evaluateSellSignal(156.99, makeSMAResults(100));
    expect(result.hasSellSignal).toBe(false);
    expect(result.isSixtyPercentAbove).toBe(false);
  });

  it("triggers SELL_LOW when price dips 2% or more below SMA", () => {
    // Price: 98, SMA: 100, distance: -2%
    const result = evaluateSellSignal(98, makeSMAResults(100));
    expect(result.hasSellSignal).toBe(true);
    expect(result.isFivePercentBelow).toBe(true);
    expect(result.isSixtyPercentAbove).toBe(false);
    expect(result.percentDistance).toBeCloseTo(-2, 1);
  });

  it("triggers SELL_LOW for deeper dips", () => {
    const result = evaluateSellSignal(80, makeSMAResults(100));
    expect(result.hasSellSignal).toBe(true);
    expect(result.isFivePercentBelow).toBe(true);
  });

  it("does not trigger at -1.99% (just above 2% threshold)", () => {
    // Price: 98.01, SMA: 100, distance: -1.99%
    const result = evaluateSellSignal(98.01, makeSMAResults(100));
    expect(result.hasSellSignal).toBe(false);
    expect(result.isFivePercentBelow).toBe(false);
  });

  it("handles null/zero SMA gracefully", () => {
    const result = evaluateSellSignal(100, []);
    expect(result.hasSellSignal).toBe(false);
    expect(result.sma200w).toBe(0);
  });
});
