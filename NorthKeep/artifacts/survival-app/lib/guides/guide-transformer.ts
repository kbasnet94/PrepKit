import type {
  Guide,
  GuideImage,
  GuideLayer,
  GuideSourceQuality,
  GuideContentStatus,
  GuideSourceRef,
  GuideTool,
} from "./types";

// ─── Field mappers (shared with seed-data.ts) ─────────────────────────────────

export function mapLayer(guideType: string): GuideLayer {
  if (guideType === "action_card" || guideType === "action") return "action_card";
  if (guideType === "scenario_guide" || guideType === "scenario") return "scenario_guide";
  if (guideType === "preparedness_guide" || guideType === "preparedness") return "preparedness";
  if (guideType === "reference_guide" || guideType === "reference") return "reference_guide";
  return "reference_guide";
}

export function mapCardType(guideType: string): string {
  if (guideType === "preparedness_guide") return "checklist";
  return "practical";
}

export function mapSourceQuality(q: string | null): GuideSourceQuality {
  if (q === "strong") return "high";
  if (q === "mixed") return "needs_review";
  return (q as GuideSourceQuality) || "medium";
}

export function mapContentStatus(s: string | null): GuideContentStatus {
  if (s === "reviewed") return "ready";
  return (s as GuideContentStatus) || "ready";
}

export function mapSourceRefs(refs: any[], quality: string | null, status: string | null): GuideSourceRef[] {
  if (!Array.isArray(refs)) return [];
  return refs.map((r: any) => ({
    title: r.title || "",
    organization: r.organization || "",
    url: r.url || "",
    whyUseful: r.whyUseful || "",
    quality: quality === "strong" ? "high" : "medium",
    reviewStatus: status === "reviewed" ? "accepted" : "needs_review",
  }));
}

// ─── Supabase row → Guide ─────────────────────────────────────────────────────
//
// The Supabase query joins guide_versions with guides, guide_categories,
// and guide_parent_topics and returns a flat row. This function maps that
// row to the mobile Guide type.
//
// Field name differences vs Guide type:
//   step_by_step_actions  → steps
//   preferred_action      → preferredOption
//   backup_action         → fallbackOption
//   app_tags              → tags
//   when_to_use           array → first element string
//   category_slug         → category
//   parent_topic_name     → parentTopic
//   source_quality        "strong"/"mixed" → "high"/"needs_review"
//   content_status        "reviewed" → "ready"

export interface SupabaseGuideRow {
  // From guide_versions
  id: string;
  guide_id: string;
  title: string;
  layer: string;
  guide_type: string;
  summary: string | null;
  quick_answer: string | null;
  when_to_use: string[];
  preferred_action: string | null;
  backup_action: string | null;
  step_by_step_actions: string[];
  warnings: string[];
  what_not_to_do: string[];
  red_flags: string[];
  preparedness_tips: string[];
  source_quality: string | null;
  content_status: string | null;
  related_guides: string[];
  source_references: any[];
  app_tags: string[];
  response_role: string | null;
  constraint_tags: string[];
  blocked_by_constraints: string[];
  alternative_to_guide_slugs: string[];
  images: GuideImage[] | null;
  tools: GuideTool[] | null;
  // From joins
  slug: string;
  category_slug: string;
  parent_topic_name: string | null;
}

export function transformSupabaseRow(row: SupabaseGuideRow): Guide {
  const whenToUse = Array.isArray(row.when_to_use)
    ? (row.when_to_use[0] ?? "")
    : (row.when_to_use ?? "");

  const guideType = row.guide_type || row.layer || "reference_guide";

  return {
    id: row.slug,
    slug: row.slug,
    title: row.title,
    layer: mapLayer(guideType),
    category: row.category_slug || "",
    riskLevel: "medium",
    cardType: mapCardType(guideType),
    sourceQuality: mapSourceQuality(row.source_quality),
    contentStatus: mapContentStatus(row.content_status),
    parentTopic: row.parent_topic_name ?? undefined,
    summary: row.summary || row.quick_answer || "",
    whenToUse,
    preferredOption: row.preferred_action ?? null,
    fallbackOption: row.backup_action ?? null,
    steps: Array.isArray(row.step_by_step_actions) ? row.step_by_step_actions : [],
    warnings: Array.isArray(row.warnings) ? row.warnings : [],
    whatNotToDo: Array.isArray(row.what_not_to_do) ? row.what_not_to_do : [],
    redFlags: Array.isArray(row.red_flags) ? row.red_flags : [],
    preparednessTips: Array.isArray(row.preparedness_tips) ? row.preparedness_tips : [],
    limitations: [],
    tags: Array.isArray(row.app_tags) ? row.app_tags : [],
    sourceReferences: mapSourceRefs(
      row.source_references || [],
      row.source_quality,
      row.content_status
    ),
    derivedFrom: [],
    primarySourceDirection: "",
    sourceReferenceIds: [],
    responseRole: (row.response_role as any) ?? undefined,
    constraintTags: Array.isArray(row.constraint_tags) ? row.constraint_tags : undefined,
    blockedByConstraints: Array.isArray(row.blocked_by_constraints) ? row.blocked_by_constraints : undefined,
    alternativeToGuideSlugs: Array.isArray(row.alternative_to_guide_slugs) ? row.alternative_to_guide_slugs : undefined,
    // Only include images that have been uploaded (storageUrl set) — pending images are admin-only
    images: Array.isArray(row.images)
      ? row.images.filter((img: GuideImage) => !!img.storageUrl).map((img: GuideImage) => ({
          key: img.key,
          caption: img.caption,
          altText: img.altText,
          associatedStepIndex: img.associatedStepIndex,
          storageUrl: img.storageUrl,
          // description intentionally excluded — admin-facing only
        }))
      : undefined,
    tools: Array.isArray(row.tools) && row.tools.length > 0 ? row.tools : undefined,
  };
}
