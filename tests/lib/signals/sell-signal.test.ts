import { describe, it, expect } from "vitest";
import { evaluateSellSignal } from "@/lib/signals/sell-signal";
import type { SMAResult } from "@/types/signal";

function makeSMAResults(currentSMA: number): SMAResult[] {
  return [{ weekEnding: "2024-01-01", smaValue: currentSMA }];
}

describe("evaluateSellSignal", () => {
  it("no sell signal for price moderately above SMA", () => {
    // Price: 120, SMA: 100, distance: +20%
    const result = evaluateSellSignal(120, makeSMAResults(100));
    expect(result.hasSellSignal).toBe(false);
    expect(result.isSixtyPercentAbove).toBe(false);
    expect(result.isFivePercentBelow).toBe(false);
  });

  it("triggers SELL_HIGH when price is 60% or more above SMA", () => {
    // Price: 160, SMA: 100, distance: +60%
    const result = evaluateSellSignal(160, makeSMAResults(100));
    expect(result.hasSellSignal).toBe(true);
    expect(result.isSixtyPercentAbove).toBe(true);
    expect(result.isFivePercentBelow).toBe(false);
    expect(result.percentDistance).toBeCloseTo(60, 1);
  });

  it("triggers SELL_HIGH above the boundary", () => {
    const result = evaluateSellSignal(180, makeSMAResults(100));
    expect(result.hasSellSignal).toBe(true);
    expect(result.isSixtyPercentAbove).toBe(true);
  });

  it("triggers SELL_LOW when price dips 5% or more below SMA", () => {
    // Price: 95, SMA: 100, distance: -5%
    const result = evaluateSellSignal(95, makeSMAResults(100));
    expect(result.hasSellSignal).toBe(true);
    expect(result.isFivePercentBelow).toBe(true);
    expect(result.isSixtyPercentAbove).toBe(false);
    expect(result.percentDistance).toBeCloseTo(-5, 1);
  });

  it("triggers SELL_LOW for deeper dips", () => {
    const result = evaluateSellSignal(80, makeSMAResults(100));
    expect(result.hasSellSignal).toBe(true);
    expect(result.isFivePercentBelow).toBe(true);
  });

  it("does not trigger at -4.99% (just above threshold)", () => {
    // Price: 95.01, SMA: 100, distance: -4.99%
    const result = evaluateSellSignal(95.01, makeSMAResults(100));
    expect(result.hasSellSignal).toBe(false);
    expect(result.isFivePercentBelow).toBe(false);
  });

  it("does not trigger at +59.99% (just below threshold)", () => {
    const result = evaluateSellSignal(159.99, makeSMAResults(100));
    expect(result.hasSellSignal).toBe(false);
    expect(result.isSixtyPercentAbove).toBe(false);
  });

  it("handles null/zero SMA gracefully", () => {
    const result = evaluateSellSignal(100, []);
    expect(result.hasSellSignal).toBe(false);
    expect(result.sma200w).toBe(0);
  });
});
