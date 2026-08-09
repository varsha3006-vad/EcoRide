import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const { userId, subscription } = await req.json();
    if (!userId || !subscription) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch current subscriptions list
    const { data, error } = await supabase
      .from("ecoride_state")
      .select("value")
      .eq("key", "push_subscriptions")
      .maybeSingle();

    let allSubs: Record<string, any[]> = {};
    if (data && data.value) {
      allSubs = data.value;
    }

    const userSubs = allSubs[userId] || [];
    
    // Check if subscription already exists (matching the endpoint)
    const exists = userSubs.some((sub: any) => sub.endpoint === subscription.endpoint);
    if (!exists) {
      userSubs.push(subscription);
    }
    allSubs[userId] = userSubs;

    // 2. Save back to database
    const { error: saveError } = await supabase
      .from("ecoride_state")
      .upsert(
        { key: "push_subscriptions", value: allSubs, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Fetch current subscriptions list
    const { data } = await supabase
      .from("ecoride_state")
      .select("value")
      .eq("key", "push_subscriptions")
      .maybeSingle();

    let allSubs: Record<string, any[]> = {};
    if (data && data.value) {
      allSubs = data.value;
    }

    // Remove subscriptions for this user
    delete allSubs[userId];

    // Save back to database
    const { error: saveError } = await supabase
      .from("ecoride_state")
      .upsert(
        { key: "push_subscriptions", value: allSubs, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
