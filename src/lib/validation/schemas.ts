import { z } from "zod";

export const tickerSchema = z.object({
  ticker: z
    .string()
    .min(1, "Ticker is required")
    .max(5, "Ticker must be 5 characters or less")
    .regex(/^[A-Z]{1,5}$/, "Ticker must be 1-5 uppercase letters")
    .transform((val) => val.toUpperCase()),
});

export const updateTickerSchema = z.object({
  is_owned: z.boolean().optional(),
});

export const preferencesSchema = z.object({
  email_notifications_enabled: z.boolean().optional(),
  daily_digest_enabled: z.boolean().optional(),
  weekly_summary_enabled: z.boolean().optional(),
  notification_email: z.string().email().nullable().optional(),
});

export const inviteSchema = z.object({
  email: z.string().email("Valid email is required"),
});

export const cronAuthSchema = z.object({
  authorization: z.string().refine(
    (val) => val === `Bearer ${process.env.CRON_SECRET}`,
    "Invalid cron secret"
  ),
});
