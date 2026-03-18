/**
 * /api/guides/images
 *
 * PATCH — replace the full images array for a guide version (used for reorder + metadata edits)
 * DELETE — remove a single image by key (deletes from Storage + updates JSONB)
 */

import { createAdminClient, createServiceClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { GuideImage } from "@/types/database";

const BUCKET = "guide-images";

// PATCH /api/guides/images
// Body: { versionId: string, images: GuideImage[] }
export async function PATCH(request: Request) {
  const body = await request.json();
  const { versionId, images } = body as { versionId: string; images: GuideImage[] };

  if (!versionId || !Array.isArray(images)) {
    return NextResponse.json({ error: "Missing versionId or images array" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("guide_versions")
    .update({ images })
    .eq("id", versionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, totalImages: images.length });
}

// DELETE /api/guides/images
// Body: { versionId: string, guideSlug: string, imageKey: string }
export async function DELETE(request: Request) {
  const body = await request.json();
  const { versionId, guideSlug, imageKey } = body as {
    versionId: string;
    guideSlug: string;
    imageKey: string;
  };

  if (!versionId || !guideSlug || !imageKey) {
    return NextResponse.json(
      { error: "Missing versionId, guideSlug, or imageKey" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const service = createServiceClient();

  // Load current images
  const { data: version, error: vErr } = await supabase
    .from("guide_versions")
    .select("images")
    .eq("id", versionId)
    .single();

  if (vErr || !version) {
    return NextResponse.json({ error: "Guide version not found" }, { status: 404 });
  }

  const currentImages: GuideImage[] = Array.isArray(version.images) ? (version.images as GuideImage[]) : [];
  const target = currentImages.find((img) => img.key === imageKey);

  if (!target) {
    return NextResponse.json({ error: `Image key "${imageKey}" not found` }, { status: 404 });
  }

  // Delete from Storage if a file was uploaded (storageUrl is set)
  if (target.storageUrl) {
    // List all objects under guideSlug/imageKey.* and remove them
    const { data: listed } = await service.storage.from(BUCKET).list(guideSlug);
    const toRemove = (listed ?? [])
      .filter((f) => f.name.startsWith(`${imageKey}.`))
      .map((f) => `${guideSlug}/${f.name}`);

    if (toRemove.length > 0) {
      await service.storage.from(BUCKET).remove(toRemove);
    }
  }

  // Remove from JSONB array
  const updatedImages = currentImages.filter((img) => img.key !== imageKey);

  const { error: updateErr } = await supabase
    .from("guide_versions")
    .update({ images: updatedImages })
    .eq("id", versionId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, totalImages: updatedImages.length });
}
