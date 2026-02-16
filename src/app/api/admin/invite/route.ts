import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { INVITE_TOKEN_EXPIRY_DAYS } from "@/lib/utils/constants";
import { checkRateLimit } from "@/lib/utils/rate-limit";

async function getAuthenticatedAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  // Check admin role from app metadata
  const isAdmin = user.app_metadata?.role === "admin";
  if (!isAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user };
}

export async function POST(_request: NextRequest) {
  const auth = await getAuthenticatedAdmin();
  if ("error" in auth) return auth.error;

  // Rate limit: 10 requests per hour
  const rateCheck = checkRateLimit(`admin-invite:${auth.user.id}`, {
    maxRequests: 10,
    windowMs: 3600000,
  });
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const admin = createAdminClient();
  const token = crypto.randomUUID();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TOKEN_EXPIRY_DAYS);

  const { data, error } = await admin
    .from("invite_tokens")
    .insert({
      token,
      created_by: auth.user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function GET() {
  const auth = await getAuthenticatedAdmin();
  if ("error" in auth) return auth.error;

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("invite_tokens")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
