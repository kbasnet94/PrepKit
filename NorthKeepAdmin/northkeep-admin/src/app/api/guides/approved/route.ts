import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const releaseId = searchParams.get("releaseId");
  const supabase = createAdminClient();

  const { data: versions } = await supabase
    .from("guide_versions")
    .select(`
      id, guide_id, version_number, title, review_status,
      guides!guide_id(slug),
      guide_categories!guide_versions_category_id_fkey(slug, name)
    `)
    .in("review_status", ["approved", "published"])
    .order("version_number", { ascending: false })
    .limit(500);

  let data = versions ?? [];

  // Deduplicate: keep best version per guide
  // Priority: "approved" over "published" (newer work), then highest version_number
  const byGuide = new Map<string, (typeof data)[number]>();
  for (const v of data) {
    const existing = byGuide.get(v.guide_id);
    if (!existing) {
      byGuide.set(v.guide_id, v);
    } else {
      const existingIsApproved = existing.review_status === "approved";
      const currentIsApproved = v.review_status === "approved";
      // Prefer approved over published
      if (currentIsApproved && !existingIsApproved) {
        byGuide.set(v.guide_id, v);
      } else if (currentIsApproved === existingIsApproved && v.version_number > existing.version_number) {
        byGuide.set(v.guide_id, v);
      }
    }
  }
  data = Array.from(byGuide.values());

  if (releaseId && data.length) {
    const { data: existing } = await supabase
      .from("guide_release_items")
      .select("guide_id")
      .eq("release_id", releaseId);
    const inRelease = new Set((existing ?? []).map((r) => r.guide_id));
    data = data.filter((v) => !inRelease.has(v.guide_id));
  }

  return NextResponse.json(data);
}
