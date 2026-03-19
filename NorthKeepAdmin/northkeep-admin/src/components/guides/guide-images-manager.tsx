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
  reviewStatus: string;
  stepCount: number;
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
  onDeleted,
  onMetaUpdated,
}: {
  image: GuideImage;
  guideSlug: string;
  versionId: string;
  onUploaded: (updated: GuideImage) => void;
  onDeleted: (key: string) => void;
  onMetaUpdated: (key: string, caption: string, altText: string) => Promise<{ error?: string }>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftCaption, setDraftCaption] = useState(image.caption);
  const [draftAltText, setDraftAltText] = useState(image.altText);
  const [saving, setSaving] = useState(false);
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

  async function handleDelete() {
    if (!confirm(`Delete proposed image "${image.key}"? This cannot be undone.`)) return;
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

  async function handleSaveMeta() {
    setSaving(true);
    setError(null);
    const result = await onMetaUpdated(image.key, draftCaption, draftAltText);
    if (result.error) {
      setError(result.error);
    } else {
      setEditing(false);
    }
    setSaving(false);
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

      {editing ? (
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Caption</label>
            <input
              className="w-full rounded border px-2 py-1 text-sm"
              value={draftCaption}
              onChange={(e) => setDraftCaption(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Alt text</label>
            <input
              className="w-full rounded border px-2 py-1 text-sm"
              value={draftAltText}
              onChange={(e) => setDraftAltText(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={saving} onClick={handleSaveMeta}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={saving}
              onClick={() => {
                setDraftCaption(image.caption);
                setDraftAltText(image.altText);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground font-medium">Caption: </span>
            {image.caption}
          </p>
          <p>
            <span className="text-muted-foreground font-medium">Alt text: </span>
            {image.altText}
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="mt-1 h-auto px-0 py-0 text-xs text-muted-foreground underline"
            onClick={() => setEditing(true)}
          >
            Edit caption
          </Button>
        </div>
      )}

      {error && <p className="mt-2 text-destructive text-sm">{error}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleUpload}
      />
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={uploading || deleting}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "Uploading…" : "Upload image"}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={uploading || deleting}
          onClick={handleDelete}
        >
          {deleting ? "Deleting…" : "Delete"}
        </Button>
      </div>
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
  onMetaUpdated,
}: {
  image: GuideImage;
  guideSlug: string;
  versionId: string;
  onDeleted: (key: string) => void;
  onReplace: (updated: GuideImage) => void;
  onMetaUpdated: (key: string, caption: string, altText: string) => Promise<{ error?: string }>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftCaption, setDraftCaption] = useState(image.caption);
  const [draftAltText, setDraftAltText] = useState(image.altText);
  const [saving, setSaving] = useState(false);
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

  async function handleSaveMeta() {
    setSaving(true);
    setError(null);
    const result = await onMetaUpdated(image.key, draftCaption, draftAltText);
    if (result.error) {
      setError(result.error);
    } else {
      setEditing(false);
    }
    setSaving(false);
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

        {editing ? (
          <div className="space-y-2 mt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Caption</label>
              <input
                className="w-full rounded border px-2 py-1 text-sm"
                value={draftCaption}
                onChange={(e) => setDraftCaption(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Alt text</label>
              <input
                className="w-full rounded border px-2 py-1 text-sm"
                value={draftAltText}
                onChange={(e) => setDraftAltText(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={saving} onClick={handleSaveMeta}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={saving}
                onClick={() => {
                  setDraftCaption(image.caption);
                  setDraftAltText(image.altText);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm">
            <p>
              <span className="text-muted-foreground font-medium">Caption: </span>
              {image.caption}
            </p>
            <p>
              <span className="text-muted-foreground font-medium">Alt text: </span>
              {image.altText}
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="mt-1 h-auto px-0 py-0 text-xs text-muted-foreground underline"
              onClick={() => setEditing(true)}
            >
              Edit caption
            </Button>
          </div>
        )}

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

// ─── Add Image form (shown when review_status === "needs_images") ──────────────

function AddImageForm({
  versionId,
  guideSlug,
  stepCount,
  onAdded,
}: {
  versionId: string;
  guideSlug: string;
  stepCount: number;
  onAdded: (img: GuideImage) => void;
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [caption, setCaption] = useState("");
  const [altText, setAltText] = useState("");
  const [description, setDescription] = useState("");
  const [stepIndex, setStepIndex] = useState<string>("gallery");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("A file is required.");
      return;
    }
    setUploading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("versionId", versionId);
    fd.append("guideSlug", guideSlug);
    fd.append("key", key);
    fd.append("caption", caption);
    fd.append("altText", altText);
    fd.append("description", description);
    fd.append("associatedStepIndex", stepIndex === "gallery" ? "" : stepIndex);

    try {
      const res = await fetch("/api/guides/images/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
      } else {
        onAdded(data.image as GuideImage);
        setOpen(false);
        setKey(""); setCaption(""); setAltText(""); setDescription("");
        setStepIndex("gallery"); setFile(null);
      }
    } catch {
      setError("Network error during upload");
    } finally {
      setUploading(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Add image
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <p className="text-sm font-medium">Add image</p>

      <div className="space-y-1">
        <label className="text-xs font-medium">Key (unique ID, e.g. hand-position)</label>
        <input
          className="w-full rounded border px-2 py-1 text-sm"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="hand-position"
          pattern="[a-z0-9-]+"
          title="Lowercase letters, numbers, and hyphens only"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium">Caption (shown on mobile)</label>
        <input
          className="w-full rounded border px-2 py-1 text-sm"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium">Alt text (accessibility)</label>
        <input
          className="w-full rounded border px-2 py-1 text-sm"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium">Sourcing note (admin only, optional)</label>
        <textarea
          className="w-full rounded border px-2 py-1 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium">Step association</label>
        <select
          className="w-full rounded border px-2 py-1 text-sm"
          value={stepIndex}
          onChange={(e) => setStepIndex(e.target.value)}
        >
          <option value="gallery">Gallery (not tied to a step)</option>
          {Array.from({ length: stepCount }, (_, i) => (
            <option key={i} value={String(i)}>
              Step {i + 1}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium">Image file (JPEG/PNG/WebP, max 5 MB) *</label>
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={uploading}>
          {uploading ? "Uploading…" : "Upload image"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function GuideImagesManager({ versionId, guideSlug, initialImages, reviewStatus, stepCount }: Props) {
  const [images, setImages] = useState<GuideImage[]>(initialImages);

  function handleUploaded(updated: GuideImage) {
    setImages((prev) => prev.map((img) => (img.key === updated.key ? updated : img)));
  }

  function handleDeleted(key: string) {
    setImages((prev) => prev.filter((img) => img.key !== key));
  }

  function handleAdded(newImg: GuideImage) {
    setImages((prev) => [...prev, newImg]);
  }

  async function handleMetaUpdated(key: string, caption: string, altText: string): Promise<{ error?: string }> {
    const newImages = images.map((img) => img.key === key ? { ...img, caption, altText } : img);
    try {
      const res = await fetch("/api/guides/images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId, images: newImages }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error ?? "Save failed" };
      setImages(newImages);
      return {};
    } catch {
      return { error: "Network error" };
    }
  }

  const pending = images.filter((img) => !img.storageUrl);
  const uploaded = images.filter((img) => !!img.storageUrl);

  if (images.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          {reviewStatus === "needs_images" ? (
            <>
              <p className="text-muted-foreground text-sm">
                No images yet. Use the form below to upload the first image.
              </p>
              <AddImageForm
                versionId={versionId}
                guideSlug={guideSlug}
                stepCount={stepCount}
                onAdded={handleAdded}
              />
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              No images recommended for this guide. The Writing pipeline step will populate this
              section with image briefs when it identifies visual content opportunities.
            </p>
          )}
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
                  onMetaUpdated={handleMetaUpdated}
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
                  onDeleted={handleDeleted}
                  onMetaUpdated={handleMetaUpdated}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {reviewStatus === "needs_images" && (
        <AddImageForm
          versionId={versionId}
          guideSlug={guideSlug}
          stepCount={stepCount}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
}
