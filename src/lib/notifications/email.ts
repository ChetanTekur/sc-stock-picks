import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

const FROM_EMAIL = process.env.EMAIL_FROM ?? "SC Stock Picks <alerts@notifications.example.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export interface StockAlertData {
  ticker: string;
  companyName: string;
  currentPrice: number;
  sma200w: number;
  percentDistance: number;
}

export interface DailyDigestSummary {
  totalTracked: number;
  buySignals: StockAlertData[];
  sellSignals: StockAlertData[];
  neutralStocks: StockAlertData[];
  date: string;
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

function formatPercent(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function baseStyles(): string {
  return `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .card { background: #ffffff; border-radius: 8px; padding: 24px; margin-bottom: 16px; border: 1px solid #e0e0e0; }
      .header { background: #1a1a2e; color: #ffffff; padding: 24px; border-radius: 8px 8px 0 0; text-align: center; }
      .header h1 { margin: 0; font-size: 20px; }
      .buy { color: #16a34a; font-weight: bold; }
      .sell { color: #dc2626; font-weight: bold; }
      .neutral { color: #6b7280; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0; }
      th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
      th { color: #6b7280; font-size: 12px; text-transform: uppercase; }
      td { font-size: 14px; }
      .footer { text-align: center; padding: 16px; color: #9ca3af; font-size: 12px; }
      .footer a { color: #6b7280; }
    </style>
  `;
}

function stockTable(stocks: StockAlertData[], signalLabel: string): string {
  if (stocks.length === 0) return "";

  const rows = stocks
    .map(
      (s) => `
      <tr>
        <td><strong>${s.ticker}</strong></td>
        <td>${s.companyName}</td>
        <td>${formatPrice(s.currentPrice)}</td>
        <td>${formatPrice(s.sma200w)}</td>
        <td>${formatPercent(s.percentDistance)}</td>
        <td><span class="${signalLabel.toLowerCase()}">${signalLabel}</span></td>
      </tr>
    `
    )
    .join("");

  return `
    <table>
      <thead>
        <tr>
          <th>Ticker</th>
          <th>Company</th>
          <th>Price</th>
          <th>200W SMA</th>
          <th>% Distance</th>
          <th>Signal</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function footerHtml(): string {
  return `
    <div class="footer">
      <p>You are receiving this because you have notifications enabled.</p>
      <p><a href="${APP_URL}/settings">Manage notification preferences</a></p>
      <p>SC Stock Picks &mdash; 200-Week SMA Strategy Tracker</p>
    </div>
  `;
}

/**
 * Send a BUY alert email for stocks meeting buy criteria.
 * Returns the Resend message ID on success.
 */
export async function sendBuyAlert(
  email: string,
  stocks: StockAlertData[]
): Promise<string> {
  const tickers = stocks.map((s) => s.ticker).join(", ");
  const subject = `BUY Alert: ${tickers}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles()}</head>
    <body>
      <div class="container">
        <div class="header">
          <h1>BUY Signal Alert</h1>
        </div>
        <div class="card">
          <p>The following stock${stocks.length > 1 ? "s have" : " has"} triggered a <span class="buy">BUY</span> signal based on the 200-week SMA strategy:</p>
          ${stockTable(stocks, "BUY")}
          <p style="font-size: 13px; color: #6b7280;">
            BUY criteria: Price is above the 200W SMA, within 5% of SMA, and the 4-week rolling slope has never been negative in the past 7 years.
          </p>
        </div>
        ${footerHtml()}
      </div>
    </body>
    </html>
  `;

  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Failed to send buy alert: ${error.message}`);
  }

  return data!.id;
}

/**
 * Send a SELL alert email for stocks with sell signals.
 * Returns the Resend message ID on success.
 */
export async function sendSellAlert(
  email: string,
  stocks: StockAlertData[]
): Promise<string> {
  const tickers = stocks.map((s) => s.ticker).join(", ");
  const subject = `SELL Alert: ${tickers}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles()}</head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SELL Signal Alert</h1>
        </div>
        <div class="card">
          <p>The following stock${stocks.length > 1 ? "s have" : " has"} triggered a <span class="sell">SELL</span> signal:</p>
          ${stockTable(stocks, "SELL")}
          <p style="font-size: 13px; color: #6b7280;">
            SELL criteria: Price is either 60%+ above the 200W SMA or 5%+ below the 200W SMA.
          </p>
        </div>
        ${footerHtml()}
      </div>
    </body>
    </html>
  `;

  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Failed to send sell alert: ${error.message}`);
  }

  return data!.id;
}

/**
 * Send a daily digest email summarizing all tracked stocks.
 * Returns the Resend message ID on success.
 */
export async function sendDailyDigest(
  email: string,
  summary: DailyDigestSummary
): Promise<string> {
  const subject = `Daily Digest: ${summary.totalTracked} stocks tracked — ${summary.date}`;

  let signalSummaryHtml = "";
  if (summary.buySignals.length > 0) {
    signalSummaryHtml += `
      <div class="card">
        <h2 style="margin-top: 0;" class="buy">BUY Signals (${summary.buySignals.length})</h2>
        ${stockTable(summary.buySignals, "BUY")}
      </div>
    `;
  }
  if (summary.sellSignals.length > 0) {
    signalSummaryHtml += `
      <div class="card">
        <h2 style="margin-top: 0;" class="sell">SELL Signals (${summary.sellSignals.length})</h2>
        ${stockTable(summary.sellSignals, "SELL")}
      </div>
    `;
  }
  if (summary.neutralStocks.length > 0) {
    signalSummaryHtml += `
      <div class="card">
        <h2 style="margin-top: 0;" class="neutral">Neutral (${summary.neutralStocks.length})</h2>
        ${stockTable(summary.neutralStocks, "NEUTRAL")}
      </div>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles()}</head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Daily Stock Digest &mdash; ${summary.date}</h1>
        </div>
        <div class="card">
          <p>Here is your daily summary of <strong>${summary.totalTracked}</strong> tracked stock${summary.totalTracked !== 1 ? "s" : ""}.</p>
          <p>
            <span class="buy">${summary.buySignals.length} BUY</span> &nbsp;|&nbsp;
            <span class="sell">${summary.sellSignals.length} SELL</span> &nbsp;|&nbsp;
            <span class="neutral">${summary.neutralStocks.length} NEUTRAL</span>
          </p>
        </div>
        ${signalSummaryHtml}
        ${footerHtml()}
      </div>
    </body>
    </html>
  `;

  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Failed to send daily digest: ${error.message}`);
  }

  return data!.id;
}
