# Design Spec: Needs Images Status + Guide Consolidation

**Date:** 2026-03-19
**Status:** Approved
**Scope:** Two parallel workstreams — (1) "Needs Images" review workflow with hard gate enforcement, and (2) duplicate guide consolidation with naming simplification skill.

---

## Workstream 1: "Needs Images" Review Status

### Overview

Add `needs_images` as a first-class value in the `review_status` workflow. Guides flagged for images land here before they can reach `approved`. A hard gate in the API blocks promotion to `approved` when a version has image stubs that are all un-uploaded (every `storageUrl` is null). The gate does not fire on versions with no image stubs at all (i.e. guides that were never flagged for images can still go draft → in_review → approved freely).

### Workflow Position

```
draft → in_review → needs_images → approved → published
```

`needs_images` is assigned either:
- Automatically, when new versions are created for the 13 flagged guides (see §1.4)
- Manually, when an admin changes a version's status to `needs_images` in the review queue

**Note:** The gate checks for uploaded images regardless of the prior status. A version that has image stubs (images.length > 0) but all `storageUrl === null` cannot be moved to `approved` by any path — whether the prior status was `needs_images`, `in_review`, or `draft`. This prevents bypassing the gate by skipping the `needs_images` state.

### 1.1 — Database Migration

The `review_status` column on `guide_versions` must accept the new value. To determine the column type, run `SELECT column_default, data_type, udt_name FROM information_schema.columns WHERE table_name = 'guide_versions' AND column_name = 'review_status'`. If `data_type = 'USER-DEFINED'` the column is a PostgreSQL enum; if `data_type = 'text'` it is a text column with a check constraint.

**If PostgreSQL enum:**
```sql
ALTER TYPE review_status ADD VALUE 'needs_images' BEFORE 'approved';
```

**If text column with check constraint (find constraint name first with `\d guide_versions`):**
```sql
ALTER TABLE guide_versions DROP CONSTRAINT <constraint_name>;
ALTER TABLE guide_versions
  ADD CONSTRAINT guide_versions_review_status_check
  CHECK (review_status IN ('draft', 'in_review', 'needs_images', 'approved', 'published', 'archived'));
```

### 1.2 — Code Changes

| File | Change |
|------|--------|
| `src/types/database.ts` | Add `"needs_images"` to `ReviewStatus` union type |
| `src/app/api/guides/versions/[versionId]/review-status/route.ts` | Add `"needs_images"` to `VALID_STATUSES`; add hard gate logic (see below) |
| `src/components/guides/review-status-select.tsx` | Add `{ value: "needs_images", label: "Needs images" }` to `STATUSES` array; add amber color to `STATUS_COLORS`; the existing `knownStatus` guard will resolve correctly once the value is added to `STATUSES` |
| `src/app/(dashboard)/review/page.tsx` | Add filter tab (`?filter=needs_images`, label "Needs images") + `else if (filter === "needs_images")` branch |
| `src/components/guides/guide-images-manager.tsx` | Add `reviewStatus: string` prop; add "Add Image" inline form (see §1.3) |
| `src/app/(dashboard)/guides/[slug]/page.tsx` | Pass `reviewStatus={latestVersion.review_status}` to the `<GuideImagesManager>` render call (currently only passes `versionId`, `guideSlug`, `initialImages`) |

**Hard gate logic in review-status route:**

Only runs when incoming `review_status === "approved"`. Steps:

1. Fetch the version record: `SELECT images FROM guide_versions WHERE id = versionId`
2. If `images.length > 0` AND every image has `storageUrl === null`:
   - Return `400: { error: "At least one image must be uploaded before this version can be approved." }`
3. Otherwise proceed with the update as normal

Fetch is conditional on the incoming status being `"approved"` — all other transitions skip this check entirely to avoid an unnecessary DB round-trip.

### 1.3 — Images Tab: Manual Upload Support

**Problem:** `GuideImagesManager` shows a read-only empty state message when `images.length === 0`, making it impossible to upload images on manually-assigned `needs_images` versions that have no AI-generated stubs.

**Change:** Add `reviewStatus: string` prop to `GuideImagesManager`. When `reviewStatus === "needs_images"`:

