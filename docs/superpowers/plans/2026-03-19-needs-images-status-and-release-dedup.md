# Needs Images Status + Release Dedup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `needs_images` as a first-class `review_status` value with a hard gate blocking approval until images are uploaded, update the admin UI throughout, fix the release dedup bug, and create 13 new guide versions flagged for image sourcing.

**Architecture:** Touches the DB enum/constraint, TypeScript types, one API route (gate logic), two UI components (select + images manager), one page (review queue filter), two release routes (dedup fix), and one new script. All changes are in `NorthKeepAdmin/northkeep-admin/`. The batch script uses direct Supabase access (same pattern as existing scripts) to avoid the two-step import-then-patch dance.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (PostgreSQL), shadcn/ui, tsx (script runner)

**Spec:** `docs/superpowers/specs/2026-03-19-needs-images-status-and-guide-consolidation-design.md` — WS1 + WS2

---

## File Map

| Action | Path |
|--------|------|
| DB migration | Supabase SQL console |
| Modify | `src/types/database.ts` |
| Modify | `src/app/api/guides/versions/[versionId]/review-status/route.ts` |
| Modify | `src/components/guides/review-status-select.tsx` |
| Modify | `src/app/(dashboard)/review/page.tsx` |
| Modify | `src/components/guides/guide-images-manager.tsx` |
| Modify | `src/app/(dashboard)/guides/[slug]/page.tsx` |
| Modify | `src/app/api/releases/[id]/publish/route.ts` |
| Modify | `src/app/api/releases/bulk-publish/route.ts` |
| Create | `scripts/flag-guides-for-images.ts` |

All paths are relative to `NorthKeepAdmin/northkeep-admin/`.

---

## Task 1: DB Migration

**Files:** Supabase SQL console (no local file change)

- [ ] **Step 1: Determine the column type**

  Open the Supabase dashboard → SQL Editor. Run:

  ```sql
  SELECT data_type, udt_name
  FROM information_schema.columns
  WHERE table_name = 'guide_versions'
    AND column_name = 'review_status';
  ```

  - If `data_type = 'USER-DEFINED'` → it is a PostgreSQL enum named by `udt_name`. Proceed to Step 2a.
  - If `data_type = 'text'` → it is a text column with a check constraint. Proceed to Step 2b.

- [ ] **Step 2a (if enum): Add the new value**

  ```sql
  ALTER TYPE review_status ADD VALUE 'needs_images' BEFORE 'approved';
  ```

- [ ] **Step 2b (if text/check constraint): Replace the constraint**

  First find the constraint name:
  ```sql
  SELECT conname FROM pg_constraint
  WHERE conrelid = 'guide_versions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%review_status%';
  ```

  Then drop and recreate (replace `<constraint_name>` with the result above):
  ```sql
  ALTER TABLE guide_versions DROP CONSTRAINT <constraint_name>;
  ALTER TABLE guide_versions
    ADD CONSTRAINT guide_versions_review_status_check
    CHECK (review_status IN (
      'draft', 'in_review', 'needs_images', 'approved', 'published', 'archived'
    ));
  ```

- [ ] **Step 3: Verify the migration**

  ```sql
  -- Should succeed without error:
  UPDATE guide_versions SET review_status = 'needs_images'
  WHERE id = (SELECT id FROM guide_versions LIMIT 1);

  -- Roll it back immediately:
  UPDATE guide_versions SET review_status = 'draft'
  WHERE id = (SELECT id FROM guide_versions LIMIT 1)
    AND review_status = 'needs_images';
  ```

  Expected: both statements complete without error.

---

## Task 2: TypeScript Types

**Files:**
- Modify: `src/types/database.ts:6`

- [ ] **Step 1: Add `"needs_images"` to the union**

  Change line 6 from:
  ```typescript
  export type ReviewStatus = "draft" | "in_review" | "approved" | "published" | "archived";
  ```
  To:
  ```typescript
  export type ReviewStatus = "draft" | "in_review" | "needs_images" | "approved" | "published" | "archived";
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  cd NorthKeepAdmin/northkeep-admin
  npm run build 2>&1 | head -30
  ```

  Expected: no TypeScript errors (build errors about other things are OK for now, but no type errors on `ReviewStatus`).

- [ ] **Step 3: Commit**

  ```bash
  git add NorthKeepAdmin/northkeep-admin/src/types/database.ts
  git commit -m "feat: add needs_images to ReviewStatus type"
  ```

