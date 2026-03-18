"use client";

import React, { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GuideImage } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  versionId: string;
  guideSlug: string;
  initialImages: GuideImage[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stepLabel(index: number | null) {
  if (index === null) return "Gallery";
  return `Step ${index + 1}`;
}

// ─── Upload form for a single pending image ────────────────────────────────────

function PendingImageCard({
  image,
  guideSlug,
  versionId,
  onUploaded,
}: {
  image: GuideImage;
  guideSlug: string;
  versionId: string;
  onUploaded: (updated: GuideImage) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("versionId", versionId);
    fd.append("guideSlug", guideSlug);
    fd.append("key", image.key);
    fd.append("caption", image.caption);
    fd.append("altText", image.altText);
    fd.append("description", image.description);
    fd.append(
      "associatedStepIndex",
      image.associatedStepIndex !== null ? String(image.associatedStepIndex) : ""
    );

    try {
      const res = await fetch("/api/guides/images/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
      } else {
        onUploaded(data.image as GuideImage);
      }
    } catch {
      setError("Network error during upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/40 p-4 dark:border-amber-800 dark:bg-amber-950/20">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">{image.key}</Badge>
          <Badge variant="secondary" className="text-xs">{stepLabel(image.associatedStepIndex)}</Badge>
          <Badge variant="outline" className="border-amber-400 text-amber-700 text-xs dark:text-amber-300">
            Awaiting upload
          </Badge>
        </div>
      </div>

      {/* AI sourcing brief */}
      <div className="mb-3 rounded-md bg-amber-100/60 p-3 dark:bg-amber-900/30">
        <p className="mb-1 font-medium text-amber-900 text-xs uppercase tracking-wide dark:text-amber-200">
          AI sourcing brief
        </p>
        <p className="text-amber-900 text-sm leading-relaxed dark:text-amber-100">{image.description}</p>
      </div>

      <div className="space-y-1 text-sm">
        <p>
          <span className="text-muted-foreground font-medium">Caption: </span>
          {image.caption}
        </p>
        <p>
          <span className="text-muted-foreground font-medium">Alt text: </span>
          {image.altText}
        </p>
      </div>

      {error && <p className="mt-2 text-destructive text-sm">{error}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleUpload}
      />
      <Button
        size="sm"
        variant="outline"
        className="mt-3"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? "Uploading…" : "Upload image"}
      </Button>
    </div>
  );
}

// ─── Uploaded image card ───────────────────────────────────────────────────────

function UploadedImageCard({
  image,
  guideSlug,
  versionId,
  onDeleted,
  onReplace,
}: {
  image: GuideImage;
  guideSlug: string;
  versionId: string;
  onDeleted: (key: string) => void;
  onReplace: (updated: GuideImage) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`Delete image "${image.key}"? This cannot be undone.`)) return;
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch("/api/guides/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId, guideSlug, imageKey: image.key }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Delete failed");
      } else {
        onDeleted(image.key);
      }
    } catch {
      setError("Network error during delete");
    } finally {
      setDeleting(false);
    }
  }

  async function handleReplace(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReplacing(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("versionId", versionId);
    fd.append("guideSlug", guideSlug);
    fd.append("key", image.key);
    fd.append("caption", image.caption);
    fd.append("altText", image.altText);
    fd.append("description", image.description);
    fd.append(
      "associatedStepIndex",
      image.associatedStepIndex !== null ? String(image.associatedStepIndex) : ""
    );

    try {
      const res = await fetch("/api/guides/images/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Replace failed");
      } else {
        onReplace(data.image as GuideImage);
      }
    } catch {
      setError("Network error during replace");
    } finally {
      setReplacing(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      {/* Image preview */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.storageUrl!}
        alt={image.altText}
        className="h-48 w-full object-contain bg-muted"
      />

      <div className="p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">{image.key}</Badge>
          <Badge variant="secondary" className="text-xs">{stepLabel(image.associatedStepIndex)}</Badge>
          <Badge variant="outline" className="border-green-500 text-green-700 text-xs dark:text-green-400">
            Uploaded
          </Badge>
        </div>

        <p className="text-sm">
          <span className="text-muted-foreground font-medium">Caption: </span>
          {image.caption}
        </p>
        <p className="text-sm">
          <span className="text-muted-foreground font-medium">Alt text: </span>
          {image.altText}
        </p>

        {image.description && (
          <button
            className="mt-1 text-muted-foreground text-xs underline"
            onClick={() => setShowDescription((v) => !v)}
          >
            {showDescription ? "Hide" : "Show"} AI sourcing brief
          </button>
        )}
        {showDescription && (
          <p className="mt-1 rounded bg-muted p-2 text-muted-foreground text-xs leading-relaxed">
            {image.description}
          </p>
        )}

        {error && <p className="mt-1 text-destructive text-xs">{error}</p>}

        <div className="mt-3 flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleReplace}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={replacing}
            onClick={() => fileRef.current?.click()}
          >
            {replacing ? "Replacing…" : "Replace"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function GuideImagesManager({ versionId, guideSlug, initialImages }: Props) {
  const [images, setImages] = useState<GuideImage[]>(initialImages);

  function handleUploaded(updated: GuideImage) {
    setImages((prev) => prev.map((img) => (img.key === updated.key ? updated : img)));
  }

  function handleDeleted(key: string) {
    setImages((prev) => prev.filter((img) => img.key !== key));
  }

  const pending = images.filter((img) => !img.storageUrl);
  const uploaded = images.filter((img) => !!img.storageUrl);

  if (images.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-sm">
            No images recommended for this guide. The Writing pipeline step will populate this
            section with image briefs when it identifies visual content opportunities.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {uploaded.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Uploaded ({uploaded.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {uploaded.map((img) => (
                <UploadedImageCard
                  key={img.key}
                  image={img}
                  guideSlug={guideSlug}
                  versionId={versionId}
                  onDeleted={handleDeleted}
                  onReplace={handleUploaded}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Awaiting upload ({pending.length})
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              These images were recommended by the AI writing step. Upload the correct image
              for each based on the sourcing brief.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pending.map((img) => (
                <PendingImageCard
                  key={img.key}
                  image={img}
                  guideSlug={guideSlug}
                  versionId={versionId}
                  onUploaded={handleUploaded}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