- Show an **"Add Image"** button that opens an inline form regardless of how many images already exist (always-visible, not just on empty state). The empty state message is replaced entirely by this button/form when `images.length === 0`.
- The form allows creating a new stub AND uploading the file in a single operation (file is required at submit — stub-only creation without a file is not supported; the `/api/guides/images/upload` endpoint requires a `file` field and will return 400 without it).

**Add Image form fields (user-entered):**
- `key` — unique slug-style ID (lowercase, hyphens only, e.g. `hand-position`); client-validates uniqueness against existing image keys
- `caption` — short label displayed under image on mobile
- `altText` — accessibility description
- `description` — optional admin sourcing note
- `Step association` — select: "Gallery (no step)" or Step 1…N (derived from step count on the version)
- `File` — JPEG/PNG/WebP, max 5 MB; **required**

**Fields injected from page context (not user-entered):**
- `versionId` — from the parent page's version record
- `guideSlug` — from the parent page's guide record

On submit: POST to `/api/guides/images/upload` with all fields combined (user-entered + context-injected). On success the new image appears in the Uploaded section and the form resets. On error, show inline error message.

`GuideDetailPage` must pass `reviewStatus` (from `latestVersion.review_status`) into `GuideImagesManager`.

### 1.4 — New Versions for 13 Published Guides

For each of the 13 guides below, create a new version (version_number = current + 1) that:
- Copies all content fields from the current published version verbatim
- Sets `review_status: "needs_images"`
- Sets `change_summary: "Flagged for image sourcing"`
- Populates `images` with the recommended stubs below (`storageUrl: null`)

**Implementation note:** The script must produce a full `NormalizedGuide` payload (camelCase fields per `src/types/normalized-export.ts`) for each guide, with the existing content from the current published version plus the new `images` array. For each guide, the script runs two sequential API calls:

1. `POST /api/guides/import?action=save` with body `{ guide: <NormalizedGuide>, changeSummary: "Flagged for image sourcing" }` — note `changeSummary` is a **top-level sibling** of `guide` in the request body, not a field inside the guide payload. The import route always creates the version at `review_status: "draft"`.
2. `PATCH /api/guides/versions/{versionId}/review-status` with body `{ review_status: "needs_images" }`, using the `versionId` returned by step 1.

**Idempotency / failure recovery:** Before calling step 1 for any guide, the script must check whether a version with `review_status: "needs_images"` already exists for that guide (query `guide_versions` by `guide_id`). If one already exists, skip that guide and log a skip message. This ensures a partial re-run from a mid-script failure does not create duplicate versions.

Before running, verify each stub's `associatedStepIndex` is within bounds of the guide's `step_by_step_actions.length - 1`; log a warning and set to `null` for any out-of-range index.

Each stub schema (camelCase, matches `NormalizedGuideImage`):
```typescript
{
  key: string,
  description: string,     // admin sourcing brief, never shown on mobile
  caption: string,
  altText: string,
  associatedStepIndex: number | null,
  storageUrl: null
}
```

**Image stubs per guide:**

