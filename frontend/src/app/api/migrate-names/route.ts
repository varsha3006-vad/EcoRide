import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Supabase connection details are missing in runtime env variables" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // 1. Fetch all rows in ecoride_state table
    const { data: rows, error: selectError } = await supabase
      .from("ecoride_state")
      .select("*");

    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    const results: string[] = [];

    // Helper function to perform replacement on JSON
    const replaceAllNames = (obj: any): any => {
      let str = JSON.stringify(obj);
      
      // Replace Rahul -> Alex
      str = str.replace(/"e-rahul"/g, '"e-alex"');
      str = str.replace(/"Rahul"/g, '"Alex"');
      str = str.replace(/"rahul@company.com"/g, '"alex@company.com"');

      // Replace Shail -> Chris
      str = str.replace(/"e-shail"/g, '"e-chris"');
      str = str.replace(/"Shail"/g, '"Chris"');
      str = str.replace(/"shail@company.com"/g, '"chris@company.com"');

      // Replace Leo -> Bob
      str = str.replace(/"e-leo"/g, '"e-bob"');
      str = str.replace(/"Leo"/g, '"Bob"');
      str = str.replace(/"leo@company.com"/g, '"bob@company.com"');

      // Replace Naveen -> Dan
      str = str.replace(/"e-naveen"/g, '"e-dan"');
      str = str.replace(/"Naveen"/g, '"Dan"');
      str = str.replace(/"naveen@company.com"/g, '"dan@company.com"');

      // Replace Varsha -> Elle
      str = str.replace(/"e-varsha"/g, '"e-elle"');
      str = str.replace(/"Varsha"/g, '"Elle"');
      str = str.replace(/"varsha@company.com"/g, '"elle@company.com"');

      return JSON.parse(str);
    };

    // 2. Loop and update each row
    for (const row of rows || []) {
      const updatedValue = replaceAllNames(row.value);
      const { error: upsertError } = await supabase
        .from("ecoride_state")
        .upsert(
          { key: row.key, value: updatedValue, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      
      if (upsertError) {
        results.push(`Failed for key ${row.key}: ${upsertError.message}`);
      } else {
        results.push(`Successfully migrated key ${row.key}`);
      }
    }

    return NextResponse.json({
      message: "Supabase name migration completed!",
      details: results
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
