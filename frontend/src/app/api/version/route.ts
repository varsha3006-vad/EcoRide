import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Dynamic deployment version identifier (Vercel Git Commit SHA or timestamp build tag)
const BUILD_VERSION =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  "v1.3.1-release-20260821-v9";

export async function GET() {
  return NextResponse.json(
    {
      version: BUILD_VERSION,
      timestamp: new Date().toISOString()
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    }
  );
}
