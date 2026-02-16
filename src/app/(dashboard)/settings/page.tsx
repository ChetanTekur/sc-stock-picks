import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { OwnedStocksManager } from "@/components/settings/owned-stocks-manager";
import { TrackedTickersManager } from "@/components/settings/tracked-tickers-manager";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch user preferences
  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Fetch tracked tickers with stock info
  const { data: userTickers } = await supabase
    .from("user_tickers")
    .select(`
      id,
      is_owned,
      stocks (
        id,
        ticker,
        company_name
      )
    `)
    .eq("user_id", user.id);

  const trackedStocks = (userTickers ?? [])
    .filter((ut) => ut.stocks)
    .map((ut) => {
      const s = ut.stocks as any;
      return {
        tickerId: ut.id,
        ticker: s.ticker as string,
        companyName: (s.company_name ?? s.ticker) as string,
        isOwned: ut.is_owned,
      };
    });

  const defaultPreferences = {
    email_notifications_enabled: true,
    daily_digest_enabled: false,
    weekly_summary_enabled: true,
  };

  const notificationPrefs = preferences
    ? {
        email_notifications_enabled: preferences.email_notifications_enabled,
        daily_digest_enabled: preferences.daily_digest_enabled,
        weekly_summary_enabled: preferences.weekly_summary_enabled,
      }
    : defaultPreferences;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-muted-foreground">
          Manage your notification preferences and tracked stocks.
        </p>
      </div>

      <NotificationSettings initialPreferences={notificationPrefs} />

      <OwnedStocksManager stocks={trackedStocks} />

      <TrackedTickersManager
        tickers={trackedStocks.map((s) => ({
          tickerId: s.tickerId,
          ticker: s.ticker,
          companyName: s.companyName,
        }))}
      />
    </div>
  );
}
