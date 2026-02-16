import { createServerSupabaseClient } from "@/lib/supabase/server";
import { InviteManager } from "@/components/admin/invite-manager";
import { SystemStatus } from "@/components/admin/system-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";
import type { InviteToken } from "@/types/database";

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Check if user is admin
  const isAdmin = user.app_metadata?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Admin</h2>
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have admin privileges. Contact an administrator if you believe this is an
            error.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Fetch invite tokens
  const { data: tokens } = await supabase
    .from("invite_tokens")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Admin Dashboard</h2>
        <p className="text-muted-foreground">
          Manage invite tokens and monitor system health.
        </p>
      </div>

      <SystemStatus />

      <InviteManager initialTokens={(tokens as InviteToken[]) ?? []} />
    </div>
  );
}
