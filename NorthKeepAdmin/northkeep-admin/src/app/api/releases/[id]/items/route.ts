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
  let items: { guideId: string; guideVersionId: string }[] | null = null;

  if (contentType.includes("application/json")) {
    const body = await request.json();
    action = body.action ?? null;
    guideId = body.guideId ?? body.guide_id ?? null;
    guideVersionId = body.guideVersionId ?? body.guide_version_id ?? null;
    items = body.items ?? null;
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

  // Bulk add (batched to avoid Supabase row limits)
  if (action === "add-bulk" && Array.isArray(items) && items.length > 0) {
    const rows = items.map((item) => ({
      release_id: releaseId,
      guide_id: item.guideId,
      guide_version_id: item.guideVersionId,
    }));
    const BATCH_SIZE = 50;
    let added = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("guide_release_items")
        .upsert(batch, { onConflict: "release_id,guide_id" });
      if (error) return NextResponse.json({ message: error.message, added }, { status: 400 });
      added += batch.length;
    }
    return NextResponse.json({ ok: true, added });
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
