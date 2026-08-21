import { NextResponse } from "next/server";
import pkg from "../../../../package.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Dynamic semver from package.json
const BASE_VERSION = pkg.version || "1.3.1";
const BUILD_VERSION =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  `v${BASE_VERSION}-build-${Date.now()}`;

export async function GET() {
  return NextResponse.json(
    {
      version: BUILD_VERSION,
      displayVersion: `v${BASE_VERSION}`,
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
