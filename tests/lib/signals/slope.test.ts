import { describe, it, expect } from "vitest";
import { calculateRollingSlope, hasNeverHadNegativeSlope, getCurrentSlopeDirection } from "@/lib/signals/slope";
import type { SMAResult } from "@/types/signal";

function generateSMAResults(count: number, startValue: number, increment: number): SMAResult[] {
  return Array.from({ length: count }, (_, i) => ({
    weekEnding: `2020-01-${String(i + 1).padStart(2, "0")}`,
    smaValue: startValue + i * increment,
  }));
}

describe("calculateRollingSlope", () => {
  it("returns empty for 4 or fewer SMA results", () => {
    const data = generateSMAResults(4, 100, 1);
    expect(calculateRollingSlope(data)).toEqual([]);
  });

  it("calculates correct slopes for linearly increasing SMA", () => {
    // SMA values: 100, 101, 102, 103, 104, 105
    const data = generateSMAResults(6, 100, 1);
    const slopes = calculateRollingSlope(data);
    // Each slope = (SMA[i] - SMA[i-4]) / 4 = 4/4 = 1
    expect(slopes).toHaveLength(2);
    slopes.forEach((s) => expect(s.slope).toBeCloseTo(1, 5));
  });

  it("detects negative slopes", () => {
    // SMA values: 100, 99, 98, 97, 96
    const data = generateSMAResults(5, 100, -1);
    const slopes = calculateRollingSlope(data);
    expect(slopes).toHaveLength(1);
    expect(slopes[0].slope).toBeCloseTo(-1, 5);
  });

  it("handles mixed slopes", () => {
    const data: SMAResult[] = [
      { weekEnding: "w1", smaValue: 100 },
      { weekEnding: "w2", smaValue: 102 },
      { weekEnding: "w3", smaValue: 104 },
      { weekEnding: "w4", smaValue: 106 },
      { weekEnding: "w5", smaValue: 105 }, // dip
      { weekEnding: "w6", smaValue: 104 }, // further dip
    ];
    const slopes = calculateRollingSlope(data);
    expect(slopes).toHaveLength(2);
    // slope at w5: (105 - 100) / 4 = 1.25 (positive)
    expect(slopes[0].slope).toBeCloseTo(1.25, 5);
    // slope at w6: (104 - 102) / 4 = 0.5 (positive but smaller)
    expect(slopes[1].slope).toBeCloseTo(0.5, 5);
  });
});

describe("hasNeverHadNegativeSlope", () => {
  it("returns false for empty slopes", () => {
    expect(hasNeverHadNegativeSlope([])).toBe(false);
  });

  it("returns true when all slopes are positive", () => {
    const slopes = Array.from({ length: 400 }, (_, i) => ({
      weekEnding: `w${i}`,
      slope: 0.5,
    }));
    expect(hasNeverHadNegativeSlope(slopes)).toBe(true);
  });

  it("returns true when all slopes are zero", () => {
    const slopes = Array.from({ length: 400 }, (_, i) => ({
      weekEnding: `w${i}`,
      slope: 0,
    }));
    expect(hasNeverHadNegativeSlope(slopes)).toBe(true);
  });

  it("returns false when any recent slope is negative", () => {
    const slopes = Array.from({ length: 400 }, (_, i) => ({
      weekEnding: `w${i}`,
      slope: i === 390 ? -0.01 : 1, // one negative near the end
    }));
    expect(hasNeverHadNegativeSlope(slopes)).toBe(false);
  });

  it("ignores negative slopes outside the 7-year window", () => {
    // 500 slopes: first 136 are negative (outside 364-week window), rest are positive
    const slopes = Array.from({ length: 500 }, (_, i) => ({
      weekEnding: `w${i}`,
      slope: i < 136 ? -1 : 1, // 500 - 364 = 136, so indices 0-135 are outside window
    }));
    expect(hasNeverHadNegativeSlope(slopes)).toBe(true);
  });

  it("catches negative slopes at the boundary of the 7-year window", () => {
    // 500 slopes: negative at index 136 (first index inside the 364-week window)
    const slopes = Array.from({ length: 500 }, (_, i) => ({
      weekEnding: `w${i}`,
      slope: i === 136 ? -0.01 : 1,
    }));
    expect(hasNeverHadNegativeSlope(slopes)).toBe(false);
  });
});

describe("getCurrentSlopeDirection", () => {
  it("returns 'down' for empty slopes", () => {
    expect(getCurrentSlopeDirection([])).toBe("down");
  });

  it("returns 'up' for positive last slope", () => {
    const slopes = [
      { weekEnding: "w1", slope: 0.5 },
      { weekEnding: "w2", slope: 1.0 },
    ];
    expect(getCurrentSlopeDirection(slopes)).toBe("up");
  });

  it("returns 'down' for negative last slope", () => {
    const slopes = [
      { weekEnding: "w1", slope: 0.5 },
      { weekEnding: "w2", slope: -0.1 },
    ];
    expect(getCurrentSlopeDirection(slopes)).toBe("down");
  });

  it("returns 'up' for zero slope", () => {
    const slopes = [{ weekEnding: "w1", slope: 0 }];
    expect(getCurrentSlopeDirection(slopes)).toBe("up");
  });
});
