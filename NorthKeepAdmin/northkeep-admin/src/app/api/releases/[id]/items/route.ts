import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: releaseId } = await params;
  const contentType = request.headers.get("content-type") ?? "";
  let action: string | null = null;
  let guideId: string | null = null;
  let guideVersionId: string | null = null;

  if (contentType.includes("application/json")) {
    const body = await request.json();
    action = body.action ?? null;
    guideId = body.guideId ?? body.guide_id ?? null;
    guideVersionId = body.guideVersionId ?? body.guide_version_id ?? null;
  } else {
    const formData = await request.formData();
    action = formData.get("action") as string | null;
    guideId = formData.get("guideId") as string | null;
  }

  const supabase = createAdminClient();

  if (action === "remove") {
    if (!guideId || typeof guideId !== "string") {
      return NextResponse.json({ message: "guideId required" }, { status: 400 });
    }
    const { error } = await supabase
      .from("guide_release_items")
      .delete()
      .eq("release_id", releaseId)
      .eq("guide_id", guideId);
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "add") {
    if (!guideId || !guideVersionId) {
      return NextResponse.json({ message: "guideId and guideVersionId required" }, { status: 400 });
    }
    const { error } = await supabase.from("guide_release_items").upsert(
      { release_id: releaseId, guide_id: guideId, guide_version_id: guideVersionId },
      { onConflict: "release_id,guide_id" }
    );
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ message: "Unknown action" }, { status: 400 });
}
