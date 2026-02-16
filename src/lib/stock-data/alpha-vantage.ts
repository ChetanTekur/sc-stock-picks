export interface AVWeeklyPrice {
  weekEnding: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Fetch weekly prices from Alpha Vantage as a fallback.
 * Note: Free tier only returns ~100 data points (compact) or 20+ years (full).
 * We use "full" to get maximum history.
 */
export async function fetchAlphaVantageWeekly(
  ticker: string
): Promise<AVWeeklyPrice[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error("ALPHA_VANTAGE_API_KEY not configured");
  }

  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY_ADJUSTED&symbol=${encodeURIComponent(ticker)}&outputsize=full&apikey=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const data = await response.json();

  if (data["Note"]) {
    throw new Error("Alpha Vantage rate limit reached");
  }

  if (data["Error Message"]) {
    throw new Error(`Alpha Vantage: ${data["Error Message"]}`);
  }

  const timeSeries = data["Weekly Adjusted Time Series"];
  if (!timeSeries) {
    throw new Error("No weekly data returned from Alpha Vantage");
  }

  const prices: AVWeeklyPrice[] = Object.entries(timeSeries)
    .map(([date, values]: [string, unknown]) => {
      const v = values as Record<string, string>;
      return {
        weekEnding: date,
        open: parseFloat(v["1. open"]),
        high: parseFloat(v["2. high"]),
        low: parseFloat(v["3. low"]),
        close: parseFloat(v["5. adjusted close"]),
        volume: parseInt(v["6. volume"], 10),
      };
    })
    .sort((a, b) => a.weekEnding.localeCompare(b.weekEnding));

  return prices;
}
