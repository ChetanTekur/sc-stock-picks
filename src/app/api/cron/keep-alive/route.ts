import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cronAuthSchema } from "@/lib/validation/schemas";

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  // Validate authorization header via zod schema
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const parsed = cronAuthSchema.safeParse({ authorization: authHeader });
    if (parsed.success) return true;
  }

  // Fallback: check query param
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  return querySecret === secret;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  try {
    const { error } = await admin.from("stocks").select("id").limit(1);

    if (error) {
      console.error("Keep-alive check failed:", error);
      return NextResponse.json(
        { status: "error", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Keep-alive check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
