import {
  fetchWeeklyPrices,
  fetchCurrentPrice,
  type WeeklyPriceData,
} from "./yahoo-finance";
import { fetchAlphaVantageWeekly } from "./alpha-vantage";
import { BACKFILL_YEARS } from "@/lib/utils/constants";

/**
 * Fetch weekly price data with Yahoo Finance as primary and Alpha Vantage as fallback.
 */
export async function fetchStockData(
  ticker: string
): Promise<WeeklyPriceData[]> {
  try {
    const data = await fetchWeeklyPrices(ticker, BACKFILL_YEARS);
    if (data.length > 0) return data;
    throw new Error("Yahoo Finance returned no data");
  } catch (yahooError) {
    console.warn(
      `Yahoo Finance failed for ${ticker}, trying Alpha Vantage:`,
      yahooError
    );

    try {
      const avData = await fetchAlphaVantageWeekly(ticker);
      return avData.map((d) => ({
        weekEnding: d.weekEnding,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }));
    } catch (avError) {
      console.error(`Both data sources failed for ${ticker}:`, avError);
      throw new Error(
        `Failed to fetch data for ${ticker} from all sources`
      );
    }
  }
}

/**
 * Fetch the latest price for a ticker.
 */
export async function fetchLatestPrice(
  ticker: string
): Promise<{ price: number; name: string } | null> {
  const result = await fetchCurrentPrice(ticker);
  return result;
}
