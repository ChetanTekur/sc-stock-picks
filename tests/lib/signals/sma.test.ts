import { describe, it, expect } from "vitest";
import { calculate200WSMA, getCurrentSMA } from "@/lib/signals/sma";

function generateWeeklyData(count: number, startPrice: number, increment: number = 0) {
  return Array.from({ length: count }, (_, i) => ({
    weekEnding: `2020-01-${String(i + 1).padStart(2, "0")}`,
    closePrice: startPrice + i * increment,
  }));
}

describe("calculate200WSMA", () => {
  it("returns empty array if fewer than 200 data points", () => {
    const data = generateWeeklyData(199, 100);
    const result = calculate200WSMA(data);
    expect(result).toEqual([]);
  });

  it("returns exactly 1 result for exactly 200 data points", () => {
    const data = generateWeeklyData(200, 100, 0);
    const result = calculate200WSMA(data);
    expect(result).toHaveLength(1);
    expect(result[0].smaValue).toBeCloseTo(100, 5);
  });

  it("calculates correct SMA for constant prices", () => {
    const data = generateWeeklyData(210, 50, 0);
    const result = calculate200WSMA(data);
    expect(result).toHaveLength(11);
    result.forEach((r) => expect(r.smaValue).toBeCloseTo(50, 5));
  });

  it("calculates correct SMA for linearly increasing prices", () => {
    // Prices: 1, 2, 3, ..., 250
    const data = generateWeeklyData(250, 1, 1);
    const result = calculate200WSMA(data);
    // First SMA (index 199): average of 1..200 = (1+200)/2 = 100.5
    expect(result[0].smaValue).toBeCloseTo(100.5, 5);
    // Last SMA (index 249): average of 51..250 = (51+250)/2 = 150.5
    expect(result[result.length - 1].smaValue).toBeCloseTo(150.5, 5);
  });

  it("uses sliding window correctly", () => {
    // 201 data points: first 200 are all 100, last one is 300
    const data = [
      ...generateWeeklyData(200, 100, 0),
      { weekEnding: "2023-12-31", closePrice: 300 },
    ];
    const result = calculate200WSMA(data);
    expect(result).toHaveLength(2);
    // Second SMA: (199*100 + 300) / 200 = (19900 + 300) / 200 = 101
    expect(result[1].smaValue).toBeCloseTo(101, 5);
  });
});

describe("getCurrentSMA", () => {
  it("returns null for empty array", () => {
    expect(getCurrentSMA([])).toBeNull();
  });

  it("returns last SMA value", () => {
    const results = [
      { weekEnding: "2023-01-01", smaValue: 100 },
      { weekEnding: "2023-01-08", smaValue: 105 },
      { weekEnding: "2023-01-15", smaValue: 110 },
    ];
    expect(getCurrentSMA(results)).toBe(110);
  });
});
