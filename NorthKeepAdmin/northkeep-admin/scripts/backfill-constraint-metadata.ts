/**
 * Backfill constraint-aware metadata from JSON into Supabase.
 * Updates ONLY: response_role, constraint_tags, blocked_by_constraints, alternative_to_guide_slugs
 * on the latest version of each matching guide. Does not overwrite other content.
 *
 * Usage: npx tsx scripts/backfill-constraint-metadata.ts [path-to-json] [--dry-run]
 *   Default path: data/constraint_metadata_patch.json
 *   JSON format: { guides: [...] } or [...] with objects having slug + optional:
 *   responseRole, constraintTags, blockedByConstraints, alternativeToGuideSlugs
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { readFileSync } from "fs";
import { resolve } from "path";
import { validateConstraintTags } from "../src/lib/constants/constraint-tags";
import { isValidResponseRole } from "../src/lib/constants/response-roles";

// Load .env.local
try {
  const envLocal = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
  for (const line of envLocal.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  // .env.local may not exist
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl as string, supabaseKey as string);

interface SourceGuide {
  slug: string;
  responseRole?: string;
  constraintTags?: string[];
  blockedByConstraints?: string[];
  alternativeToGuideSlugs?: string[];
}

interface Report {
  updated: number;
  skipped: number;
  notFound: string[];
  invalidTags: string[];
  invalidResponseRoles: string[];
  brokenAlternativeSlugs: { slug: string; ref: string }[];
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const jsonPath = args.find((a) => !a.startsWith("--")) ?? path.join(process.cwd(), "data", "constraint_metadata_patch.json");

  if (dryRun) console.log("--- DRY RUN (no changes will be made) ---\n");

  let raw: string;
  try {
    raw = fs.readFileSync(jsonPath, "utf-8");
  } catch (e) {
    console.error("Failed to read file:", jsonPath, e);
    process.exit(1);
  }

  const parsed = JSON.parse(raw) as { guides?: SourceGuide[] } | SourceGuide[];
  const guides: SourceGuide[] = Array.isArray(parsed) ? parsed : parsed.guides ?? [];
  if (!guides.length) {
    console.log("No guides in JSON. Exiting.");
    return;
  }

  const slugToGuide = new Map<string, SourceGuide>();
  for (const g of guides) {
    if (g?.slug) slugToGuide.set(g.slug, g);
  }

  const { data: allGuides } = await supabase.from("guides").select("slug");
  const validSlugs = new Set((allGuides ?? []).map((r) => r.slug));

  const report: Report = {
    updated: 0,
    skipped: 0,
    notFound: [],
    invalidTags: [],
    invalidResponseRoles: [],
    brokenAlternativeSlugs: [],
  };

  for (const [slug, source] of slugToGuide) {
    const { data: guide } = await supabase
      .from("guides")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!guide) {
      report.notFound.push(slug);
      console.log(`  [not found] ${slug}`);
      continue;
    }

    const { data: latestVersion } = await supabase
      .from("guide_versions")
      .select("id, version_number")
      .eq("guide_id", guide.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    if (!latestVersion) {
      report.skipped++;
      console.log(`  [skip] ${slug}: no version`);
      continue;
    }

    const responseRole =
      source.responseRole && isValidResponseRole(source.responseRole)
        ? source.responseRole
        : null;
    if (source.responseRole && !responseRole) {
      report.invalidResponseRoles.push(`${slug}: "${source.responseRole}"`);
    }

    const ctResult = validateConstraintTags(Array.isArray(source.constraintTags) ? source.constraintTags : []);
    const bcResult = validateConstraintTags(Array.isArray(source.blockedByConstraints) ? source.blockedByConstraints : []);
    if (ctResult.invalid.length) report.invalidTags.push(...ctResult.invalid);
    if (bcResult.invalid.length) report.invalidTags.push(...bcResult.invalid);

    const altSlugs = Array.isArray(source.alternativeToGuideSlugs) ? source.alternativeToGuideSlugs : [];
    const validAltSlugs = altSlugs.filter((s) => typeof s === "string" && s.trim());
    for (const ref of validAltSlugs) {
      if (!validSlugs.has(ref)) report.brokenAlternativeSlugs.push({ slug, ref });
    }

    const hasAny =
      responseRole !== null ||
      ctResult.valid.length > 0 ||
      bcResult.valid.length > 0 ||
      validAltSlugs.length > 0;

    if (!hasAny) {
      report.skipped++;
      continue;
    }

    if (dryRun) {
      report.updated++;
      console.log(`  [would update] ${slug} v${latestVersion.version_number}`);
      continue;
    }

    const { error } = await supabase
      .from("guide_versions")
      .update({
        response_role: responseRole,
        constraint_tags: ctResult.valid,
        blocked_by_constraints: bcResult.valid,
        alternative_to_guide_slugs: validAltSlugs,
        updated_at: new Date().toISOString(),
      })
      .eq("id", latestVersion.id);

    if (error) {
      console.error(`  [error] ${slug}:`, error.message);
      continue;
    }

    report.updated++;
    console.log(`  [ok] ${slug} v${latestVersion.version_number}`);
  }

  const invalidTagsUnique = [...new Set(report.invalidTags)];
  const invalidRolesUnique = [...new Set(report.invalidResponseRoles)];

  console.log("\n--- Summary ---");
  console.log(`Updated: ${report.updated}`);
  console.log(`Skipped: ${report.skipped}`);
  console.log(`Not found: ${report.notFound.length} (${report.notFound.slice(0, 5).join(", ")}${report.notFound.length > 5 ? "…" : ""})`);
  if (invalidTagsUnique.length) console.log(`Invalid tags: ${invalidTagsUnique.join(", ")}`);
  if (invalidRolesUnique.length) console.log(`Invalid response roles: ${invalidRolesUnique.join("; ")}`);
  if (report.brokenAlternativeSlugs.length) {
    console.log(`Broken alternative refs: ${report.brokenAlternativeSlugs.length}`);
    report.brokenAlternativeSlugs.slice(0, 5).forEach(({ slug, ref }) => console.log(`  ${slug} → ${ref}`));
    if (report.brokenAlternativeSlugs.length > 5) console.log("  …");
  }
  console.log(`Total in JSON: ${slugToGuide.size}`);
  if (dryRun) console.log("\n(Dry run — no changes were made. Remove --dry-run to apply.)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