| Guide slug | key | caption | associatedStepIndex |
|------------|-----|---------|---------------------|
| `ground-to-air-symbols-for-aircraft` | `symbol-chart` | Standard ground-to-air symbols chart | null |
| `ground-to-air-symbols-for-aircraft` | `sos-symbol` | SOS / distress symbol close-up | 0 |
| `cardiac-arrest-cpr-steps` | `hand-position` | Hand placement on chest | 1 |
| `cardiac-arrest-cpr-steps` | `airway-open` | Head-tilt chin-lift for airway | 6 |
| `cardiac-arrest-cpr-steps` | `compression-depth` | Compression depth guide (~2 in) | 1 |
| `choking-responsive-adult-or-child` | `heimlich-standing` | Abdominal thrust position (standing) | 1 |
| `choking-responsive-adult-or-child` | `child-position` | Positioning for a child | 2 |
| `choking-unresponsive-adult-or-child` | `ground-position` | Victim position on ground | 0 |
| `choking-unresponsive-adult-or-child` | `ground-thrusts` | Abdominal thrusts on ground | 1 |
| `mirror-and-light-signaling-land-day-and-night` | `mirror-hold` | How to hold and angle the mirror | 0 |
| `mirror-and-light-signaling-land-day-and-night` | `finger-triangle` | Finger-triangle aiming method | 1 |
| `bleeding-control-pressure-first` | `direct-pressure` | Both hands flat on wound with cloth | 0 |
| `bleeding-control-pressure-first` | `wound-packing` | Packing a deep wound | 2 |
| `immobilize-sprain-or-fracture` | `improvised-splint` | Splint with padding and bandage | 2 |
| `immobilize-sprain-or-fracture` | `ankle-wrap` | Figure-8 ankle wrap | 3 |
| `natural-lean-to-frame-shelter` | `ridgepole-setup` | Ridge pole between two trees | 0 |
| `natural-lean-to-frame-shelter` | `angled-poles` | Support poles leaning against ridge | 1 |
| `natural-lean-to-frame-shelter` | `completed-leanto` | Finished lean-to structure | null |
| `debris-hut-emergency-overnight` | `ridgepole-frame` | Ridgepole on forked-stick frame | 0 |
| `debris-hut-emergency-overnight` | `ribbing` | Cross-stick ribbing along ridgepole | 1 |
| `debris-hut-emergency-overnight` | `completed-hut` | Finished debris hut with insulation | null |
| `fast-tarp-lean-to-for-wind-and-rain` | `ridgeline-tarp` | Tarp draped over ridgeline | 0 |
| `fast-tarp-lean-to-for-wind-and-rain` | `stake-pattern` | Tarp edge stake layout | 1 |
| `fast-tarp-lean-to-for-wind-and-rain` | `completed-tarp` | Finished tarp lean-to | null |
| `low-a-frame-tarp-shelter-for-cold-nights` | `low-ridgeline` | Low ridge cord strung between trees | 0 |
| `low-a-frame-tarp-shelter-for-cold-nights` | `tarp-over-ridge` | Tarp draped and staked out | 1 |
| `low-a-frame-tarp-shelter-for-cold-nights` | `completed-aframe` | Finished A-frame from end view | null |
| `sos-morse-code` | `sos-pattern` | SOS dot-dash-dot pattern chart | null |
| `sos-morse-code` | `timing-diagram` | Signal vs pause timing guide | 1 |
| `layering-clothing-and-bedding-for-maximum-warmth` | `layer-diagram` | Base / mid / outer layer diagram | null |
| `layering-clothing-and-bedding-for-maximum-warmth` | `heat-trapping` | Dead-air insulation concept | 0 |

---

## Workstream 2: Release Deduplication Fix

### 2.1 — Bug

Both `POST /api/releases/[id]/publish` and `POST /api/releases/bulk-publish` auto-archive superseded versions on publish, but exclude `published` versions from archiving:

```typescript
// Current — skips archiving the old "published" version:
.not("review_status", "in", "(archived,published)")
```

When v1 is `published` and v2 is being released, v1 stays `published` instead of getting archived.

### 2.2 — Fix

Apply the following identical change to **both** route files:
- `src/app/api/releases/[id]/publish/route.ts` (the `.not(...)` call in the auto-archive block, step 4)
- `src/app/api/releases/bulk-publish/route.ts` (the `.not(...)` call in the auto-archive block, step 6)

```typescript
// Before:
.not("review_status", "in", "(archived,published)")

// After:
.not("review_status", "eq", "archived")
```

This ensures the old `published` version is archived when a newer version of the same guide is released. This behavior — archiving all non-archived siblings when a newer version is released — already existed before this fix for `draft` and `in_review` siblings; the fix simply extends it to `published` siblings as well. `needs_images` siblings are also archived as a result, which is the correct and intended behavior (orphaned `needs_images` versions should not persist after a newer version is released).

---

## Workstream 3: Duplicate Guide Consolidation

### Naming Rule

Always keep the **shorter/simpler slug** as the canonical. Merge content from the longer-named guide into the simpler survivor via the `northkeep-consolidator` pipeline skill.

### Consolidation Table

