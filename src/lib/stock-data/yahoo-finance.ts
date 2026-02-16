/**
 * Yahoo Finance data fetching via public chart/quote APIs.
 * Uses direct HTTP requests instead of the yahoo-finance2 npm package
 * (v2.14 removed the historical module).
 */

export interface WeeklyPriceData {
  weekEnding: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface YFChartResult {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice: number;
        shortName?: string;
        longName?: string;
        symbol: string;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
          close: (number | null)[];
          volume: (number | null)[];
        }>;
      };
    }> | null;
    error: { code: string; description: string } | null;
  };
}

interface YFQuoteResult {
  quoteResponse: {
    result: Array<{
      regularMarketPrice: number;
      shortName?: string;
      longName?: string;
      symbol: string;
    }>;
    error: null | { code: string; description: string };
  };
}

const YF_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const YF_QUOTE_BASE = "https://query1.finance.yahoo.com/v7/finance/quote";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)";

/**
 * Fetch historical weekly price data for a ticker from Yahoo Finance chart API.
 * Returns data sorted chronologically (oldest first).
 */
export async function fetchWeeklyPrices(
  ticker: string,
  yearsBack: number = 10
): Promise<WeeklyPriceData[]> {
  const now = Math.floor(Date.now() / 1000);
  const period1 = now - yearsBack * 365.25 * 24 * 60 * 60;

  const url = `${YF_CHART_BASE}/${encodeURIComponent(ticker)}?period1=${Math.floor(period1)}&period2=${now}&interval=1wk&events=history`;

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(
      `Yahoo Finance chart API returned ${response.status} for ${ticker}`
    );
  }

  const data: YFChartResult = await response.json();

  if (data.chart.error) {
    throw new Error(
      `Yahoo Finance error for ${ticker}: ${data.chart.error.description}`
    );
  }

  const result = data.chart.result?.[0];
  if (!result || !result.timestamp || result.timestamp.length === 0) {
    throw new Error(`No chart data returned for ${ticker}`);
  }

  const timestamps = result.timestamp;
  const quote = result.indicators.quote[0];

  const weeklyPrices: WeeklyPriceData[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const close = quote.close[i];
    if (close == null) continue;

    const date = new Date(timestamps[i] * 1000);
    const weekEnding = date.toISOString().split("T")[0];

    weeklyPrices.push({
      weekEnding,
      open: quote.open[i] ?? close,
      high: quote.high[i] ?? close,
      low: quote.low[i] ?? close,
      close,
      volume: quote.volume[i] ?? 0,
    });
  }

  return weeklyPrices.sort((a, b) =>
    a.weekEnding.localeCompare(b.weekEnding)
  );
}

/**
 * Fetch the current quote for a ticker.
 */
export async function fetchCurrentPrice(
  ticker: string
): Promise<{ price: number; name: string } | null> {
  try {
    // Use the chart API with a short range for current price
    const url = `${YF_CHART_BASE}/${encodeURIComponent(ticker)}?range=1d&interval=1d`;

    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!response.ok) return null;

    const data: YFChartResult = await response.json();
    const result = data.chart.result?.[0];

    if (!result || result.meta.regularMarketPrice == null) return null;

    return {
      price: result.meta.regularMarketPrice,
      name:
        result.meta.shortName ??
        result.meta.longName ??
        result.meta.symbol ??
        ticker,
    };
  } catch {
    return null;
  }
}

/**
 * Validate that a ticker symbol exists.
 */
export async function validateTicker(ticker: string): Promise<boolean> {
  try {
    const result = await fetchCurrentPrice(ticker);
    return result != null;
  } catch {
    return false;
  }
}
