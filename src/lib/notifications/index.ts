import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendBuyAlert,
  sendSellAlert,
  sendDailyDigest,
  sendMarketSummary,
  type StockAlertData,
  type DailyDigestSummary,
  type MarketTrigger,
  type MarketSummaryData,
} from "./email";
import type { SignalType } from "@/types/database";

export interface SignalWithStock {
  signalId: string;
  stockId: string;
  ticker: string;
  companyName: string;
  signalType: SignalType;
  currentPrice: number;
  sma200w: number;
  percentDistance: number;
}

export interface NotifiableUser {
  userId: string;
  email: string;
  notificationEmail: string | null;
  emailNotificationsEnabled: boolean;
  dailyDigestEnabled: boolean;
  trackedStockIds: string[];
}

interface NotificationResult {
  userId: string;
  email: string;
  type: "buy_alert" | "sell_alert" | "daily_digest" | "market_summary";
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface StockSummaryItem {
  stockId: string;
  ticker: string;
  companyName: string;
  signalType: SignalType;
  currentPrice: number;
  sma200w: number;
  percentDistance: number;
}

/**
 * Orchestrate sending notifications for signal changes.
 *
 * - Groups signals by type (BUY vs SELL)
 * - For each user with notifications enabled, determines relevant signals
 * - Deduplicates against previously sent notifications
 * - Sends appropriate email (buy alert, sell alert, or daily digest)
 * - Logs all sent notifications in the notifications table
 */
export async function processNotifications(
  signals: SignalWithStock[],
  users: NotifiableUser[]
): Promise<NotificationResult[]> {
  const admin = createAdminClient();
  const results: NotificationResult[] = [];

  // Group signals by type
  const buySignals = signals.filter((s) => s.signalType === "BUY");
  const sellSignals = signals.filter(
    (s) => s.signalType === "SELL_HIGH" || s.signalType === "SELL_LOW"
  );
  const neutralSignals = signals.filter((s) => s.signalType === "NEUTRAL");

  for (const user of users) {
    if (!user.emailNotificationsEnabled) continue;

    const targetEmail = user.notificationEmail ?? user.email;

    // Filter signals to only those the user tracks
    const userBuySignals = buySignals.filter((s) =>
      user.trackedStockIds.includes(s.stockId)
    );
    const userSellSignals = sellSignals.filter((s) =>
      user.trackedStockIds.includes(s.stockId)
    );
    const userNeutralSignals = neutralSignals.filter((s) =>
      user.trackedStockIds.includes(s.stockId)
    );

    // Check for already-sent notifications to deduplicate
    const relevantSignalIds = [
      ...userBuySignals,
      ...userSellSignals,
    ].map((s) => s.signalId);

    if (relevantSignalIds.length > 0) {
      const { data: existingNotifications } = await admin
        .from("notifications")
        .select("signal_id")
        .eq("user_id", user.userId)
        .in("signal_id", relevantSignalIds)
        .eq("status", "sent");

      const alreadySentSignalIds = new Set(
        existingNotifications?.map((n) => n.signal_id) ?? []
      );

      // Remove already-notified signals
      const newBuySignals = userBuySignals.filter(
        (s) => !alreadySentSignalIds.has(s.signalId)
      );
      const newSellSignals = userSellSignals.filter(
        (s) => !alreadySentSignalIds.has(s.signalId)
      );

      // Send buy alerts
      if (newBuySignals.length > 0) {
        const result = await sendAlertAndLog(
          admin,
          user,
          targetEmail,
          newBuySignals,
          "buy_alert"
        );
        results.push(result);
      }

      // Send sell alerts
      if (newSellSignals.length > 0) {
        const result = await sendAlertAndLog(
          admin,
          user,
          targetEmail,
          newSellSignals,
          "sell_alert"
        );
        results.push(result);
      }
    }

    // Send daily digest if enabled
    if (user.dailyDigestEnabled) {
      const allUserSignals = [
        ...userBuySignals,
        ...userSellSignals,
        ...userNeutralSignals,
      ];
      if (allUserSignals.length > 0) {
        const result = await sendDigestAndLog(
          admin,
          user,
          targetEmail,
          userBuySignals,
          userSellSignals,
          userNeutralSignals
        );
        results.push(result);
      }
    }
  }

  return results;
}

function toAlertData(signal: SignalWithStock): StockAlertData {
  return {
    ticker: signal.ticker,
    companyName: signal.companyName,
    currentPrice: signal.currentPrice,
    sma200w: signal.sma200w,
    percentDistance: signal.percentDistance,
  };
}

async function sendAlertAndLog(
  admin: ReturnType<typeof createAdminClient>,
  user: NotifiableUser,
  email: string,
  signals: SignalWithStock[],
  type: "buy_alert" | "sell_alert"
): Promise<NotificationResult> {
  try {
    const alertData = signals.map(toAlertData);
    const messageId =
      type === "buy_alert"
        ? await sendBuyAlert(email, alertData)
        : await sendSellAlert(email, alertData);

    // Log each signal notification
    const notificationRows = signals.map((s) => ({
      user_id: user.userId,
      signal_id: s.signalId,
      channel: "email",
      email_subject: `${type === "buy_alert" ? "BUY" : "SELL"} Alert: ${signals.map((sig) => sig.ticker).join(", ")}`,
      sent_at: new Date().toISOString(),
      resend_message_id: messageId,
      status: "sent" as const,
    }));

    await admin.from("notifications").insert(notificationRows);

    return { userId: user.userId, email, type, success: true, messageId };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to send ${type} to ${email}:`, errorMessage);

    // Log the failure
    const failedRows = signals.map((s) => ({
      user_id: user.userId,
      signal_id: s.signalId,
      channel: "email",
      email_subject: `${type === "buy_alert" ? "BUY" : "SELL"} Alert (failed)`,
      sent_at: new Date().toISOString(),
      resend_message_id: null,
      status: "failed" as const,
    }));

    try {
      await admin.from("notifications").insert(failedRows);
    } catch (logError) {
      console.error("Failed to log notification failure:", logError);
    }

    return { userId: user.userId, email, type, success: false, error: errorMessage };
  }
}

async function sendDigestAndLog(
  admin: ReturnType<typeof createAdminClient>,
  user: NotifiableUser,
  email: string,
  buySignals: SignalWithStock[],
  sellSignals: SignalWithStock[],
  neutralSignals: SignalWithStock[]
): Promise<NotificationResult> {
  try {
    const summary: DailyDigestSummary = {
      totalTracked:
        buySignals.length + sellSignals.length + neutralSignals.length,
      buySignals: buySignals.map(toAlertData),
      sellSignals: sellSignals.map(toAlertData),
      neutralStocks: neutralSignals.map(toAlertData),
      date: new Date().toISOString().split("T")[0],
    };

    const messageId = await sendDailyDigest(email, summary);

    // Log the digest notification (no specific signal_id for digests)
    await admin.from("notifications").insert({
      user_id: user.userId,
      signal_id: null,
      channel: "email",
      email_subject: `Daily Digest: ${summary.totalTracked} stocks tracked — ${summary.date}`,
      sent_at: new Date().toISOString(),
      resend_message_id: messageId,
      status: "sent" as const,
    });

    return {
      userId: user.userId,
      email,
      type: "daily_digest",
      success: true,
      messageId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to send daily digest to ${email}:`, errorMessage);

    try {
      await admin.from("notifications").insert({
        user_id: user.userId,
        signal_id: null,
        channel: "email",
        email_subject: "Daily Digest (failed)",
        sent_at: new Date().toISOString(),
        resend_message_id: null,
        status: "failed" as const,
      });
    } catch (logError) {
      console.error("Failed to log digest notification failure:", logError);
    }

    return {
      userId: user.userId,
      email,
      type: "daily_digest",
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send a market summary email to all users with notifications enabled.
 * This is called at market open and market close, regardless of signal changes.
 *
 * - Sends a full portfolio overview grouped by signal type
 * - Highlights any signals that changed during this run
 * - Logs the notification in the notifications table
 */
export async function processMarketSummary(
  allStocks: StockSummaryItem[],
  changedSignals: SignalWithStock[],
  users: NotifiableUser[],
  trigger: MarketTrigger
): Promise<NotificationResult[]> {
  const admin = createAdminClient();
  const results: NotificationResult[] = [];

  // Format current time in ET
  const now = new Date();
  const etTime = now.toLocaleString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const dateStr = now.toISOString().split("T")[0];

  for (const user of users) {
    if (!user.emailNotificationsEnabled) continue;

    const targetEmail = user.notificationEmail ?? user.email;

    // Filter stocks to only those the user tracks
    const userStocks = allStocks.filter((s) =>
      user.trackedStockIds.includes(s.stockId)
    );

    if (userStocks.length === 0) continue;

    const toAlert = (s: StockSummaryItem): StockAlertData => ({
      ticker: s.ticker,
      companyName: s.companyName,
      currentPrice: s.currentPrice,
      sma200w: s.sma200w,
      percentDistance: s.percentDistance,
    });

    const buyStocks = userStocks.filter((s) => s.signalType === "BUY");
    const sellStocks = userStocks.filter(
      (s) => s.signalType === "SELL_HIGH" || s.signalType === "SELL_LOW"
    );
    const neutralStocks = userStocks.filter((s) => s.signalType === "NEUTRAL");

    // Signal changes relevant to this user
    const userChanges = changedSignals.filter((s) =>
      user.trackedStockIds.includes(s.stockId)
    );

    const summaryData: MarketSummaryData = {
      trigger,
      totalTracked: userStocks.length,
      buySignals: buyStocks.map(toAlert),
      sellSignals: sellStocks.map(toAlert),
      neutralStocks: neutralStocks.map(toAlert),
      signalChanges: userChanges.map(toAlertData),
      date: dateStr,
      time: etTime,
    };

    try {
      const messageId = await sendMarketSummary(targetEmail, summaryData);

      await admin.from("notifications").insert({
        user_id: user.userId,
        signal_id: null,
        channel: "email",
        email_subject: `${trigger === "market_open" ? "Market Open" : "Market Close"} Summary: ${userStocks.length} stocks — ${dateStr}`,
        sent_at: new Date().toISOString(),
        resend_message_id: messageId,
        status: "sent" as const,
      });

      results.push({
        userId: user.userId,
        email: targetEmail,
        type: "market_summary",
        success: true,
        messageId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `Failed to send market summary to ${targetEmail}:`,
        errorMessage
      );

      try {
        await admin.from("notifications").insert({
          user_id: user.userId,
          signal_id: null,
          channel: "email",
          email_subject: `Market Summary (failed)`,
          sent_at: new Date().toISOString(),
          resend_message_id: null,
          status: "failed" as const,
        });
      } catch (logError) {
        console.error("Failed to log market summary failure:", logError);
      }

      results.push({
        userId: user.userId,
        email: targetEmail,
        type: "market_summary",
        success: false,
        error: errorMessage,
      });
    }
  }

  return results;
}
