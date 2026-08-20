import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_TIME || "v1.2.5-20260820-pwa-v8";

export async function GET() {
  return NextResponse.json({
    version: BUILD_VERSION,
    timestamp: new Date().toISOString()
  });
}
