# Knowledge Update Flow + Admin Release Column

**Date:** 2026-03-20
**Status:** Approved

## Overview

Two independent features preparing the app for App Store launch:

- **Feature A (Mobile):** Remove redundant "offline" labels from Knowledge screen, add a banner-based guide update flow
- **Feature B (Admin):** Add a "Release" column to the Review Queue and All Guides tables

---

## Feature A: Knowledge Page — Remove "offline" + Update Banner

### Problem

The Knowledge screen shows "· offline" next to every category and in the header subtitle. Since all guides are always stored locally, this is redundant. Additionally, there's no user-facing way to discover and confirm guide updates — the delta sync runs silently.

### Changes

#### 1. Remove "offline" labels

Two locations in `NorthKeep/artifacts/survival-app/app/(tabs)/knowledge.tsx`:

- **Header subtitle** (line ~381): `${totalGuides} guides · offline` → `${totalGuides} guides`
- **Category card subtitle** (line ~159): `{count} guides · offline` → `{count} guides`

#### 2. Update banner

A banner appears at the top of the Knowledge screen (below the header, above the search bar) when `updateAvailable` is true.

**Banner states:**

| State | Display |
|-------|---------|
| Update available | Icon + "Guide updates available" + "Update" button |
| Fetching details | Icon + "Checking for updates..." + spinner |
| Confirming | Alert dialog with list of new/updated guides |
| Syncing | Icon + "Downloading updates..." + spinner |
| Complete | Banner disappears, guide list refreshes |
| Error | Icon + "Update failed — tap to retry" + dismiss (×) button |

**Flow:**

1. `checkForUpdates()` (already exists in `GuideStoreContext`) sets `updateAvailable` flag and populates `globalMetadata` (which includes titles for all guides in the latest release)
2. Banner renders when `updateAvailable === true`
3. User taps "Update" → app calls new `fetchUpdateDetails()`:
   - Fetches latest release manifest from Supabase (slug → versionId mapping)
   - Compares against local manifest from SQLite (`getLocalManifest()` already exists)
   - Resolves titles for new/changed slugs using the already-loaded `globalMetadata` array (no extra Supabase query needed)
   - Returns `{ newGuides: {slug, title}[], updatedGuides: {slug, title}[], count: number }`
4. Shows Alert dialog:
   - Title: "Guide Updates Available"
   - Body: Lists new and updated guide titles (e.g., "New: Fire Safety Basics, ...")
   - Buttons: "Cancel" / "Download"
5. User confirms → `deltaSync()` runs (already exists, re-fetches manifest independently — acceptable since releases don't change frequently)
6. On success: `updateAvailable` resets to false, banner disappears, guide list refreshes
7. On error: banner shows retry state with a dismiss (×) button to clear it

**Note on deltaSync re-fetch:** `deltaSync()` independently re-fetches the manifest rather than accepting a pre-computed diff. This is acceptable because releases are infrequent and the time between preview and confirm is seconds. The slight redundancy is simpler than threading state through.

**Architecture:**

- `fetchUpdateDetails()` — new function in `GuideStoreContext`, uses `globalMetadata` (already populated by `checkForUpdates()`) plus local manifest comparison
- `deltaSync()` — unchanged, performs the actual download
- Banner component — extracted to `components/UpdateBanner.tsx` (6 states warrants its own file to keep `knowledge.tsx` manageable)
- Banner component receives: `updateAvailable`, `fetchUpdateDetails`, `deltaSync`, and local state for banner phase

**First-launch behavior:** Unchanged. Bundled snapshot seeds on install, then silent auto-delta-sync. The banner only appears for subsequent updates when the user already has an older release cached locally.

---

## Feature B: Admin Dashboard — Release Column

### Problem

The admin dashboard's Review Queue and All Guides tables don't show which release a guide version belongs to. This makes it hard to track what's been published where.

### Changes

#### 1. Review Queue (`/review/page.tsx`)

**Query change:** Add nested join to existing `guide_versions` query. Use actual foreign key constraint names (verify in Supabase dashboard — convention is `{table}_{column}_fkey`):

```sql
guide_release_items!guide_release_items_guide_version_id_fkey(
  guide_releases!guide_release_items_release_id_fkey(semantic_version, status)
)
```

**Column:** Add "Release" after "Source quality":
- Shows `semantic_version` (e.g., "v1.2.0") for the version's published release
- Shows "—" if not in any release
- If in multiple releases: client-side filter to `status === 'published'`, sort by `semantic_version` descending, take first
- If only in draft releases: show version with "(draft)" suffix as visual indicator

**Client-side logic for release extraction:**
```typescript
function getRelease(releaseItems: any[]): string {
  if (!releaseItems?.length) return "—";
  const releases = releaseItems.flatMap(ri =>
    Array.isArray(ri.guide_releases) ? ri.guide_releases : [ri.guide_releases]
  ).filter(Boolean);
  const published = releases.filter(r => r.status === "published");
  if (published.length) {
    return published.sort((a, b) => b.semantic_version.localeCompare(a.semantic_version))[0].semantic_version;
  }
  const draft = releases.filter(r => r.status === "draft");
  if (draft.length) return `${draft[0].semantic_version} (draft)`;
  return "—";
}
```

#### 2. All Guides (`/guides/page.tsx`)

**Query change:** Add nested join inside the existing `guide_versions!guide_id(...)` select:

```sql
guide_versions!guide_id(
  version_number, review_status, content_status, guide_type, layer, response_role,
  guide_release_items!guide_release_items_guide_version_id_fkey(
    guide_releases!guide_release_items_release_id_fkey(semantic_version, status)
  )
)
```

**Column:** Add "Release" after "Status":
- For the latest version of each guide (determined by sorting `version_number` desc), extract its release using the same `getRelease()` helper
- Shows release version or "—"

Both columns are read-only display. No interactions or filtering needed for v1.

**TypeScript:** The response shape changes with the new joins. Update inline type assertions where the data is destructured to account for the `guide_release_items` nesting.

---

## Files Affected

### Mobile App (`NorthKeep/artifacts/survival-app/`)

| File | Change |
|------|--------|
| `app/(tabs)/knowledge.tsx` | Remove "offline" text (2 places), render `<UpdateBanner />` |
| `contexts/GuideStoreContext.tsx` | Add `fetchUpdateDetails()` function, expose via context |
| `components/UpdateBanner.tsx` | New file — banner with 6 states for guide updates |

### Admin App (`NorthKeepAdmin/northkeep-admin/src/`)

| File | Change |
|------|--------|
| `app/(dashboard)/review/page.tsx` | Expand query join, add Release column, add `getRelease()` helper |
| `app/(dashboard)/guides/page.tsx` | Expand query join, add Release column, reuse `getRelease()` helper |

---

## Out of Scope

- Pull-to-refresh gesture for guide updates
- Automatic background update checks on a timer
- Release column filtering/sorting in admin tables
- Notification badges for updates
