import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  // 1. Mark the release itself as published
  const { data, error } = await supabase
    .from("guide_releases")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  // 2. Fetch all guide_version_ids in this release
  const { data: items, error: itemsError } = await supabase
    .from("guide_release_items")
    .select("guide_version_id")
    .eq("release_id", id);

  if (itemsError) {
    return NextResponse.json({ message: itemsError.message }, { status: 400 });
  }

  // 3. Flip every included guide version to review_status = "published"
  const versionIds = items.map((item) => item.guide_version_id).filter(Boolean);
  if (versionIds.length > 0) {
    const { error: versionsError } = await supabase
      .from("guide_versions")
      .update({ review_status: "published" })
      .in("id", versionIds);

    if (versionsError) {
      return NextResponse.json({ message: versionsError.message }, { status: 400 });
    }

    // 4. Auto-archive any superseded versions of the same guides
    // (other versions of the same guide_id that are not in this release)
    const { data: guideRows } = await supabase
      .from("guide_versions")
      .select("guide_id")
      .in("id", versionIds);

    const guideIds = [...new Set((guideRows ?? []).map((r) => r.guide_id).filter(Boolean))];
    if (guideIds.length > 0) {
      const { error: archiveError } = await supabase
        .from("guide_versions")
        .update({ review_status: "archived" })
        .in("guide_id", guideIds)
        .not("id", "in", `(${versionIds.join(",")})`)
        .not("review_status", "in", "(archived,published)");

      if (archiveError) {
        // Non-fatal: log but don't fail the publish
        console.error("Auto-archive error:", archiveError.message);
      }
    }
  }

  return NextResponse.json(data);
}