| Cluster | Keep (slug) | Archive (slug) | Method |
|---------|-------------|----------------|--------|
| Food safety | `food-safety-no-fridge` | `food-preservation`, `food-safety-power-outage-action` | B — two sequential consolidator runs (see note below) |
| Emergency water storage | `emergency-water-storage` | `emergency-water-storage-at-home` | B |
| Stay put vs move | `stay-put-vs-move` | `stay-put-vs-move-land` | B |
| Sprains | `immobilize-sprain-or-fracture` (30 chars) | `sprains-and-suspected-fractures` (32 chars) | B — `immobilize-sprain-or-fracture` is also in WS1 needs-images list; keep and image-flag it |
| Go-bag | `evacuation-go-bag` | `personal-evacuation-go-bag-adult` | B |
| 72-hour kit | `build-72-hour-kit` | `72-hour-home-survival-kit-shelter-at-home` | B |
| Family plan | `family-emergency-plan` | `basic-family-emergency-communication-plan` | B |
| Sanitation shell | `emergency-toilet-and-waste-management` | `sanitation-waste-basics` (0-step shell) | A — shell only, no content to merge |

**Food safety three-way merge note:** The `northkeep-consolidator` skill accepts exactly two guides as input. For the three-guide food cluster, run the consolidator twice: run 1 merges `food-safety-no-fridge` + `food-preservation` → improved draft; run 2 merges the run-1 output + `food-safety-power-outage-action` → final draft. Archive both `food-preservation` and `food-safety-power-outage-action` after the final draft is imported. (Title rename of the survivor to something cleaner is a follow-on task for the title simplifier skill — out of scope here.)

### Archive Operation

For each archived guide (applies immediately to Option A; after consolidator import for Option B):
1. Set `review_status: "archived"` on all versions of the guide
2. Set `is_active: false` on the `guides` record
3. On the **latest non-archived version** of the survivor guide (highest `version_number` where `review_status != "archived"`), append to `notes`: `"Consolidated from <archived-slug> on 2026-03-19"`

Option B consolidation pipeline runs are **out of scope** for this implementation ticket — they are separate pipeline runs using the `northkeep-consolidator` skill, one cluster at a time. This ticket covers: the Option A archive operation for the sanitation shell, and the tracking/scaffolding setup for all Option B clusters (a `consolidation-queue.json` artifact listing each cluster's keep/archive/method).

---

## Workstream 4: Title Simplification Skill

### Skill Location

`skills/northkeep-title-simplifier/SKILL.md`

**Creation is in scope for this ticket.** The skill file must be created at this path as part of the implementation. It does not need to be a complete production skill at launch — a working draft with the process steps below is sufficient.

### Process

1. Pull all active guide titles, slugs, and guide IDs from the DB
2. Flag any title matching one or more rules:
   - Over 55 characters (threshold based on the admin table column width where truncation begins)
   - Contains a colon-separated subtitle that restates the parent concept (e.g. "Tornado Safety: Take Shelter Immediately" → "Take Shelter in a Tornado")
   - Parenthetical elaboration that adds length without clarity (e.g. "Beacon and Locator Basics (PLB, EPIRB, Satellite Messengers)" → "Beacon and Locator Basics")
   - Passive or noun-heavy phrasing where action phrasing is clearer (e.g. "Wound Infection Identification" → "Identify a Wound Infection")
3. For each flagged title, propose a simplified version (≤50 chars preferred, action-verb lead where appropriate)
4. Output a review table: `slug | current title | proposed title | rule triggered`
5. Present to admin for approval; admin marks each row approve/skip
6. Apply approved renames atomically per guide:
   - Use a single Supabase transaction (or sequential writes with rollback on failure) to update both `guides.title` (base record) and `title` on the latest non-archived `guide_versions` record for that guide. If only one write succeeds, log the inconsistency and surface it as a warning in the output artifact.
7. Write a `rename-log.json` artifact in the working folder listing every rename applied: `{ slug, oldTitle, newTitle, date }`

### Pipeline Position

This skill is a **maintenance step**, not part of the standard 8-step pipeline. It slots as an optional step during Planning when the planner identifies titles worth simplifying. Add a reference to it in `northkeep-skill-pipeline-architecture.md` under a new "Maintenance Skills" section.

---

## Out of Scope

- Running `northkeep-consolidator` for Option B clusters (separate tasks per cluster, each with their own pipeline run folder)
- Renaming `food-safety-no-fridge` after consolidation (handled by title simplifier as a follow-on)
- Mobile app changes — images are already consumed from `storageUrl` in the guide version
- New constraint tags
- Changing the release UI beyond the two-line backend fix
