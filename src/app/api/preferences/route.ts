import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { preferencesSchema } from "@/lib/validation/schemas";
import { checkRateLimit } from "@/lib/utils/rate-limit";

const DEFAULT_PREFERENCES = {
  email_notifications_enabled: true,
  daily_digest_enabled: true,
  weekly_summary_enabled: true,
  notification_email: null,
};

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found (not an actual error for us)
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return existing preferences or defaults
  return NextResponse.json({
    data: data ?? { ...DEFAULT_PREFERENCES, user_id: user.id },
  });
}

export async function PUT(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 20 requests per hour
  const rateCheck = checkRateLimit(`preferences:${user.id}`, {
    maxRequests: 20,
    windowMs: 3600000,
  });
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = preferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: user.id,
        ...parsed.data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
