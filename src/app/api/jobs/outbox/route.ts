import { NextRequest, NextResponse } from "next/server";

import { processOutbox } from "@/lib/notifications";

/**
 * Outbox worker entrypoint. Protected by CRON_SECRET (Bearer). Vercel Cron
 * invokes with GET and attaches the secret automatically; POST is accepted too
 * for manual/programmatic triggers.
 */
async function run(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  try {
    const result = await processOutbox();
    return NextResponse.json(result);
  } catch (error) {
    console.error("outbox job failed:", error instanceof Error ? error.message : error);
    return new NextResponse("Outbox job failed", { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
