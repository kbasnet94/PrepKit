import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: release, error: releaseError } = await supabase
    .from("guide_releases")
    .select("id, semantic_version, release_name, release_notes")
    .eq("id", id)
    .single();

  if (releaseError || !release) {
    return NextResponse.json({ message: "Release not found" }, { status: 404 });
  }

  const { data: items } = await supabase
    .from("guide_release_items")
    .select("guide_version_id")
    .eq("release_id", id);

  if (!items?.length) {
    return NextResponse.json({ message: "No guides in release" }, { status: 400 });
  }

  const versionIds = items.map((i) => i.guide_version_id);
  const { data: versions } = await supabase
    .from("guide_versions")
    .select(
      `
      id,
      guide_id,
      version_number,
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
      source_references,
      related_guides,
      app_tags,
      response_role,
      constraint_tags,
      blocked_by_constraints,
      alternative_to_guide_slugs,
      guides!guide_id(slug)
    `
    )
    .in("id", versionIds);

  const appReadyGuides = (versions ?? []).map((v) => {
    const g = Array.isArray(v.guides) ? v.guides[0] : v.guides;
    const slug = g && typeof g === "object" && "slug" in g ? (g as { slug: string }).slug : "";
    const out: Record<string, unknown> = {
      id: slug,
      slug,
      title: v.title,
      layer: v.layer,
      guideType: v.guide_type,
      summary: v.summary,
      quickAnswer: v.quick_answer,
      whenToUse: v.when_to_use ?? [],
      preferredAction: v.preferred_action,
      backupAction: v.backup_action,
      stepByStepActions: v.step_by_step_actions ?? [],
      warnings: v.warnings ?? [],
      whatNotToDo: v.what_not_to_do ?? [],
      redFlags: v.red_flags ?? [],
      preparednessTips: v.preparedness_tips ?? [],
      sourceQuality: v.source_quality,
      sourceReferences: v.source_references ?? [],
      relatedGuides: v.related_guides ?? [],
      appTags: v.app_tags ?? [],
    };
    const ext = v as { response_role?: string; constraint_tags?: string[]; blocked_by_constraints?: string[]; alternative_to_guide_slugs?: string[] };
    if (ext.response_role) out.responseRole = ext.response_role;
    if (Array.isArray(ext.constraint_tags) && ext.constraint_tags.length) out.constraintTags = ext.constraint_tags;
    if (Array.isArray(ext.blocked_by_constraints) && ext.blocked_by_constraints.length) out.blockedByConstraints = ext.blocked_by_constraints;
    if (Array.isArray(ext.alternative_to_guide_slugs) && ext.alternative_to_guide_slugs.length) out.alternativeToGuideSlugs = ext.alternative_to_guide_slugs;
    return out;
  });

  const bundle = {
    semantic_version: release.semantic_version,
    generated_at: new Date().toISOString(),
    total_guides: appReadyGuides.length,
    guides: appReadyGuides,
  };

  const manifest = {
    semantic_version: release.semantic_version,
    release_name: release.release_name,
    published_at: new Date().toISOString(),
    total_guides: appReadyGuides.length,
    release_notes: release.release_notes ?? undefined,
  };

  return NextResponse.json({
    manifest,
    bundle,
    message: "Use these in your app. Optionally upload to Supabase Storage and set manifest_path / bundle_path on the release.",
  });
}
