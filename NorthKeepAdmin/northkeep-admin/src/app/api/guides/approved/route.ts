import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const releaseId = searchParams.get("releaseId");
  const supabase = createAdminClient();

  let data: { id: string; guide_id: string; version_number: number; title: string; guides: unknown }[] | null = null;
  const { data: versions } = await supabase
    .from("guide_versions")
    .select("id, guide_id, version_number, title, guides!guide_id(slug)")
    .eq("review_status", "approved")
    .order("updated_at", { ascending: false })
    .limit(200);
  data = versions;

  if (releaseId && data?.length) {
    const { data: existing } = await supabase
      .from("guide_release_items")
      .select("guide_id")
      .eq("release_id", releaseId);
    const inRelease = new Set((existing ?? []).map((r) => r.guide_id));
    data = data.filter((v) => !inRelease.has(v.guide_id));
  }

  return NextResponse.json(data ?? []);
}
