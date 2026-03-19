/**
 * Archives thin-shell duplicate guides (Option A consolidation).
 *
 * For each archived guide:
 *   1. Sets review_status = "archived" on all versions
 *   2. Sets is_active = false on the guide record
 *   3. Appends a consolidation note to the survivor's latest active version
 *
 * Usage: npx tsx scripts/archive-duplicate-guides.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
try {
  const envLocal = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
  for (const line of envLocal.split("\n")) {
    const trimmedLine = line.replace(/\r$/, "");
    const match = trimmedLine.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
} catch { /* .env.local may not exist */ }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const OPTION_A_ARCHIVES: Array<{ archive: string; survivor: string }> = [
  {
    archive: "sanitation-waste-basics",
    survivor: "emergency-toilet-and-waste-management",
  },
];

async function archiveGuide(archiveSlug: string, survivorSlug: string) {
  console.log(`\nArchiving: ${archiveSlug} → survivor: ${survivorSlug}`);

  // 1. Find the guide to archive
  const { data: archiveGuide, error: archiveErr } = await supabase
    .from("guides")
    .select("id, slug, is_active")
    .eq("slug", archiveSlug)
    .single();

  if (archiveErr || !archiveGuide) {
    console.error(`  ✗ Guide not found: ${archiveSlug}`);
    return false;
  }

  // Idempotency: skip if already inactive
  if (!archiveGuide.is_active) {
    console.log(`  ⏭  ${archiveSlug} is already inactive, skipping`);
    return true;
  }

  // 2. Archive all versions
  const { error: versionsErr } = await supabase
    .from("guide_versions")
    .update({ review_status: "archived" })
    .eq("guide_id", archiveGuide.id)
    .neq("review_status", "archived");

  if (versionsErr) {
    console.error(`  ✗ Failed to archive versions: ${versionsErr.message}`);
    return false;
  }
  console.log(`  ✓ All versions archived`);

  // 3. Set guide inactive
  const { error: guideErr } = await supabase
    .from("guides")
    .update({ is_active: false })
    .eq("id", archiveGuide.id);

  if (guideErr) {
    console.error(`  ✗ Failed to deactivate guide: ${guideErr.message}`);
    return false;
  }
  console.log(`  ✓ Guide set inactive`);

  // 4. Find survivor's latest non-archived version
  const { data: survivorGuide, error: survivorGuideErr } = await supabase
    .from("guides")
    .select("id")
    .eq("slug", survivorSlug)
    .single();

  if (survivorGuideErr || !survivorGuide) {
    console.warn(`  ⚠  Survivor guide not found: ${survivorSlug} — skipping note append`);
    return true;
  }

  const { data: survivorVersion, error: survivorVersionErr } = await supabase
    .from("guide_versions")
    .select("id, version_number, notes")
    .eq("guide_id", survivorGuide.id)
    .neq("review_status", "archived")
    .order("version_number", { ascending: false })
    .maybeSingle();

  if (survivorVersionErr || !survivorVersion) {
    console.warn(`  ⚠  No active version found for survivor ${survivorSlug} — skipping note`);
    return true;
  }

  // 5. Append consolidation note
  const existingNotes = survivorVersion.notes ?? "";
  const consolidationNote = `Consolidated from ${archiveSlug} on 2026-03-19`;

  // Idempotency: skip if note already present
  if (existingNotes.includes(consolidationNote)) {
    console.log(`  ⏭  Consolidation note already present on survivor v${survivorVersion.version_number}`);
    return true;
  }

  const updatedNotes = existingNotes
    ? `${existingNotes}\n${consolidationNote}`
    : consolidationNote;

  const { error: noteErr } = await supabase
    .from("guide_versions")
    .update({ notes: updatedNotes })
    .eq("id", survivorVersion.id);

  if (noteErr) {
    console.warn(`  ⚠  Failed to append note: ${noteErr.message}`);
    // Non-fatal — archive already succeeded
    return true;
  }

  console.log(`  ✓ Consolidation note appended to survivor v${survivorVersion.version_number}`);
  return true;
}

async function main() {
  console.log("=== archive-duplicate-guides (Option A) ===\n");

  let succeeded = 0, failed = 0;

  for (const { archive, survivor } of OPTION_A_ARCHIVES) {
    const ok = await archiveGuide(archive, survivor);
    if (ok) succeeded++; else failed++;
  }

  console.log(`\nDone — Succeeded: ${succeeded}  Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
