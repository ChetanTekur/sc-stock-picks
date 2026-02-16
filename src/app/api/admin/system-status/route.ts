import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = user.app_metadata?.role === "admin";
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limit: 30 requests per hour
  const rateCheck = checkRateLimit(`admin-system-status:${user.id}`, {
    maxRequests: 30,
    windowMs: 3600000,
  });
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const admin = createAdminClient();

  try {
    // Run all queries in parallel
    const [stocksResult, usersResult, lastFetchResult, notificationErrorsResult] =
      await Promise.all([
        // Total stocks count
        admin.from("stocks").select("id", { count: "exact", head: true }),

        // Total users count via auth.users (admin client)
        admin.auth.admin.listUsers(),

        // Last data fetch time (most recent last_data_fetch from stocks)
        admin
          .from("stocks")
          .select("last_data_fetch")
          .not("last_data_fetch", "is", null)
          .order("last_data_fetch", { ascending: false })
          .limit(1)
          .single(),

        // Recent notification errors (last 24 hours)
        admin
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("status", "failed")
          .gte(
            "sent_at",
            new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          ),
      ]);

    return NextResponse.json({
      data: {
        total_stocks: stocksResult.count ?? 0,
        total_users: usersResult.data?.users?.length ?? 0,
        last_data_fetch: lastFetchResult.data?.last_data_fetch ?? null,
        recent_notification_errors: notificationErrorsResult.count ?? 0,
      },
    });
  } catch (error) {
    console.error("System status check failed:", error);
    return NextResponse.json(
      {
        error: `Failed to fetch system status: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
