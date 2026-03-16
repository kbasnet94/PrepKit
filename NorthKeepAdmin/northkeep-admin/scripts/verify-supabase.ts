/**
 * Quick verification that Supabase connection works.
 * Run: npx tsx scripts/verify-supabase.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
try {
  const envLocal = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
  for (const line of envLocal.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  // .env.local may not exist
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

async function verify() {
  console.log("Verifying Supabase connection...\n");

  const tables = ["guide_categories", "guide_parent_topics", "guides", "guide_versions", "guide_releases"] as const;

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
    if (error) {
      console.error(`  ${table}: FAILED - ${error.message}`);
    } else {
      console.log(`  ${table}: OK (${count ?? 0} rows)`);
    }
  }

  console.log("\nSupabase connection verified.");
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
});
