"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload } from "lucide-react";
import type { NormalizedGuide } from "@/types/normalized-export";
import type { ImportPreviewData, DiffField } from "@/app/api/guides/import/route";

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ImportGuidePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [parsed, setParsed] = useState<NormalizedGuide | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [changeSummary, setChangeSummary] = useState("Imported from JSON upload");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleFile(file: File) {
    setParsed(null);
    setParseError(null);
    setPreview(null);
    setSaveError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);
        // Accept a full export object ({guides:[...]}) or a bare single-guide object
        const guide: NormalizedGuide = Array.isArray(json.guides) ? json.guides[0] : json;
        if (!guide?.slug) throw new Error("JSON must have a 'slug' field.");
        if (!guide?.title) throw new Error("JSON must have a 'title' field.");
        setParsed(guide);
        await fetchPreview(guide);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Invalid JSON");
      }
    };
    reader.readAsText(file);
  }

  async function fetchPreview(guide: NormalizedGuide) {
    setLoading(true);
    try {
      const res = await fetch("/api/guides/import?action=preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guide }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setPreview(data as ImportPreviewData);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!parsed) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/guides/import?action=save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guide: parsed, changeSummary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      router.push(`/guides/${data.slug}?tab=versions`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Link href="/guides" className="text-muted-foreground hover:text-foreground text-sm">
          ← Guide Library
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Import Guide JSON</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Upload a single-guide JSON file. If the slug matches an existing guide a new draft version will be created.
          New slugs will create a new guide.
        </p>
      </div>

      {/* Upload */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div
            className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors hover:border-primary/50"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
          >
            <Upload className="text-muted-foreground h-8 w-8" />
            <div>
              <p className="font-medium">Drop a guide JSON file here, or click to browse</p>
              <p className="text-muted-foreground text-sm">Same shape as the normalized guide export</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {parseError && <p className="text-destructive text-sm">{parseError}</p>}
          {loading && <p className="text-muted-foreground text-sm">Loading preview…</p>}
        </CardContent>
      </Card>

      {/* Preview */}
      {preview && parsed && (
        <>
          {/* Identity card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Import preview</CardTitle>
                {preview.isNew ? (
                  <Badge>New guide</Badge>
                ) : (
                  <Badge variant="secondary">
                    Update v{preview.currentVersionNumber} → v{(preview.currentVersionNumber ?? 0) + 1}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm">
                {preview.isNew
                  ? `No existing guide found with slug "${preview.slug}". A new guide and first version will be created.`
                  : `Guide "${parsed.title}" found. A new draft version will be created without changing the currently published version.`}
              </p>
            </CardHeader>
            <CardContent>
              <dl className="grid max-w-sm grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Slug</dt>
                <dd className="font-mono">{parsed.slug}</dd>
                <dt className="text-muted-foreground">Category</dt>
                <dd>{parsed.category}</dd>
                <dt className="text-muted-foreground">Parent topic</dt>
                <dd>{parsed.parentTopic}</dd>
                <dt className="text-muted-foreground">Layer / Type</dt>
                <dd>
                  {parsed.layer} / {parsed.guideType}
                </dd>
              </dl>
            </CardContent>
          </Card>

          {/* Diff */}
          <DiffView preview={preview} />

          {/* Save */}
          <Card>
            <CardHeader>
              <CardTitle>Save import</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!preview.hasChanges && !preview.isNew && (
                <div className="rounded border border-amber-200 bg-amber-50/50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                  No content differences detected. You can still save to create a version record.
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="changeSummary">Change summary</Label>
                <Input
                  id="changeSummary"
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  placeholder="Describe what changed"
                />
              </div>
              {saveError && <p className="text-destructive text-sm">{saveError}</p>}
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : preview.isNew ? "Create guide + version" : "Create new draft version"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Diff view ────────────────────────────────────────────────────────────────

function DiffView({ preview }: { preview: ImportPreviewData }) {
  const [showUnchanged, setShowUnchanged] = useState(false);

  if (preview.isNew) {
    const populated = preview.diff.filter((f) => !isEmpty(f.incoming));
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content to be imported</CardTitle>
          <p className="text-muted-foreground text-sm">{populated.length} fields with content</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {populated.map((f) => (
            <DiffFieldRow key={f.key} field={f} isNew />
          ))}
        </CardContent>
      </Card>
    );
  }

  const changed = preview.diff.filter((f) => f.changed);
  const unchanged = preview.diff.filter((f) => !f.changed);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Changes</CardTitle>
        <p className="text-muted-foreground text-sm">
          {changed.length === 0
            ? "No differences found."
            : `${changed.length} field${changed.length === 1 ? "" : "s"} changed`}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {changed.map((f) => (
          <DiffFieldRow key={f.key} field={f} isNew={false} />
        ))}
        {unchanged.length > 0 && (
          <div className="border-t pt-3">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline"
              onClick={() => setShowUnchanged((v) => !v)}
            >
              {showUnchanged ? "Hide" : "Show"} {unchanged.length} unchanged field
              {unchanged.length === 1 ? "" : "s"}
            </button>
            {showUnchanged && (
              <div className="mt-3 space-y-1 border-l pl-3">
                {unchanged.map((f) => (
                  <div key={f.key} className="text-muted-foreground flex gap-2 text-sm">
                    <span className="font-medium shrink-0">{f.label}:</span>
                    <span className="truncate">
                      {f.type === "text"
                        ? isEmpty(f.current)
                          ? "—"
                          : String(f.current).slice(0, 80)
                        : Array.isArray(f.current)
                          ? `${(f.current as unknown[]).length} items`
                          : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Per-field row ────────────────────────────────────────────────────────────

function DiffFieldRow({ field, isNew }: { field: DiffField; isNew: boolean }) {
  if (field.type === "text") {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{field.label}</span>
          {field.changed && !isNew && (
            <Badge variant="secondary" className="text-xs">
              changed
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          {!isNew && field.changed && (
            <div className="rounded border border-red-200 bg-red-50/50 p-2 text-sm dark:border-red-900/40 dark:bg-red-950/20">
              <span className="mb-1 block text-xs font-medium text-red-600 dark:text-red-400">Current</span>
              {isEmpty(field.current) ? (
                <em className="text-muted-foreground">empty</em>
              ) : (
                <span className="text-red-900 dark:text-red-100 whitespace-pre-wrap">{String(field.current)}</span>
              )}
            </div>
          )}
          <div className="rounded border border-green-200 bg-green-50/50 p-2 text-sm dark:border-green-900/40 dark:bg-green-950/20">
            {!isNew && (
              <span className="mb-1 block text-xs font-medium text-green-600 dark:text-green-400">Incoming</span>
            )}
            {isEmpty(field.incoming) ? (
              <em className="text-muted-foreground">empty</em>
            ) : (
              <span className="text-green-900 dark:text-green-100 whitespace-pre-wrap">{String(field.incoming)}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (field.type === "array") {
    const incoming = (field.incoming as string[]) ?? [];
    const current = (field.current as string[]) ?? [];
    const added = incoming.filter((i) => !current.includes(i));
    const removed = current.filter((c) => !incoming.includes(c));
    const kept = incoming.filter((i) => current.includes(i));

    if (isNew && incoming.length === 0) return null;

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{field.label}</span>
          {field.changed && !isNew && (
            <Badge variant="secondary" className="text-xs">
              changed
            </Badge>
          )}
          {!isNew && field.changed && (added.length > 0 || removed.length > 0) && (
            <span className="text-muted-foreground text-xs">
              {added.length > 0 && `+${added.length}`}
              {added.length > 0 && removed.length > 0 && " "}
              {removed.length > 0 && `-${removed.length}`}
            </span>
          )}
        </div>
        {(isNew ? incoming : [...added, ...removed]).length > 0 ? (
          <ul className="space-y-1 text-sm">
            {isNew
              ? incoming.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-green-800 dark:text-green-200">
                    <span className="mt-0.5 shrink-0 text-green-600 dark:text-green-400">+</span>
                    <span>{item}</span>
                  </li>
                ))
              : (
                <>
                  {added.map((item, i) => (
                    <li key={`add-${i}`} className="flex items-start gap-2 text-green-800 dark:text-green-200">
                      <span className="mt-0.5 shrink-0 text-green-600 dark:text-green-400">+</span>
                      <span>{item}</span>
                    </li>
                  ))}
                  {removed.map((item, i) => (
                    <li key={`rem-${i}`} className="flex items-start gap-2 text-red-800 opacity-70 line-through dark:text-red-200">
                      <span className="mt-0.5 shrink-0 text-red-600 dark:text-red-400">−</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </>
              )}
          </ul>
        ) : (
          !isNew && <p className="text-muted-foreground text-xs">Order or content may differ — {incoming.length} items</p>
        )}
        {!isNew && field.changed && kept.length > 0 && (
          <p className="text-muted-foreground text-xs">
            {kept.length} item{kept.length === 1 ? "" : "s"} unchanged
          </p>
        )}
      </div>
    );
  }

  if (field.type === "sources") {
    const incoming = (field.incoming as unknown[]) ?? [];
    const current = (field.current as unknown[]) ?? [];
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{field.label}</span>
          {field.changed && !isNew && (
            <Badge variant="secondary" className="text-xs">
              changed
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {isNew
            ? `${incoming.length} source${incoming.length === 1 ? "" : "s"} to import`
            : `${current.length} → ${incoming.length} source${incoming.length === 1 ? "" : "s"}`}
        </p>
        {incoming.length > 0 && (
          <ul className="space-y-1 text-sm">
            {(incoming as Array<{ title?: string; organization?: string; url?: string }>).map((s, i) => (
              <li key={i} className="rounded border p-2">
                <span className="font-medium">{s.title}</span>
                {s.organization && <span className="text-muted-foreground ml-1">— {s.organization}</span>}
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary ml-1 block truncate text-xs hover:underline"
                  >
                    {s.url}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return null;
}

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
}
