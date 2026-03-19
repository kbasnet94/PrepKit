import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { versionIds, releaseName } = body as { versionIds: string[]; releaseName?: string };

  if (!Array.isArray(versionIds) || versionIds.length === 0) {
    return NextResponse.json({ message: "versionIds must be a non-empty array" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 1. Resolve guide_id for each version (needed for release items upsert)
  const { data: versionRows, error: versionRowsError } = await supabase
    .from("guide_versions")
    .select("id, guide_id")
    .in("id", versionIds);

  if (versionRowsError || !versionRows) {
    return NextResponse.json({ message: versionRowsError?.message ?? "Could not fetch guide versions" }, { status: 400 });
  }

  // 2. Create a new release
  const today = new Date().toISOString().slice(0, 10);
  const semanticVersion = `auto-${today}`;
  const name = releaseName ?? `Release ${today}`;

  const { data: release, error: releaseError } = await supabase
    .from("guide_releases")
    .insert({ release_name: name, semantic_version: semanticVersion, status: "draft" })
    .select()
    .single();

  if (releaseError || !release) {
    return NextResponse.json({ message: releaseError?.message ?? "Could not create release" }, { status: 400 });
  }

  const releaseId = release.id;

  // 3. Add all versions to the release (upsert on conflict guide_id)
  const releaseItems = versionRows.map((v) => ({
    release_id: releaseId,
    guide_version_id: v.id,
    guide_id: v.guide_id,
  }));

  const { error: itemsError } = await supabase
    .from("guide_release_items")
    .upsert(releaseItems, { onConflict: "release_id,guide_id" });

  if (itemsError) {
    return NextResponse.json({ message: itemsError.message }, { status: 400 });
  }

  // 4. Publish the release
  const { error: publishError } = await supabase
    .from("guide_releases")
    .update({ status: "published", published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", releaseId);

  if (publishError) {
    return NextResponse.json({ message: publishError.message }, { status: 400 });
  }

  // 5. Mark all included versions as published
  const { error: versionsError } = await supabase
    .from("guide_versions")
    .update({ review_status: "published" })
    .in("id", versionIds);

  if (versionsError) {
    return NextResponse.json({ message: versionsError.message }, { status: 400 });
  }

  // 6. Auto-archive superseded versions of the same guides
  const guideIds = [...new Set(versionRows.map((v) => v.guide_id).filter(Boolean))];
  if (guideIds.length > 0) {
    const { error: archiveError } = await supabase
      .from("guide_versions")
      .update({ review_status: "archived" })
      .in("guide_id", guideIds)
      .not("id", "in", `(${versionIds.join(",")})`)
      .not("review_status", "eq", "archived");

    if (archiveError) {
      console.error("Auto-archive error:", archiveError.message);
    }
  }

  return NextResponse.json({
    releaseId,
    releaseVersion: semanticVersion,
    guidesPublished: versionIds.length,
  });
}
