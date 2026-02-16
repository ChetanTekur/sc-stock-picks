"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface NotificationSettingsProps {
  initialPreferences: {
    email_notifications_enabled: boolean;
    daily_digest_enabled: boolean;
    weekly_summary_enabled: boolean;
  };
}

export function NotificationSettings({ initialPreferences }: NotificationSettingsProps) {
  const [emailEnabled, setEmailEnabled] = useState(initialPreferences.email_notifications_enabled);
  const [dailyDigest, setDailyDigest] = useState(initialPreferences.daily_digest_enabled);
  const [weeklySummary, setWeeklySummary] = useState(initialPreferences.weekly_summary_enabled);
  const [saving, setSaving] = useState(false);

  const hasChanges =
    emailEnabled !== initialPreferences.email_notifications_enabled ||
    dailyDigest !== initialPreferences.daily_digest_enabled ||
    weeklySummary !== initialPreferences.weekly_summary_enabled;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_notifications_enabled: emailEnabled,
          daily_digest_enabled: dailyDigest,
          weekly_summary_enabled: weeklySummary,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save preferences");
      }

      toast.success("Notification preferences saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Configure how and when you receive stock signal notifications.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Email Notifications</p>
            <p className="text-sm text-muted-foreground">
              Receive email alerts when buy/sell signals trigger
            </p>
          </div>
          <Switch
            checked={emailEnabled}
            onCheckedChange={setEmailEnabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Daily Digest</p>
            <p className="text-sm text-muted-foreground">
              Get a daily summary of all your tracked stocks
            </p>
          </div>
          <Switch
            checked={dailyDigest}
            onCheckedChange={setDailyDigest}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Weekly Summary</p>
            <p className="text-sm text-muted-foreground">
              Receive a weekly overview with signal changes
            </p>
          </div>
          <Switch
            checked={weeklySummary}
            onCheckedChange={setWeeklySummary}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
