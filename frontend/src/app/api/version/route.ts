import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_SEMVER = "v1.3.1";
const BUILD_VERSION =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  `${PUBLIC_SEMVER}-release-20260821-v9`;

export async function GET() {
  return NextResponse.json(
    {
      version: BUILD_VERSION,
      displayVersion: PUBLIC_SEMVER,
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
