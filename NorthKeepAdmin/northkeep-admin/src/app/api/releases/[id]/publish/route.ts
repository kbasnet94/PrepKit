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
  }

  return NextResponse.json(data);
}