---

## Task 3: Review-Status API Route

**Files:**
- Modify: `src/app/api/guides/versions/[versionId]/review-status/route.ts`

- [ ] **Step 1: Replace the file content**

  ```typescript
  import { NextRequest, NextResponse } from "next/server";
  import { createAdminClient } from "@/lib/supabase/admin";

  const VALID_STATUSES = ["draft", "in_review", "needs_images", "approved", "archived"] as const;
  type ReviewStatus = (typeof VALID_STATUSES)[number];

  export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ versionId: string }> }
  ) {
    const { versionId } = await params;

    let body: { review_status?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { review_status } = body;

    if (!review_status || !(VALID_STATUSES as readonly string[]).includes(review_status)) {
      return NextResponse.json(
        { error: `Invalid review_status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Hard gate: if promoting to "approved", block if version has image stubs
    // but none have been uploaded yet. Zero-stub guides pass freely.
    if (review_status === "approved") {
      const { data: version } = await supabase
        .from("guide_versions")
        .select("images")
        .eq("id", versionId)
        .single();

      const images = (version?.images as Array<{ storageUrl: string | null }>) ?? [];
      if (images.length > 0 && images.every((img) => !img.storageUrl)) {
        return NextResponse.json(
          { error: "At least one image must be uploaded before this version can be approved." },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from("guide_versions")
      .update({ review_status: review_status as ReviewStatus })
      .eq("id", versionId)
      .select("id, review_status, updated_at")
      .single();

    if (error) {
      console.error("[review-status] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  }
  ```

- [ ] **Step 2: Start the dev server (if not running)**

  ```bash
  cd NorthKeepAdmin/northkeep-admin
  npm run dev
  ```

  Wait for `Ready` in output.

- [ ] **Step 3: Test — set status to `needs_images`**

  Pick any `versionId` from the DB (any draft version will do):
  ```bash
  curl -s -X PATCH http://localhost:3000/api/guides/versions/<versionId>/review-status \
    -H "Content-Type: application/json" \
    -d '{"review_status":"needs_images"}'
  ```

  Expected: `{"id":"...","review_status":"needs_images","updated_at":"..."}` (200)

  Reset it back:
  ```bash
  curl -s -X PATCH http://localhost:3000/api/guides/versions/<versionId>/review-status \
    -H "Content-Type: application/json" \
    -d '{"review_status":"draft"}'
  ```

- [ ] **Step 4: Test — hard gate blocks approval when all stubs are null**

  Find a `versionId` that has `images` with at least one entry where `storageUrl` is null. The 13 guides we'll create in Task 9 will have this. For now, temporarily insert a stub via Supabase SQL:

  ```sql
  UPDATE guide_versions
  SET images = '[{"key":"test","description":"test","caption":"test","altText":"test","associatedStepIndex":null,"storageUrl":null}]'::jsonb,
      review_status = 'needs_images'
  WHERE id = '<versionId>';
  ```

  Then attempt approval:
  ```bash
  curl -s -X PATCH http://localhost:3000/api/guides/versions/<versionId>/review-status \
    -H "Content-Type: application/json" \
    -d '{"review_status":"approved"}'
  ```

  Expected: `{"error":"At least one image must be uploaded before this version can be approved."}` (400)

  Clean up:
  ```sql
  UPDATE guide_versions SET images = '[]'::jsonb, review_status = 'draft' WHERE id = '<versionId>';
  ```

- [ ] **Step 5: Test — versions with zero stubs pass the gate freely**

  Find a `versionId` where `images = []`. Try approving it:
  ```bash
  curl -s -X PATCH http://localhost:3000/api/guides/versions/<versionId>/review-status \
    -H "Content-Type: application/json" \
    -d '{"review_status":"approved"}'
  ```

  Expected: 200 success (no gate error). Reset:
  ```bash
  curl -s -X PATCH http://localhost:3000/api/guides/versions/<versionId>/review-status \
    -H "Content-Type: application/json" \
    -d '{"review_status":"draft"}'
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add NorthKeepAdmin/northkeep-admin/src/app/api/guides/versions/
  git commit -m "feat: add needs_images status and hard gate to review-status API"
  ```

---

## Task 4: ReviewStatusSelect Component

**Files:**
- Modify: `src/components/guides/review-status-select.tsx`

- [ ] **Step 1: Add `needs_images` to `STATUSES`**

  Change:
  ```typescript
  const STATUSES = [
    { value: "draft", label: "Draft" },
    { value: "in_review", label: "In review" },
    { value: "approved", label: "Approved" },
    { value: "archived", label: "Archived" },
  ] as const;
  ```
  To:
  ```typescript
  const STATUSES = [
    { value: "draft", label: "Draft" },
    { value: "in_review", label: "In review" },
    { value: "needs_images", label: "Needs images" },
    { value: "approved", label: "Approved" },
    { value: "archived", label: "Archived" },
  ] as const;
  ```

- [ ] **Step 2: Add amber color to `STATUS_COLORS`**

  Add one line to `STATUS_COLORS`:
  ```typescript
  const STATUS_COLORS: Record<string, string> = {
    draft: "text-muted-foreground",
    in_review: "text-blue-600 dark:text-blue-400",
    needs_images: "text-amber-600 dark:text-amber-400",   // ← ADD THIS LINE
    approved: "text-green-600 dark:text-green-400",
    archived: "text-muted-foreground opacity-60",
    published: "text-purple-600 dark:text-purple-400",
  };
  ```

- [ ] **Step 3: Visual verify**

  Navigate to any guide in the admin UI (e.g. `http://localhost:3000/guides/purify-water-boiling`). The status dropdown should now show "Needs images" as an option in amber color.

- [ ] **Step 4: Commit**

  ```bash
  git add NorthKeepAdmin/northkeep-admin/src/components/guides/review-status-select.tsx
  git commit -m "feat: add needs_images option to review status select (amber)"
  ```

---

## Task 5: Review Queue Page — Filter Tab

**Files:**
- Modify: `src/app/(dashboard)/review/page.tsx`

- [ ] **Step 1: Add the filter tab link**

  In the filter links section (around line 82), add a new `<Link>` after the `in_review` tab and before the `approved` tab:

  ```tsx
  <Link href={query ? `/review?filter=needs_images&q=${encodeURIComponent(query)}` : "/review?filter=needs_images"}>
    <Badge variant={filter === "needs_images" ? "default" : "secondary"}>Needs images</Badge>
  </Link>
  ```

- [ ] **Step 2: Add the filter branch**

  In the filtering logic (around line 45, after the `in_review` branch), add:

  ```typescript
  } else if (filter === "needs_images") {
    list = list.filter((v) => v.review_status === "needs_images");
  ```

- [ ] **Step 3: Verify**

  Navigate to `http://localhost:3000/review?filter=needs_images`. Should show an empty table with "No items match the filter." (no `needs_images` versions exist yet — that's created in Task 9).

- [ ] **Step 4: Commit**

  ```bash
  git add NorthKeepAdmin/northkeep-admin/src/app/\(dashboard\)/review/page.tsx
  git commit -m "feat: add Needs Images filter tab to review queue"
  ```

---

## Task 6: GuideImagesManager — Add Image Form

**Files:**
- Modify: `src/components/guides/guide-images-manager.tsx`

- [ ] **Step 1: Update the `Props` interface**

  Change:
  ```typescript
  interface Props {
    versionId: string;
    guideSlug: string;
    initialImages: GuideImage[];
  }
  ```
  To:
  ```typescript
  interface Props {
    versionId: string;
    guideSlug: string;
    initialImages: GuideImage[];
    reviewStatus: string;
    stepCount: number;
  }
  ```

- [ ] **Step 2: Add the `AddImageForm` component** (insert before the `export function GuideImagesManager` line)

  ```tsx
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
  ```

- [ ] **Step 3: Update the main `GuideImagesManager` component**

  **3a.** Update the destructured props:
  ```typescript
  export function GuideImagesManager({ versionId, guideSlug, initialImages, reviewStatus, stepCount }: Props) {
  ```

  **3b.** Add `handleAdded` alongside existing `handleUploaded` and `handleDeleted`:
  ```typescript
  function handleAdded(newImg: GuideImage) {
    setImages((prev) => [...prev, newImg]);
  }
  ```

  **3c.** Replace the empty-state block (currently starts at `if (images.length === 0)`):
  ```tsx
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
  ```

  **3d.** At the very end of the returned JSX (after the `pending.length > 0` block, before the closing `</div>`), add the "Add image" button for `needs_images` versions that already have some images:
  ```tsx
  {reviewStatus === "needs_images" && (
    <AddImageForm
      versionId={versionId}
      guideSlug={guideSlug}
      stepCount={stepCount}
      onAdded={handleAdded}
    />
  )}
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add NorthKeepAdmin/northkeep-admin/src/components/guides/guide-images-manager.tsx
  git commit -m "feat: add manual Add Image form for needs_images versions"
  ```

---

## Task 7: GuideDetailPage — Pass New Props

**Files:**
- Modify: `src/app/(dashboard)/guides/[slug]/page.tsx`

- [ ] **Step 1: Add `stepCount` calculation** (after the `latestVersion` variable declaration, around line 61)

  ```typescript
  const stepCount =
    (latestVersion as { step_by_step_actions?: string[] } | null)
      ?.step_by_step_actions?.length ?? 0;
  ```

- [ ] **Step 2: Pass new props to `GuideImagesManager`** (lines 181–189)

  Change:
  ```tsx
  <GuideImagesManager
    versionId={latestVersion.id}
    guideSlug={guide.slug}
    initialImages={
      Array.isArray((latestVersion as { images?: GuideImage[] }).images)
        ? (latestVersion as { images?: GuideImage[] }).images!
        : []
    }
  />
  ```
  To:
  ```tsx
  <GuideImagesManager
    versionId={latestVersion.id}
    guideSlug={guide.slug}
    initialImages={
      Array.isArray((latestVersion as { images?: GuideImage[] }).images)
        ? (latestVersion as { images?: GuideImage[] }).images!
        : []
    }
    reviewStatus={latestVersion.review_status}
    stepCount={stepCount}
  />
  ```

- [ ] **Step 3: Verify**

  Navigate to any guide page and click the "Images" tab. For a guide without `needs_images` status, the existing behavior is unchanged. The TypeScript compiler should not error — verify with `npm run build`.

- [ ] **Step 4: Commit**

  ```bash
  git add NorthKeepAdmin/northkeep-admin/src/app/\(dashboard\)/guides/
  git commit -m "feat: pass reviewStatus and stepCount to GuideImagesManager"
  ```

---

## Task 8: Release Dedup Fix

**Files:**
- Modify: `src/app/api/releases/[id]/publish/route.ts:63`
- Modify: `src/app/api/releases/bulk-publish/route.ts:84`

- [ ] **Step 1: Fix `publish/route.ts`**

  Around line 63, find:
  ```typescript
  .not("review_status", "in", "(archived,published)");
  ```
  Change to:
  ```typescript
  .not("review_status", "eq", "archived");
  ```

- [ ] **Step 2: Fix `bulk-publish/route.ts`**

  Around line 84, find the identical line:
  ```typescript
  .not("review_status", "in", "(archived,published)");
  ```
  Change to:
  ```typescript
  .not("review_status", "eq", "archived");
  ```

- [ ] **Step 3: Verify**

  In Supabase SQL, find a guide that has a `published` v1 and an `approved` v2 (or create one). Note the v1 version ID. Then call bulk-publish with the v2 version ID:

  ```bash
  curl -s -X POST http://localhost:3000/api/releases/bulk-publish \
    -H "Content-Type: application/json" \
    -d '{"versionIds":["<v2-versionId>"],"releaseName":"Dedup test"}'
  ```

  Then check v1's status in Supabase:
  ```sql
  SELECT id, version_number, review_status FROM guide_versions WHERE id = '<v1-versionId>';
  ```
  Expected: `review_status = 'archived'`

- [ ] **Step 4: Commit**

  ```bash
  git add NorthKeepAdmin/northkeep-admin/src/app/api/releases/
  git commit -m "fix: archive old published versions when newer version is released"
  ```

---

## Task 9: Batch Script — Flag 13 Guides for Images

**Files:**
- Create: `NorthKeepAdmin/northkeep-admin/scripts/flag-guides-for-images.ts`

- [ ] **Step 1: Create the script**

  ```typescript
  /**
   * Creates a new "needs_images" version for 13 published guides,
   * pre-populated with image sourcing stubs.
   *
   * Usage: npx tsx scripts/flag-guides-for-images.ts
   * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or ANON_KEY)
   */

  import { createClient } from "@supabase/supabase-js";
  import { readFileSync } from "fs";
  import { resolve } from "path";

  // Load .env.local
  try {
    const envLocal = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const line of envLocal.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch { /* .env.local may not exist */ }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or key");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  interface ImageStub {
    key: string;
    description: string;
    caption: string;
    altText: string;
    associatedStepIndex: number | null;
    storageUrl: null;
  }

  const IMAGE_STUBS: Record<string, ImageStub[]> = {
    "ground-to-air-symbols-for-aircraft": [
      { key: "symbol-chart", description: "Full 9-symbol ground-to-air signaling chart with each symbol, its name, and meaning. Line art style, black on white.", caption: "Standard ground-to-air symbols chart", altText: "Chart showing nine ground-to-air signals including SOS, need medical help, and need food", associatedStepIndex: null, storageUrl: null },
      { key: "sos-symbol", description: "Close-up of the SOS/distress symbol: a large X formed by two logs or stones. Include scale reference. Line art.", caption: "SOS / distress symbol close-up", altText: "Ground-to-air SOS distress symbol: large X made from logs", associatedStepIndex: 0, storageUrl: null },
    ],
    "cardiac-arrest-cpr-steps": [
      { key: "hand-position", description: "Rescuer kneeling beside victim, interlaced hands on center of lower sternum. Arms straight. No brand markings.", caption: "Hand placement on chest", altText: "Rescuer's interlaced hands positioned on center of chest for CPR compressions", associatedStepIndex: 1, storageUrl: null },
      { key: "airway-open", description: "Head-tilt chin-lift: one hand on forehead, two fingers under chin, tilting head back. Side profile.", caption: "Head-tilt chin-lift for airway", altText: "Head-tilt chin-lift technique to open airway for rescue breaths", associatedStepIndex: 6, storageUrl: null },
      { key: "compression-depth", description: "Side-view diagram: dashed line indicating target compression depth of ~2 inches (5 cm) on adult chest.", caption: "Compression depth guide (~2 in)", altText: "Diagram showing CPR compression depth of 2 inches on adult chest", associatedStepIndex: 1, storageUrl: null },
    ],
    "choking-responsive-adult-or-child": [
      { key: "heimlich-standing", description: "Rescuer standing behind adult with fist above navel, other hand covering fist, ready for abdominal thrust. Both facing away.", caption: "Abdominal thrust position (standing)", altText: "Rescuer positioned behind choking adult for standing abdominal thrusts", associatedStepIndex: 1, storageUrl: null },
      { key: "child-position", description: "Rescuer kneeling behind child ~5 years old, fist at correct lower abdominal position. Side view.", caption: "Positioning for a child", altText: "Rescuer kneeling behind child for age-appropriate Heimlich maneuver", associatedStepIndex: 2, storageUrl: null },
    ],
    "choking-unresponsive-adult-or-child": [
      { key: "ground-position", description: "Unconscious adult on back, rescuer straddling thighs, hands on abdomen just above navel. Overhead view.", caption: "Victim position on ground", altText: "Rescuer straddling unconscious choking victim on ground, preparing abdominal thrusts", associatedStepIndex: 0, storageUrl: null },
      { key: "ground-thrusts", description: "Heel of hand 1-2 inches above navel, second hand on top. Overhead view close-up.", caption: "Abdominal thrusts on ground", altText: "Hand placement for abdominal thrusts on unconscious choking victim", associatedStepIndex: 1, storageUrl: null },
    ],
    "mirror-and-light-signaling-land-day-and-night": [
      { key: "mirror-hold", description: "Person holding signal mirror at arm's length, angled toward sun. Shows correct grip and tilt. Background: open sky.", caption: "How to hold and angle the mirror", altText: "Person holding signal mirror at arm's length angled toward sun", associatedStepIndex: 0, storageUrl: null },
      { key: "finger-triangle", description: "V-finger triangle aiming: person forms a V with two fingers, aligns reflected light spot with target through the V. POV perspective.", caption: "Finger-triangle aiming method", altText: "Finger V-triangle aiming technique for directing signal mirror reflection", associatedStepIndex: 1, storageUrl: null },
    ],
    "bleeding-control-pressure-first": [
      { key: "direct-pressure", description: "Both hands flat on wound with folded cloth, firm downward pressure. Wound on forearm. No visible blood. Instructional style.", caption: "Both hands flat on wound with cloth", altText: "Both hands applying direct pressure on wound with cloth for bleeding control", associatedStepIndex: 0, storageUrl: null },
      { key: "wound-packing", description: "Gauze being packed into deep thigh wound using fingers. Packing motion shown by arrow. Clinical but not graphic.", caption: "Packing a deep wound", altText: "Gauze being packed into a deep wound for hemorrhage control", associatedStepIndex: 2, storageUrl: null },
    ],
    "immobilize-sprain-or-fracture": [
      { key: "improvised-splint", description: "Forearm splinted with two padded sticks, secured with fabric strips above and below injury. Clear knot placement.", caption: "Splint with padding and bandage", altText: "Improvised splint on forearm using sticks and cloth strips", associatedStepIndex: 2, storageUrl: null },
      { key: "ankle-wrap", description: "Figure-8 ankle wrap: 3 sequential panels — starting position, around heel, completing over top of foot.", caption: "Figure-8 ankle wrap", altText: "Sequential diagram of figure-8 ankle wrap technique", associatedStepIndex: 3, storageUrl: null },
    ],
    "natural-lean-to-frame-shelter": [
      { key: "ridgepole-setup", description: "Long straight pole (6-8 ft) resting in forks of two small trees at waist height. Background: forest.", caption: "Ridge pole between two trees", altText: "Long pole resting in forks of two trees forming lean-to ridge", associatedStepIndex: 0, storageUrl: null },
      { key: "angled-poles", description: "Multiple support poles leaning against ridge pole at ~45 degrees, evenly spaced.", caption: "Support poles leaning against ridge", altText: "Angled support poles placed against ridgepole for lean-to frame", associatedStepIndex: 1, storageUrl: null },
      { key: "completed-leanto", description: "Completed lean-to covered with pine boughs overlapping like shingles. Person standing beside for scale.", caption: "Finished lean-to structure", altText: "Completed natural lean-to shelter covered with branches and boughs", associatedStepIndex: null, storageUrl: null },
    ],
    "debris-hut-emergency-overnight": [
      { key: "ridgepole-frame", description: "Ridgepole (10-12 ft) with one end on forked-stick support (2 ft high) and other end on ground. Side profile.", caption: "Ridgepole on forked-stick frame", altText: "Ridgepole resting on forked-stick support showing basic debris hut frame", associatedStepIndex: 0, storageUrl: null },
      { key: "ribbing", description: "Cross-stick ribbing along both sides of ridgepole at 45 degrees. Ribcage shape. Slightly overhead view.", caption: "Cross-stick ribbing along ridgepole", altText: "Cross-stick ribbing on both sides of ridgepole for debris hut frame", associatedStepIndex: 1, storageUrl: null },
      { key: "completed-hut", description: "Ridgepole and ribbing covered with at least 3 feet of leaf debris. Small entrance visible. Person for scale.", caption: "Finished debris hut with insulation", altText: "Completed debris hut shelter covered in deep leaf and debris insulation", associatedStepIndex: null, storageUrl: null },
    ],
    "fast-tarp-lean-to-for-wind-and-rain": [
      { key: "ridgeline-tarp", description: "Tarp draped over ridgeline cord tied between two trees. One side staked to ground at 45 degrees.", caption: "Tarp draped over ridgeline", altText: "Tarp draped over ridgeline cord forming lean-to shelter", associatedStepIndex: 0, storageUrl: null },
      { key: "stake-pattern", description: "Top-down view: ridgeline cord anchors at 2 trees, 4 corner stakes shown with angles.", caption: "Tarp edge stake layout", altText: "Top-down diagram showing stake pattern for tarp lean-to shelter", associatedStepIndex: 1, storageUrl: null },
      { key: "completed-tarp", description: "Finished lean-to from front-side. Interior space visible, back wall staked taut. Person sheltering inside for scale.", caption: "Finished tarp lean-to", altText: "Completed tarp lean-to shelter with person inside for scale", associatedStepIndex: null, storageUrl: null },
    ],
    "low-a-frame-tarp-shelter-for-cold-nights": [
      { key: "low-ridgeline", description: "Ridge cord strung at knee height (~18-24 in) between two trees. Shows taut-line hitch adjustment.", caption: "Low ridge cord strung between trees", altText: "Low ridgeline cord at knee height between two trees for A-frame tarp", associatedStepIndex: 0, storageUrl: null },
      { key: "tarp-over-ridge", description: "Tarp draped symmetrically over low ridgeline, both sides staked to ground. Low A-frame profile. Side view.", caption: "Tarp draped and staked out", altText: "Tarp draped over low ridgeline and staked to ground forming A-frame", associatedStepIndex: 1, storageUrl: null },
      { key: "completed-aframe", description: "End-on view of completed low A-frame. Narrow entrance profile that retains body heat. Optional sleeping pad visible.", caption: "Finished A-frame from end view", altText: "End view of completed low A-frame tarp shelter showing heat-retaining profile", associatedStepIndex: null, storageUrl: null },
    ],
    "sos-morse-code": [
      { key: "sos-pattern", description: "SOS Morse code: three dots, three dashes, three dots (· · · — — — · · ·). Bold sans-serif, clearly spaced.", caption: "SOS dot-dash-dot pattern chart", altText: "SOS Morse code pattern: three short signals, three long, three short", associatedStepIndex: null, storageUrl: null },
      { key: "timing-diagram", description: "Horizontal timing bar: short (1 unit), long (3 units), element gap (1), letter gap (3). Full SOS sequence labeled with durations.", caption: "Signal vs pause timing guide", altText: "Timing diagram for SOS Morse code signal and pause durations", associatedStepIndex: 1, storageUrl: null },
    ],
    "layering-clothing-and-bedding-for-maximum-warmth": [
      { key: "layer-diagram", description: "Cross-section body diagram: base layer (moisture-wicking), mid layer (fleece/down insulation), outer layer (wind/waterproof shell). Arrows show heat/moisture flow.", caption: "Base / mid / outer layer diagram", altText: "Diagram of three clothing layers for warmth: base, insulating mid, and outer shell", associatedStepIndex: null, storageUrl: null },
      { key: "heat-trapping", description: "Cutaway diagram: trapped dead air between fabric layers, small arrows showing warm air held between fibers. Annotation: 'Trapped air = insulation'.", caption: "Dead-air insulation concept", altText: "Diagram showing dead-air insulation trapped between fabric layers for warmth", associatedStepIndex: 0, storageUrl: null },
    ],
  };

  async function main() {
    console.log("=== flag-guides-for-images ===\n");

    const slugs = Object.keys(IMAGE_STUBS);
    let created = 0, skipped = 0, failed = 0;

    for (const slug of slugs) {
      // 1. Find the guide
      const { data: guide, error: guideErr } = await supabase
        .from("guides")
        .select("id, slug, title")
        .eq("slug", slug)
        .single();

      if (guideErr || !guide) {
        console.error(`  ✗ ${slug}: guide not found`);
        failed++;
        continue;
      }

      // 2. Idempotency: skip if needs_images version already exists
      const { data: existing } = await supabase
        .from("guide_versions")
        .select("id, version_number")
        .eq("guide_id", guide.id)
        .eq("review_status", "needs_images")
        .limit(1)
        .maybeSingle();

      if (existing) {
        console.log(`  ⏭  ${slug}: v${existing.version_number} already flagged, skipping`);
        skipped++;
        continue;
      }

      // 3. Fetch latest version to copy content from
      const { data: latest, error: latestErr } = await supabase
        .from("guide_versions")
        .select("*")
        .eq("guide_id", guide.id)
        .order("version_number", { ascending: false })
        .limit(1)
        .single();

      if (latestErr || !latest) {
        console.error(`  ✗ ${slug}: no version found`);
        failed++;
        continue;
      }

      // 4. Validate + clamp stub step indexes
      const stepCount = (latest.step_by_step_actions as string[]).length;
      const stubs = IMAGE_STUBS[slug].map((stub) => {
        if (stub.associatedStepIndex !== null && stub.associatedStepIndex >= stepCount) {
          console.warn(
            `  ⚠  ${slug}: stub "${stub.key}" stepIndex ${stub.associatedStepIndex} ` +
            `out of range (${stepCount} steps) — setting to null`
          );
          return { ...stub, associatedStepIndex: null };
        }
        return stub;
      });

      // 5. Insert new version directly with needs_images status
      const { data: newVersion, error: insertErr } = await supabase
        .from("guide_versions")
        .insert({
          guide_id: guide.id,
          version_number: latest.version_number + 1,
          title: latest.title,
          category_id: latest.category_id,
          parent_topic_id: latest.parent_topic_id,
          layer: latest.layer,
          guide_type: latest.guide_type,
          summary: latest.summary,
          quick_answer: latest.quick_answer,
          when_to_use: latest.when_to_use,
          preferred_action: latest.preferred_action,
          backup_action: latest.backup_action,
          step_by_step_actions: latest.step_by_step_actions,
          warnings: latest.warnings,
          what_not_to_do: latest.what_not_to_do,
          red_flags: latest.red_flags,
          preparedness_tips: latest.preparedness_tips,
          source_quality: latest.source_quality,
          content_status: latest.content_status,
          integration_decision: latest.integration_decision,
          upgrades_guide: latest.upgrades_guide,
          related_guides: latest.related_guides,
          source_references: latest.source_references,
          app_tags: latest.app_tags,
          notes: latest.notes,
          response_role: latest.response_role,
          constraint_tags: latest.constraint_tags,
          blocked_by_constraints: latest.blocked_by_constraints,
          alternative_to_guide_slugs: latest.alternative_to_guide_slugs,
          images: stubs,
          review_status: "needs_images",
          change_summary: "Flagged for image sourcing",
        })
        .select("id, version_number")
        .single();

      if (insertErr || !newVersion) {
        console.error(`  ✗ ${slug}: insert failed — ${insertErr?.message}`);
        failed++;
        continue;
      }

      console.log(`  ✓ ${slug}: created v${newVersion.version_number} (${stubs.length} stubs)`);
      created++;
    }

    console.log(`\nDone — Created: ${created}  Skipped: ${skipped}  Failed: ${failed}`);
    if (failed > 0) process.exit(1);
  }

  main().catch((err) => { console.error(err); process.exit(1); });
  ```

- [ ] **Step 2: Run the script**

  ```bash
  cd NorthKeepAdmin/northkeep-admin
  npx tsx scripts/flag-guides-for-images.ts
  ```

  Expected output:
  ```
  === flag-guides-for-images ===

    ✓ ground-to-air-symbols-for-aircraft: created v2 (2 stubs)
    ✓ cardiac-arrest-cpr-steps: created v2 (3 stubs)
    ✓ choking-responsive-adult-or-child: created v2 (2 stubs)
    ✓ choking-unresponsive-adult-or-child: created v2 (2 stubs)
    ✓ mirror-and-light-signaling-land-day-and-night: created v2 (2 stubs)
    ✓ bleeding-control-pressure-first: created v2 (2 stubs)
    ✓ immobilize-sprain-or-fracture: created v2 (2 stubs)
    ✓ natural-lean-to-frame-shelter: created v2 (3 stubs)
    ✓ debris-hut-emergency-overnight: created v2 (3 stubs)
    ✓ fast-tarp-lean-to-for-wind-and-rain: created v2 (3 stubs)
    ✓ low-a-frame-tarp-shelter-for-cold-nights: created v2 (3 stubs)
    ✓ sos-morse-code: created v2 (2 stubs)
    ✓ layering-clothing-and-bedding-for-maximum-warmth: created v2 (2 stubs)

  Done — Created: 13  Skipped: 0  Failed: 0
  ```

  Any `⚠` warnings about step indexes are non-fatal — those stubs are set to `null`.

- [ ] **Step 3: Verify in the review queue**

  Navigate to `http://localhost:3000/review?filter=needs_images`. Should show 13 guide versions.

- [ ] **Step 4: Verify the Images tab**

  Navigate to any of the 13 guides (e.g. `http://localhost:3000/guides/cardiac-arrest-cpr-steps`). Click the "Images" tab. Should show the pending image stubs (amber "Awaiting upload" cards) and the "Add image" button at the bottom.

- [ ] **Step 5: Verify hard gate on one of the new versions**

  Get the version ID of one of the new v2 versions from the review queue. Try approving it:

  ```bash
  curl -s -X PATCH http://localhost:3000/api/guides/versions/<v2-versionId>/review-status \
    -H "Content-Type: application/json" \
    -d '{"review_status":"approved"}'
  ```

  Expected: `{"error":"At least one image must be uploaded before this version can be approved."}` (400)

- [ ] **Step 6: Commit**

  ```bash
  git add NorthKeepAdmin/northkeep-admin/scripts/flag-guides-for-images.ts
  git commit -m "feat: script to create needs_images versions for 13 guides with image stubs"
  ```

---

## Task 10: Final Build Check

- [ ] **Step 1: Run the full build**

  ```bash
  cd NorthKeepAdmin/northkeep-admin
  npm run build
  ```

  Expected: build completes without TypeScript errors. Next.js warnings about static/dynamic rendering are OK.

- [ ] **Step 2: Run lint**

  ```bash
  npm run lint
  ```

  Fix any errors. Warnings are acceptable.

- [ ] **Step 3: Final commit**

  ```bash
  git add -A
  git commit -m "chore: build and lint pass for needs_images + release dedup"
  ```
