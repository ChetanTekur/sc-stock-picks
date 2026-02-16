import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tickerSchema } from "@/lib/validation/schemas";
import { validateTicker } from "@/lib/stock-data/yahoo-finance";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_tickers")
    .select(`
      id,
      is_owned,
      stocks (
        id, ticker, company_name, current_price, sma_200w,
        price_vs_sma_pct, sma_slope_ever_negative, last_data_fetch
      )
    `)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const rateCheck = checkRateLimit(`ticker-add:${user.id}`, { maxRequests: 20, windowMs: 3600000 });
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = tickerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { ticker } = parsed.data;

  // Validate ticker exists
  const isValid = await validateTicker(ticker);
  if (!isValid) {
    return NextResponse.json({ error: `Invalid ticker: ${ticker}` }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check if stock already exists in system
  let { data: stock } = await admin
    .from("stocks")
    .select("id")
    .eq("ticker", ticker)
    .single();

  if (!stock) {
    // Create the stock entry
    const { data: newStock, error: createError } = await admin
      .from("stocks")
      .insert({ ticker, company_name: ticker })
      .select("id")
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    stock = newStock;

    // Trigger backfill in the background (fire and forget)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/stocks/backfill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    }).catch(console.error);
  }

  // Add user-ticker relationship
  const { error: linkError } = await supabase
    .from("user_tickers")
    .insert({ user_id: user.id, stock_id: stock!.id });

  if (linkError) {
    if (linkError.code === "23505") {
      return NextResponse.json({ error: "Already tracking this stock" }, { status: 409 });
    }
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, stock_id: stock!.id }, { status: 201 });
}
