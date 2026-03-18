import { createAdminClient, createServiceClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { GuideImage } from "@/types/database";

const BUCKET = "guide-images";
const MAX_IMAGES = 8;

async function ensureBucket(service: ReturnType<typeof createServiceClient>) {
  const { data: buckets } = await service.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await service.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5242880 }); // 5 MB limit
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const file = formData.get("file") as File | null;
  const versionId = formData.get("versionId") as string | null;
  const guideSlug = formData.get("guideSlug") as string | null;
  const key = formData.get("key") as string | null;
  const caption = (formData.get("caption") as string) || "";
  const altText = (formData.get("altText") as string) || "";
  const description = (formData.get("description") as string) || "";
  const associatedStepIndexRaw = formData.get("associatedStepIndex");
  const associatedStepIndex =
    associatedStepIndexRaw !== null && associatedStepIndexRaw !== ""
      ? parseInt(associatedStepIndexRaw as string, 10)
      : null;

  if (!file || !versionId || !guideSlug || !key) {
    return NextResponse.json(
      { error: "Missing required fields: file, versionId, guideSlug, key" },
      { status: 400 }
    );
  }

  // Validate key format: lowercase alphanumeric + hyphens only
  if (!/^[a-z0-9-]+$/.test(key)) {
    return NextResponse.json(
      { error: "image key must be lowercase alphanumeric and hyphens only" },
      { status: 400 }
    );
  }

  // Derive extension from file type
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const ext = mimeToExt[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Unsupported image type. Use JPEG, PNG, or WebP." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const service = createServiceClient();

  // Load current images for this version
  const { data: version, error: vErr } = await supabase
    .from("guide_versions")
    .select("images")
    .eq("id", versionId)
    .single();

  if (vErr || !version) {
    return NextResponse.json({ error: "Guide version not found" }, { status: 404 });
  }

  const currentImages: GuideImage[] = Array.isArray(version.images) ? (version.images as GuideImage[]) : [];

  if (currentImages.length >= MAX_IMAGES) {
    return NextResponse.json({ error: `Maximum of ${MAX_IMAGES} images per guide` }, { status: 400 });
  }

  // Check for duplicate key
  if (currentImages.some((img) => img.key === key)) {
    return NextResponse.json(
      { error: `Image key "${key}" already exists on this guide version` },
      { status: 409 }
    );
  }

  // Ensure bucket exists
  await ensureBucket(service);

  // Upload to Supabase Storage
  const storagePath = `${guideSlug}/${key}.${ext}`;
  const fileBytes = await file.arrayBuffer();

  const { error: uploadErr } = await service.storage
    .from(BUCKET)
    .upload(storagePath, fileBytes, {
      contentType: file.type,
      upsert: true, // allow replacing existing image with same key
    });

  if (uploadErr) {
    return NextResponse.json({ error: `Storage upload failed: ${uploadErr.message}` }, { status: 500 });
  }

  // Build public URL
  const { data: urlData } = service.storage.from(BUCKET).getPublicUrl(storagePath);
  const storageUrl = urlData.publicUrl;

  // Build the new image record (storageUrl populated)
  const newImage: GuideImage = {
    key,
    description,
    caption,
    altText,
    associatedStepIndex: Number.isNaN(associatedStepIndex as number) ? null : associatedStepIndex,
    storageUrl,
  };

  // Append to images array and persist
  const updatedImages = [...currentImages, newImage];

  const { error: updateErr } = await supabase
    .from("guide_versions")
    .update({ images: updatedImages })
    .eq("id", versionId);

  if (updateErr) {
    return NextResponse.json({ error: `Failed to update guide version: ${updateErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ image: newImage, totalImages: updatedImages.length });
}
