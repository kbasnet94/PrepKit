/**
 * Import guides from guides_master_export.normalized.json into Supabase.
 * Usage: npx tsx scripts/import-from-normalized.ts [path-to-json]
 * Default path: data/guides_master_export.normalized.json
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)
 * Run the migration SQL in Supabase first.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { readFileSync } from "fs";
import { resolve } from "path";

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
const SUPABASE_URL = supabaseUrl as string;
const SUPABASE_KEY = supabaseKey as string;

const jsonPath = process.argv[2] ?? path.join(process.cwd(), "data", "guides_master_export.normalized.json");

interface NormalizedSourceRef {
  title: string;
  organization?: string;
  url?: string;
  whyUseful?: string;
}

interface NormalizedGuide {
  id: string;
  slug: string;
  title: string;
  category: string;
  parentTopic: string;
  layer: string;
  guideType: string;
  summary: string | null;
  quickAnswer: string | null;
  whenToUse: string[];
  preferredAction: string | null;
  backupAction: string | null;
  stepByStepActions: string[];
  warnings: string[];
  whatNotToDo: string[];
  redFlags: string[];
  preparednessTips: string[];
  sourceQuality: string | null;
  contentStatus: string | null;
  integrationDecision: string | null;
  upgradesGuide: string | null;
  relatedGuides: string[];
  sourceReferences: NormalizedSourceRef[];
  appTags: string[];
  notes: string | null;
}

interface NormalizedExport {
  guides: NormalizedGuide[];
}

const LAYERS = ["action", "scenario", "preparedness", "reference"] as const;
const GUIDE_TYPES = ["action_card", "scenario_guide", "preparedness_guide", "reference_guide"] as const;
const SOURCE_QUALITIES = ["strong", "mixed", "weak"] as const;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function mapSourceQuality(s: string | null): "strong" | "mixed" | "weak" | null {
  if (!s) return null;
  const v = s.toLowerCase();
  if (SOURCE_QUALITIES.includes(v as "strong" | "mixed" | "weak")) return v as "strong" | "mixed" | "weak";
  return "mixed";
}

async function main() {
  if (!fs.existsSync(jsonPath)) {
    console.error("File not found:", jsonPath);
    console.error("Copy guides_master_export.normalized.json to data/ or pass path as first argument.");
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, "utf-8");
  const data: NormalizedExport = JSON.parse(raw);
  const guides = data.guides;

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const categorySlugToId = new Map<string, string>();
  const parentTopicKeyToId = new Map<string, string>();

  // 1) Collect unique categories and parent topics
  const categorySlugs = new Set<string>();
  const parentTopicsByCategory = new Map<string, Set<string>>();
  for (const g of guides) {
    categorySlugs.add(g.category);
    if (!parentTopicsByCategory.has(g.category)) {
      parentTopicsByCategory.set(g.category, new Set());
    }
    parentTopicsByCategory.get(g.category)!.add(g.parentTopic);
  }

  // 2) Insert categories
  let sortOrder = 0;
  for (const slug of Array.from(categorySlugs).sort()) {
    const name = slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const { data: row, error } = await supabase
      .from("guide_categories")
      .insert({ slug, name, description: null, sort_order: sortOrder++, is_active: true })
      .select("id")
      .single();
    if (error) {
      const existing = await supabase.from("guide_categories").select("id").eq("slug", slug).single();
      if (existing.data) categorySlugToId.set(slug, existing.data.id);
      else throw error;
    } else if (row) categorySlugToId.set(slug, row.id);
  }
  console.log("Categories:", categorySlugToId.size);

  // 3) Insert parent topics
  for (const [catSlug, topicNames] of parentTopicsByCategory) {
    const categoryId = categorySlugToId.get(catSlug);
    if (!categoryId) continue;
    sortOrder = 0;
    for (const name of Array.from(topicNames).sort()) {
      const slug = slugify(name);
      const key = `${catSlug}:${slug}`;
      const { data: row, error } = await supabase
        .from("guide_parent_topics")
        .insert({ category_id: categoryId, slug, name, description: null, sort_order: sortOrder++, is_active: true })
        .select("id")
        .single();
      if (error) {
        const existing = await supabase.from("guide_parent_topics").select("id").eq("slug", slug).single();
        if (existing.data) parentTopicKeyToId.set(key, existing.data.id);
        else throw error;
      } else if (row) parentTopicKeyToId.set(key, row.id);
    }
  }
  console.log("Parent topics:", parentTopicKeyToId.size);

  // 4) Insert guides and first version
  const guideSlugToId = new Map<string, string>();
  const guideSlugToVersionId = new Map<string, string>();

  for (const g of guides) {
    const categoryId = categorySlugToId.get(g.category);
    const topicKey = `${g.category}:${slugify(g.parentTopic)}`;
    const parentTopicId = parentTopicKeyToId.get(topicKey);
    if (!categoryId || !parentTopicId) {
      console.warn("Skip guide (missing category/topic):", g.slug);
      continue;
    }

    const layer = LAYERS.includes(g.layer as (typeof LAYERS)[number]) ? g.layer : "reference";
    const guideType = GUIDE_TYPES.includes(g.guideType as (typeof GUIDE_TYPES)[number]) ? g.guideType : "reference_guide";
    const sourceQuality = mapSourceQuality(g.sourceQuality);

    const { data: guideRow, error: guideErr } = await supabase
      .from("guides")
      .insert({
        legacy_id: g.id,
        slug: g.slug,
        title: g.title,
        category_id: categoryId,
        parent_topic_id: parentTopicId,
        is_active: true,
      })
      .select("id")
      .single();

    if (guideErr) {
      const existing = await supabase.from("guides").select("id").eq("slug", g.slug).single();
      if (existing.data) {
        guideSlugToId.set(g.slug, existing.data.id);
        const ver = await supabase.from("guide_versions").select("id").eq("guide_id", existing.data.id).order("version_number", { ascending: false }).limit(1).single();
        if (ver.data) guideSlugToVersionId.set(g.slug, ver.data.id);
      } else throw guideErr;
      continue;
    }
    if (!guideRow) continue;
    guideSlugToId.set(g.slug, guideRow.id);

    const versionPayload = {
      guide_id: guideRow.id,
      version_number: 1,
      title: g.title,
      category_id: categoryId,
      parent_topic_id: parentTopicId,
      layer,
      guide_type: guideType,
      summary: g.summary ?? null,
      quick_answer: g.quickAnswer ?? null,
      when_to_use: Array.isArray(g.whenToUse) ? g.whenToUse : [],
      preferred_action: g.preferredAction ?? null,
      backup_action: g.backupAction ?? null,
      step_by_step_actions: Array.isArray(g.stepByStepActions) ? g.stepByStepActions : [],
      warnings: Array.isArray(g.warnings) ? g.warnings : [],
      what_not_to_do: Array.isArray(g.whatNotToDo) ? g.whatNotToDo : [],
      red_flags: Array.isArray(g.redFlags) ? g.redFlags : [],
      preparedness_tips: Array.isArray(g.preparednessTips) ? g.preparednessTips : [],
      source_quality: sourceQuality,
      content_status: g.contentStatus ?? null,
      integration_decision: g.integrationDecision ?? null,
      upgrades_guide: g.upgradesGuide ?? null,
      related_guides: Array.isArray(g.relatedGuides) ? g.relatedGuides : [],
      source_references: Array.isArray(g.sourceReferences) ? g.sourceReferences : [],
      app_tags: Array.isArray(g.appTags) ? g.appTags : [],
      notes: g.notes ?? null,
      review_status: "published" as const,
      change_summary: "Initial import",
    };

    const { data: versionRow, error: versionErr } = await supabase
      .from("guide_versions")
      .insert(versionPayload)
      .select("id")
      .single();
    if (versionErr) throw versionErr;
    if (versionRow) {
      guideSlugToVersionId.set(g.slug, versionRow.id);
      await supabase.from("guides").update({ current_published_version_id: versionRow.id }).eq("id", guideRow.id);
    }
  }

  console.log("Guides/versions:", guideSlugToId.size);

  // 5) Create release v1.0.0 and add all published guide versions
  const { data: releaseRow, error: releaseErr } = await supabase
    .from("guide_releases")
    .insert({
      release_name: "Initial import",
      semantic_version: "v1.0.0",
      status: "published",
      release_notes: "Initial import from normalized guide export.",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (releaseErr) {
    const existing = await supabase.from("guide_releases").select("id").eq("semantic_version", "v1.0.0").single();
    if (existing.data) {
      console.log("Release v1.0.0 already exists.");
    } else throw releaseErr;
  } else if (releaseRow) {
    for (const [slug, versionId] of guideSlugToVersionId) {
      const guideId = guideSlugToId.get(slug);
      if (!guideId) continue;
      await supabase.from("guide_release_items").upsert(
        { release_id: releaseRow.id, guide_id: guideId, guide_version_id: versionId },
        { onConflict: "release_id,guide_id" }
      );
    }
    console.log("Release v1.0.0 created with", guideSlugToVersionId.size, "guides.");
  }

  console.log("\nImport summary:");
  console.log("  Categories:", categorySlugToId.size);
  console.log("  Parent topics:", parentTopicKeyToId.size);
  console.log("  Guides:", guideSlugToId.size);
  console.log("  Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
