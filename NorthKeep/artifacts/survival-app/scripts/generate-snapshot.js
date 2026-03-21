/**
 * generate-snapshot.js
 *
 * Generates assets/guides-snapshot.json from the latest published Supabase release.
 * Run before app store submissions to keep the bundled guide data current.
 *
 * Usage:
 *   node scripts/generate-snapshot.js
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// ─── Load credentials from .env ──────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(__dirname, "../.env");
  if (!fs.existsSync(envPath)) {
    console.error("ERROR: .env file not found at", envPath);
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf8").replace(/\r/g, "").split("\n");
  const env = {};
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  }
  return env;
}

// ─── Transform helpers (mirrors guide-transformer.ts) ────────────────────────

function mapLayer(guideType) {
  if (guideType === "action_card" || guideType === "action") return "action_card";
  if (guideType === "scenario_guide" || guideType === "scenario") return "scenario_guide";
  if (guideType === "preparedness_guide" || guideType === "preparedness") return "preparedness";
  if (guideType === "reference_guide" || guideType === "reference") return "reference_guide";
  return "reference_guide";
}

function mapCardType(guideType) {
  if (guideType === "preparedness_guide") return "checklist";
  return "practical";
}

function mapSourceQuality(q) {
  if (q === "strong") return "high";
  if (q === "mixed") return "needs_review";
  return q || "medium";
}

function mapContentStatus(s) {
  if (s === "reviewed") return "ready";
  return s || "ready";
}

function mapSourceRefs(refs, quality, status) {
  if (!Array.isArray(refs)) return [];
  return refs.map((r) => ({
    title: r.title || "",
    organization: r.organization || "",
    url: r.url || "",
    whyUseful: r.whyUseful || "",
    quality: quality === "strong" ? "high" : "medium",
    reviewStatus: status === "reviewed" ? "accepted" : "needs_review",
  }));
}

function transformRow(version, guideSlug, categorySlug, parentTopicName) {
  const guideType = version.guide_type || version.layer || "reference_guide";
  const whenToUse = Array.isArray(version.when_to_use)
    ? (version.when_to_use[0] ?? "")
    : (version.when_to_use ?? "");

  return {
    id: guideSlug,
    slug: guideSlug,
    title: version.title,
    layer: mapLayer(guideType),
    category: categorySlug || "",
    riskLevel: "medium",
    cardType: mapCardType(guideType),
    sourceQuality: mapSourceQuality(version.source_quality),
    contentStatus: mapContentStatus(version.content_status),
    parentTopic: parentTopicName ?? undefined,
    summary: version.summary || version.quick_answer || "",
    whenToUse,
    preferredOption: version.preferred_action ?? null,
    fallbackOption: version.backup_action ?? null,
    steps: Array.isArray(version.step_by_step_actions) ? version.step_by_step_actions : [],
    warnings: Array.isArray(version.warnings) ? version.warnings : [],
    whatNotToDo: Array.isArray(version.what_not_to_do) ? version.what_not_to_do : [],
    redFlags: Array.isArray(version.red_flags) ? version.red_flags : [],
    preparednessTips: Array.isArray(version.preparedness_tips) ? version.preparedness_tips : [],
    limitations: [],
    tags: Array.isArray(version.app_tags) ? version.app_tags : [],
    sourceReferences: mapSourceRefs(version.source_references || [], version.source_quality, version.content_status),
    derivedFrom: [],
    primarySourceDirection: "",
    sourceReferenceIds: [],
    responseRole: version.response_role ?? undefined,
    constraintTags: Array.isArray(version.constraint_tags) ? version.constraint_tags : undefined,
    blockedByConstraints: Array.isArray(version.blocked_by_constraints) ? version.blocked_by_constraints : undefined,
    alternativeToGuideSlugs: Array.isArray(version.alternative_to_guide_slugs) ? version.alternative_to_guide_slugs : undefined,
    images: Array.isArray(version.images)
      ? version.images.filter((img) => !!img.storageUrl).map((img) => ({
          key: img.key,
          caption: img.caption,
          altText: img.altText,
          associatedStepIndex: img.associatedStepIndex,
          storageUrl: img.storageUrl,
        }))
      : undefined,
    tools: Array.isArray(version.tools) && version.tools.length > 0
      ? version.tools.map((t) => ({
          id: t.id ?? "",
          name: t.name ?? "",
          category: t.category ?? "",
          description: t.description ?? t.context ?? "",
          optional: t.optional ?? false,
          context: t.context ?? null,
        }))
      : undefined,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const env = loadEnv();
  const supabaseUrl = env["EXPO_PUBLIC_SUPABASE_URL"];
  const supabaseKey = env["EXPO_PUBLIC_SUPABASE_ANON_KEY"];

  if (!supabaseUrl || !supabaseKey) {
    console.error("ERROR: Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Fetch latest published release
  console.log("Fetching latest published release...");
  const { data: releaseData, error: releaseError } = await supabase
    .from("guide_releases")
    .select("id, semantic_version, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .single();

  if (releaseError || !releaseData) {
    console.error("ERROR: Could not fetch latest release:", releaseError?.message);
    process.exit(1);
  }

  const releaseId = releaseData.id;
  const releaseVersion = releaseData.semantic_version;
  console.log(`Release: v${releaseVersion} (${releaseId})`);

  // 2. Fetch all guides in the release
  console.log("Fetching all guides...");
  const { data, error } = await supabase
    .from("guide_release_items")
    .select(`
      guide_versions!guide_release_items_guide_version_id_fkey (
        id,
        guide_id,
        title,
        layer,
        guide_type,
        summary,
        quick_answer,
        when_to_use,
        preferred_action,
        backup_action,
        step_by_step_actions,
        warnings,
        what_not_to_do,
        red_flags,
        preparedness_tips,
        source_quality,
        content_status,
        related_guides,
        source_references,
        app_tags,
        response_role,
        constraint_tags,
        blocked_by_constraints,
        alternative_to_guide_slugs,
        images,
        tools,
        guides!guide_versions_guide_id_fkey (slug),
        guide_categories!guide_versions_category_id_fkey (slug),
        guide_parent_topics!guide_versions_parent_topic_id_fkey (name)
      )
    `)
    .eq("release_id", releaseId);

  if (error || !data) {
    console.error("ERROR: Could not fetch guides:", error?.message);
    process.exit(1);
  }

  // 3. Transform each guide
  const guides = [];
  for (const item of data) {
    const version = item.guide_versions;
    if (!version) continue;

    const guideSlug = version.guides?.slug;
    const categorySlug = version.guide_categories?.slug;
    const parentTopicName = version.guide_parent_topics?.name ?? null;

    if (!guideSlug || !categorySlug) continue;

    const guideData = transformRow(version, guideSlug, categorySlug, parentTopicName);

    guides.push({
      slug: guideSlug,
      title: version.title,
      category: categorySlug,
      parentTopic: parentTopicName ?? undefined,
      layer: guideData.layer,
      guideData,
      supabaseVersionId: version.id,
      releaseVersion,
    });
  }

  console.log(`Transformed ${guides.length} guides.`);

  // 4. Write snapshot
  const snapshot = { releaseVersion, guides };
  const outPath = path.join(__dirname, "../assets/guides-snapshot.json");
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), "utf8");

  const sizeKb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`✓ Wrote ${outPath} (${sizeKb} KB)`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
