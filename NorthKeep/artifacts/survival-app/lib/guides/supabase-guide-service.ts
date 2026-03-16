import { supabase } from "@/lib/supabase";
import { transformSupabaseRow } from "./guide-transformer";
import type { Guide } from "./types";

export interface AvailableCategory {
  slug: string;
  name: string;
  guideCount: number;
}

export interface LatestRelease {
  id: string;
  semanticVersion: string;
  totalGuides: number;
  publishedAt: string | null;
}

// ─── Fetch latest published release ──────────────────────────────────────────

export async function fetchLatestRelease(): Promise<LatestRelease | null> {
  const { data, error } = await supabase
    .from("guide_releases")
    .select("id, semantic_version, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  // Count guides in this release
  const { count } = await supabase
    .from("guide_release_items")
    .select("*", { count: "exact", head: true })
    .eq("release_id", data.id);

  return {
    id: data.id,
    semanticVersion: data.semantic_version,
    totalGuides: count ?? 0,
    publishedAt: data.published_at,
  };
}

// ─── Fetch available categories ───────────────────────────────────────────────

export async function fetchAvailableCategories(): Promise<AvailableCategory[]> {
  const release = await fetchLatestRelease();
  if (!release) return [];

  // Get distinct categories from guides in this release
  const { data, error } = await supabase
    .from("guide_release_items")
    .select(`
      guide_versions!guide_release_items_guide_version_id_fkey (
        category_id,
        guide_categories!guide_versions_category_id_fkey (
          slug,
          name
        )
      )
    `)
    .eq("release_id", release.id);

  if (error || !data) return [];

  const categoryMap = new Map<string, { name: string; count: number }>();

  for (const item of data) {
    const version = (item as any).guide_versions;
    if (!version) continue;
    const cat = version.guide_categories;
    if (!cat?.slug) continue;
    const existing = categoryMap.get(cat.slug);
    if (existing) {
      existing.count++;
    } else {
      categoryMap.set(cat.slug, { name: cat.name, count: 1 });
    }
  }

  const CATEGORY_ORDER = [
    "natural_disasters",
    "medical_safety",
    "water_food",
    "preparedness",
    "communication",
    "navigation",
    "power_utilities_home_safety",
    "shelter_fire_warmth",
    "weather_environment",
    "core_skills",
  ];

  const result: AvailableCategory[] = [];
  for (const slug of CATEGORY_ORDER) {
    const cat = categoryMap.get(slug);
    if (cat) {
      result.push({ slug, name: cat.name, guideCount: cat.count });
      categoryMap.delete(slug);
    }
  }
  for (const [slug, cat] of categoryMap) {
    result.push({ slug, name: cat.name, guideCount: cat.count });
  }

  return result;
}

// ─── Fetch guides for a category ─────────────────────────────────────────────

export async function fetchGuidesByCategory(
  categorySlug: string,
  releaseId: string
): Promise<Array<{ guide: Guide; versionId: string }>> {
  const { data, error } = await supabase
    .from("guide_release_items")
    .select(`
      guide_version_id,
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
        guides!guide_versions_guide_id_fkey (
          slug
        ),
        guide_categories!guide_versions_category_id_fkey (
          slug
        ),
        guide_parent_topics!guide_versions_parent_topic_id_fkey (
          name
        )
      )
    `)
    .eq("release_id", releaseId)
    .eq("guide_versions.guide_categories.slug", categorySlug);

  if (error || !data) {
    throw new Error(`Failed to fetch guides for category ${categorySlug}: ${error?.message}`);
  }

  const results: Array<{ guide: Guide; versionId: string }> = [];

  for (const item of data) {
    const version = (item as any).guide_versions;
    if (!version) continue;

    const guideSlug = version.guides?.slug;
    const categorySlugFromJoin = version.guide_categories?.slug;
    const parentTopicName = version.guide_parent_topics?.name ?? null;

    if (!guideSlug || categorySlugFromJoin !== categorySlug) continue;

    const row = {
      id: version.id,
      guide_id: version.guide_id,
      title: version.title,
      layer: version.layer,
      guide_type: version.guide_type,
      summary: version.summary,
      quick_answer: version.quick_answer,
      when_to_use: version.when_to_use ?? [],
      preferred_action: version.preferred_action,
      backup_action: version.backup_action,
      step_by_step_actions: version.step_by_step_actions ?? [],
      warnings: version.warnings ?? [],
      what_not_to_do: version.what_not_to_do ?? [],
      red_flags: version.red_flags ?? [],
      preparedness_tips: version.preparedness_tips ?? [],
      source_quality: version.source_quality,
      content_status: version.content_status,
      related_guides: version.related_guides ?? [],
      source_references: version.source_references ?? [],
      app_tags: version.app_tags ?? [],
      response_role: version.response_role,
      constraint_tags: version.constraint_tags ?? [],
      blocked_by_constraints: version.blocked_by_constraints ?? [],
      alternative_to_guide_slugs: version.alternative_to_guide_slugs ?? [],
      slug: guideSlug,
      category_slug: categorySlugFromJoin,
      parent_topic_name: parentTopicName,
    };

    results.push({
      guide: transformSupabaseRow(row),
      versionId: version.id,
    });
  }

  return results;
}
