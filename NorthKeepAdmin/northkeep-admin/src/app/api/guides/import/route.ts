import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { NormalizedGuide } from "@/types/normalized-export";
import { validateConstraintTags } from "@/lib/constants/constraint-tags";
import { isValidResponseRole } from "@/lib/constants/response-roles";

export type DiffField = {
  key: string;
  label: string;
  type: "text" | "array" | "sources";
  incoming: unknown;
  current: unknown;
  changed: boolean;
};

export type ImportPreviewData = {
  slug: string;
  isNew: boolean;
  guideId?: string;
  currentVersionNumber?: number;
  diff: DiffField[];
  hasChanges: boolean;
};

const VALID_LAYERS = ["action", "scenario", "preparedness", "reference"] as const;
const VALID_TYPES = ["action_card", "scenario_guide", "preparedness_guide", "reference_guide"] as const;
const VALID_QUALITIES = ["strong", "mixed", "weak"] as const;

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function arrEq(a: unknown[], b: unknown[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildDiff(incoming: NormalizedGuide, current: Record<string, any> | null): { fields: DiffField[]; hasChanges: boolean } {
  const fields: DiffField[] = [];

  const textFields: { inKey: keyof NormalizedGuide; curKey: string; label: string }[] = [
    { inKey: "title", curKey: "title", label: "Title" },
    { inKey: "summary", curKey: "summary", label: "Summary" },
    { inKey: "quickAnswer", curKey: "quick_answer", label: "Quick answer" },
    { inKey: "preferredAction", curKey: "preferred_action", label: "Preferred action" },
    { inKey: "backupAction", curKey: "backup_action", label: "Backup action" },
    { inKey: "layer", curKey: "layer", label: "Layer" },
    { inKey: "guideType", curKey: "guide_type", label: "Guide type" },
    { inKey: "sourceQuality", curKey: "source_quality", label: "Source quality" },
    { inKey: "contentStatus", curKey: "content_status", label: "Content status" },
    { inKey: "notes", curKey: "notes", label: "Notes" },
    { inKey: "responseRole", curKey: "response_role", label: "Response role" },
  ];

  for (const f of textFields) {
    const inVal = (incoming[f.inKey] as string | null | undefined) ?? null;
    const curVal = current ? ((current[f.curKey] as string | null | undefined) ?? null) : null;
    fields.push({ key: f.inKey, label: f.label, type: "text", incoming: inVal, current: curVal, changed: inVal !== curVal });
  }

  const arrayFields: { inKey: keyof NormalizedGuide; curKey: string; label: string }[] = [
    { inKey: "whenToUse", curKey: "when_to_use", label: "When to use" },
    { inKey: "stepByStepActions", curKey: "step_by_step_actions", label: "Steps" },
    { inKey: "warnings", curKey: "warnings", label: "Warnings" },
    { inKey: "whatNotToDo", curKey: "what_not_to_do", label: "What not to do" },
    { inKey: "redFlags", curKey: "red_flags", label: "Red flags" },
    { inKey: "preparednessTips", curKey: "preparedness_tips", label: "Preparedness tips" },
    { inKey: "relatedGuides", curKey: "related_guides", label: "Related guides" },
    { inKey: "appTags", curKey: "app_tags", label: "App tags" },
    { inKey: "constraintTags", curKey: "constraint_tags", label: "Constraint tags" },
    { inKey: "blockedByConstraints", curKey: "blocked_by_constraints", label: "Blocked by constraints" },
    { inKey: "alternativeToGuideSlugs", curKey: "alternative_to_guide_slugs", label: "Alternative to guide slugs" },
  ];

  for (const f of arrayFields) {
    const inVal = Array.isArray(incoming[f.inKey]) ? (incoming[f.inKey] as unknown[]) : [];
    const curVal = current ? (Array.isArray(current[f.curKey]) ? (current[f.curKey] as unknown[]) : []) : [];
    fields.push({ key: f.inKey, label: f.label, type: "array", incoming: inVal, current: curVal, changed: !arrEq(inVal, curVal) });
  }

  const inSrc = Array.isArray(incoming.sourceReferences) ? incoming.sourceReferences : [];
  const curSrc = current ? (Array.isArray(current.source_references) ? current.source_references : []) : [];
  fields.push({ key: "sourceReferences", label: "Source references", type: "sources", incoming: inSrc, current: curSrc, changed: !arrEq(inSrc, curSrc) });

  // images: AI-authored image recommendations (storageUrl null until admin uploads)
  const inImgs = Array.isArray(incoming.images) ? incoming.images : [];
  const curImgs = current ? (Array.isArray(current.images) ? current.images : []) : [];
  fields.push({ key: "images", label: "Images", type: "array", incoming: inImgs, current: curImgs, changed: !arrEq(inImgs, curImgs) });

  return { fields, hasChanges: fields.some((f) => f.changed) };
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "preview";
  const body = await request.json();
  const guide = body.guide as NormalizedGuide;

  if (!guide?.slug || !guide?.title) {
    return NextResponse.json({ error: "Missing required fields: slug, title" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: existingGuide } = await supabase
    .from("guides")
    .select("id, slug, title, current_published_version_id")
    .eq("slug", guide.slug)
    .single();

  let latestVersion = null;
  if (existingGuide) {
    const { data } = await supabase
      .from("guide_versions")
      .select("*")
      .eq("guide_id", existingGuide.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();
    latestVersion = data;
  }

  if (action === "preview") {
    const diff = buildDiff(guide, latestVersion);
    const result: ImportPreviewData = {
      slug: guide.slug,
      isNew: !existingGuide,
      guideId: existingGuide?.id,
      currentVersionNumber: latestVersion?.version_number,
      diff: diff.fields,
      hasChanges: diff.hasChanges,
    };
    return NextResponse.json(result);
  }

  if (action === "save") {
    const catSlug = guide.category;
    const catName = catSlug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    let { data: catRow } = await supabase.from("guide_categories").select("id").eq("slug", catSlug).single();
    if (!catRow) {
      const { data: newCat } = await supabase
        .from("guide_categories")
        .insert({ slug: catSlug, name: catName, is_active: true })
        .select("id")
        .single();
      catRow = newCat;
    }

    const topicSlug = slugify(guide.parentTopic);
    let { data: topicRow } = await supabase.from("guide_parent_topics").select("id").eq("slug", topicSlug).single();
    if (!topicRow && catRow) {
      const { data: newTopic } = await supabase
        .from("guide_parent_topics")
        .insert({ category_id: catRow.id, slug: topicSlug, name: guide.parentTopic, is_active: true })
        .select("id")
        .single();
      topicRow = newTopic;
    }

    const layer = VALID_LAYERS.includes(guide.layer as (typeof VALID_LAYERS)[number]) ? guide.layer : "reference";
    const guideType = VALID_TYPES.includes(guide.guideType as (typeof VALID_TYPES)[number]) ? guide.guideType : "reference_guide";
    const sourceQuality = VALID_QUALITIES.includes(guide.sourceQuality as (typeof VALID_QUALITIES)[number])
      ? guide.sourceQuality
      : null;

    let guideId = existingGuide?.id;
    let versionNumber = (latestVersion?.version_number ?? 0) + 1;

    if (!guideId) {
      const { data: newGuide, error: guideErr } = await supabase
        .from("guides")
        .insert({
          legacy_id: guide.id ?? null,
          slug: guide.slug,
          title: guide.title,
          category_id: catRow?.id ?? null,
          parent_topic_id: topicRow?.id ?? null,
          is_active: true,
        })
        .select("id")
        .single();
      if (guideErr || !newGuide) {
        return NextResponse.json({ error: guideErr?.message ?? "Failed to create guide" }, { status: 400 });
      }
      guideId = newGuide.id;
      versionNumber = 1;
    }

    const responseRole = guide.responseRole && isValidResponseRole(guide.responseRole) ? guide.responseRole : null;
    const ctResult = validateConstraintTags(guide.constraintTags ?? []);
    const bcResult = validateConstraintTags(guide.blockedByConstraints ?? []);
    const altSlugs = Array.isArray(guide.alternativeToGuideSlugs) ? guide.alternativeToGuideSlugs : [];
    const { data: allSlugs } = await supabase.from("guides").select("slug");
    const validSlugs = new Set((allSlugs ?? []).map((r) => r.slug));
    const validAltSlugs = altSlugs.filter((s) => typeof s === "string" && s.trim());
    const brokenAltSlugs = validAltSlugs.filter((s) => !validSlugs.has(s));

    const versionPayload = {
      guide_id: guideId,
      version_number: versionNumber,
      title: guide.title,
      category_id: catRow?.id ?? null,
      parent_topic_id: topicRow?.id ?? null,
      layer,
      guide_type: guideType,
      summary: guide.summary ?? null,
      quick_answer: guide.quickAnswer ?? null,
      when_to_use: guide.whenToUse ?? [],
      preferred_action: guide.preferredAction ?? null,
      backup_action: guide.backupAction ?? null,
      step_by_step_actions: guide.stepByStepActions ?? [],
      warnings: guide.warnings ?? [],
      what_not_to_do: guide.whatNotToDo ?? [],
      red_flags: guide.redFlags ?? [],
      preparedness_tips: guide.preparednessTips ?? [],
      source_quality: sourceQuality,
      content_status: guide.contentStatus ?? null,
      integration_decision: guide.integrationDecision ?? null,
      upgrades_guide: guide.upgradesGuide ?? null,
      related_guides: guide.relatedGuides ?? [],
      source_references: guide.sourceReferences ?? [],
      app_tags: guide.appTags ?? [],
      notes: guide.notes ?? null,
      response_role: responseRole,
      constraint_tags: ctResult.valid,
      blocked_by_constraints: bcResult.valid,
      alternative_to_guide_slugs: validAltSlugs,
      images: Array.isArray(guide.images) ? guide.images : [],
      review_status: "draft",
      change_summary: (body.changeSummary as string) || "Imported from JSON upload",
    };

    const { data: newVersion, error: verErr } = await supabase
      .from("guide_versions")
      .insert(versionPayload)
      .select("id, version_number")
      .single();

    if (verErr || !newVersion) {
      return NextResponse.json({ error: verErr?.message ?? "Failed to create version" }, { status: 400 });
    }

    const warnings: string[] = [];
    if (ctResult.invalid.length) warnings.push(`Invalid constraint tags (filtered): ${ctResult.invalid.join(", ")}`);
    if (bcResult.invalid.length) warnings.push(`Invalid blocked_by_constraints (filtered): ${bcResult.invalid.join(", ")}`);
    if (brokenAltSlugs.length) warnings.push(`Alternative slugs not found (kept anyway): ${brokenAltSlugs.join(", ")}`);

    return NextResponse.json({
      slug: guide.slug,
      versionId: newVersion.id,
      versionNumber: newVersion.version_number,
      ...(warnings.length ? { warnings } : {}),
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
