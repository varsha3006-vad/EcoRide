import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// VAPID Keys
const VAPID_PUBLIC_KEY = "BIvZxFD56q2yFyfqc-DWPUeduMsO_UwuCTB3_EzlQ4Yu_OYXiEXzdZRe4a8tYXdvXZwGb-kym8cDb7TrPEjdPV4";
const VAPID_PRIVATE_KEY = "QUHv8xG0Zp6dwGPdpUMyPqc6Yb9vvD5ADMRHCQeCFNE";

webpush.setVapidDetails(
  "mailto:support@ecoride.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
};

export async function POST(req: Request) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  try {
    const { userId, title, body, url } = await req.json();
    if (!userId || !title || !body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch current subscriptions list
    const { data } = await supabase
      .from("ecoride_state")
      .select("value")
      .eq("key", "push_subscriptions")
      .maybeSingle();

    if (!data || !data.value) {
      return NextResponse.json({ message: "No active push subscriptions found" });
    }

    const allSubs: Record<string, any[]> = data.value;
    const userSubs = allSubs[userId] || [];

    if (userSubs.length === 0) {
      return NextResponse.json({ message: "No subscriptions registered for user " + userId });
    }

    const failedSubscriptions: any[] = [];
    const payload = JSON.stringify({ title, body, url: url || "/" });

    // 2. Dispatch push messages in parallel
    const sendPromises = userSubs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload);
      } catch (err: any) {
        console.warn(`Failed to send push notification to user ${userId}:`, err.statusCode, err.message);
        // Status code 410 or 404 indicates the subscription has expired or is no longer valid
        if (err.statusCode === 410 || err.statusCode === 404) {
          failedSubscriptions.push(sub);
        }
      }
    });

    await Promise.all(sendPromises);

    // 3. Clean up expired subscriptions if any failed
    if (failedSubscriptions.length > 0) {
      const remainingSubs = userSubs.filter(
        (sub) => !failedSubscriptions.some((failed) => failed.endpoint === sub.endpoint)
      );
      if (remainingSubs.length === 0) {
        delete allSubs[userId];
      } else {
        allSubs[userId] = remainingSubs;
      }

      await supabase
        .from("ecoride_state")
        .upsert(
          { key: "push_subscriptions", value: allSubs, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
    }

    return NextResponse.json({ success: true, dispatched: userSubs.length - failedSubscriptions.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
