import { NextResponse } from "next/server";
import pkg from "../../../../package.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Dynamic semver + short git commit hash from process.env
const BASE_VERSION = pkg.version || "1.3.1";
const gitSha = process.env.VERCEL_GIT_COMMIT_SHA || "";
const shortSha = gitSha ? gitSha.substring(0, 5) : "";
const BUILD_VERSION = gitSha || process.env.VERCEL_DEPLOYMENT_ID || `v${BASE_VERSION}-build-${Date.now()}`;
const DISPLAY_VERSION = shortSha ? `v${BASE_VERSION} (${shortSha})` : `v${BASE_VERSION}`;

export async function GET() {
  return NextResponse.json(
    {
      version: BUILD_VERSION,
      displayVersion: DISPLAY_VERSION,
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
