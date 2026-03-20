# Knowledge Update Flow + Admin Release Column — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove "offline" labels from Knowledge screen, add confirmation-based guide update flow, and add Release columns to admin guide tables.

**Architecture:** Two independent features. Feature A enhances the existing update banner in the mobile app's Knowledge screen to show a confirmation dialog listing new/updated guides before syncing. The banner is extracted to its own component. Feature B adds a Supabase join through `guide_release_items` → `guide_releases` to both admin tables. No new dependencies.

**Tech Stack:** React Native (Expo), Next.js, Supabase PostgREST, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-20-knowledge-update-flow-and-admin-release-column-design.md`

---

## File Structure

### Mobile App (`NorthKeep/artifacts/survival-app/`)

| File | Action | Responsibility |
|------|--------|----------------|
| `app/(tabs)/knowledge.tsx` | Modify | Remove "offline" text (2 places), replace inline banner with `<UpdateBanner />` |
| `components/UpdateBanner.tsx` | Create | Self-contained update banner with 4 visual states + confirmation dialog |
| `contexts/GuideStoreContext.tsx` | Modify | Add `fetchUpdateDetails()` function, expose via context |

### Admin App (`NorthKeepAdmin/northkeep-admin/src/`)

| File | Action | Responsibility |
|------|--------|----------------|
| `app/(dashboard)/review/page.tsx` | Modify | Add `guide_release_items` join to query, add Release column |
| `app/(dashboard)/guides/page.tsx` | Modify | Add `guide_release_items` join to query, add Release column |

---

## Task 1: Remove "offline" text from Knowledge screen

**Files:**
- Modify: `NorthKeep/artifacts/survival-app/app/(tabs)/knowledge.tsx:159, 381`

- [ ] **Step 1: Remove "offline" from category card subtitle**

At line 159, change:
```
{count} {count === 1 ? "guide" : "guides"}  ·  offline
```
to:
```
{count} {count === 1 ? "guide" : "guides"}
```

- [ ] **Step 2: Remove "offline" from header subtitle**

At line 381, change:
```
`${totalGuides} guides · offline`
```
to:
```
`${totalGuides} guides`
```

- [ ] **Step 3: Verify in preview**

Start the Mobile App (Expo Web) preview server. Navigate to Knowledge tab. Confirm:
- Header shows "208 guides" (no "offline")
- Each category card shows "27 guides" (no "offline")

- [ ] **Step 4: Commit**

```bash
git add NorthKeep/artifacts/survival-app/app/\(tabs\)/knowledge.tsx
git commit -m "fix: remove redundant 'offline' labels from Knowledge screen"
```

---

## Task 2: Add `fetchUpdateDetails()` to GuideStoreContext

**Files:**
- Modify: `NorthKeep/artifacts/survival-app/contexts/GuideStoreContext.tsx`

**Context:** `globalMetadata` is a `Guide[]` already loaded by `checkForUpdates()` (line 241). It contains titles for all guides in the latest release. `getLocalManifest()` returns a `Map<string, string>` of slug → versionId. `fetchReleaseManifest()` returns `{slug, versionId}[]`. The context is created with `createContext<GuideStoreContextValue | null>(null)` — the default is `null`, not an object, so only the type definition and provider value need updating.

- [ ] **Step 1: Add the `fetchUpdateDetails` function**

Add after the existing `checkForUpdates` function (after line 253). This function computes the diff between remote and local manifests, then resolves guide titles from `globalMetadata`:

```typescript
const fetchUpdateDetails = useCallback(async (): Promise<{
  newGuides: { slug: string; title: string }[];
  updatedGuides: { slug: string; title: string }[];
  count: number;
} | null> => {
  try {
    const release = await fetchLatestRelease();
    if (!release) return null;

    const remoteManifest = await fetchReleaseManifest(release.id);
    const remoteMap = new Map(remoteManifest.map((r) => [r.slug, r.versionId]));
    const localMap = await getLocalManifest();

    const newSlugs: string[] = [];
    const updatedSlugs: string[] = [];

    for (const [slug, versionId] of remoteMap) {
      if (!localMap.has(slug)) {
        newSlugs.push(slug);
      } else if (localMap.get(slug) !== versionId) {
        updatedSlugs.push(slug);
      }
    }

    const titleMap = new Map(globalMetadata.map((g) => [g.slug, g.title]));

    const resolve = (slugs: string[]) =>
      slugs.map((slug) => ({ slug, title: titleMap.get(slug) ?? slug }));

    return {
      newGuides: resolve(newSlugs),
      updatedGuides: resolve(updatedSlugs),
      count: newSlugs.length + updatedSlugs.length,
    };
  } catch {
    return null;
  }
}, [globalMetadata]);
```

- [ ] **Step 2: Expose `fetchUpdateDetails` via context**

Add `fetchUpdateDetails` to the `GuideStoreContextValue` type definition (search for the interface/type — add alongside `deltaSync` and `checkForUpdates`):
```typescript
fetchUpdateDetails: () => Promise<{
  newGuides: { slug: string; title: string }[];
  updatedGuides: { slug: string; title: string }[];
  count: number;
} | null>;
```

Add `fetchUpdateDetails` to the context provider value object (around line 420-430, alongside `deltaSync` and `checkForUpdates`).

- [ ] **Step 3: Verify build**

Run `npx expo start --web --port 19006` and confirm no TypeScript or build errors in the console.

- [ ] **Step 4: Commit**

```bash
git add NorthKeep/artifacts/survival-app/contexts/GuideStoreContext.tsx
git commit -m "feat: add fetchUpdateDetails() for guide update preview"
```

---

## Task 3: Create UpdateBanner component and wire it into Knowledge screen

**Files:**
- Create: `NorthKeep/artifacts/survival-app/components/UpdateBanner.tsx`
- Modify: `NorthKeep/artifacts/survival-app/app/(tabs)/knowledge.tsx:268-271, 431-452`

**Context:** The existing banner (lines 431-452 of knowledge.tsx) shows "New guides available" and directly calls `handleDeltaSync()` on press. We're extracting it to a self-contained component with a confirmation step.

- [ ] **Step 1: Create `components/UpdateBanner.tsx`**

Create a new file with the complete banner component. This component manages its own phase state and renders all 4 visual states (idle, fetching, syncing, error):

```typescript
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

type UpdateDetails = {
  newGuides: { slug: string; title: string }[];
  updatedGuides: { slug: string; title: string }[];
  count: number;
};

type Props = {
  fetchUpdateDetails: () => Promise<UpdateDetails | null>;
  deltaSync: () => Promise<void>;
};

type BannerPhase = "idle" | "fetching" | "syncing" | "error";

export function UpdateBanner({ fetchUpdateDetails, deltaSync }: Props) {
  const [phase, setPhase] = useState<BannerPhase>("idle");

  const handlePress = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase("fetching");

    const details = await fetchUpdateDetails();
    if (!details || details.count === 0) {
      setPhase("syncing");
      await deltaSync();
      setPhase("idle");
      return;
    }

    const lines: string[] = [];
    if (details.newGuides.length > 0) {
      lines.push(`New (${details.newGuides.length}):`);
      details.newGuides.slice(0, 10).forEach((g) => lines.push(`  • ${g.title}`));
      if (details.newGuides.length > 10) lines.push(`  … and ${details.newGuides.length - 10} more`);
    }
    if (details.updatedGuides.length > 0) {
      if (lines.length > 0) lines.push("");
      lines.push(`Updated (${details.updatedGuides.length}):`);
      details.updatedGuides.slice(0, 10).forEach((g) => lines.push(`  • ${g.title}`));
      if (details.updatedGuides.length > 10) lines.push(`  … and ${details.updatedGuides.length - 10} more`);
    }

    if (Platform.OS === "web") {
      // Web doesn't support Alert.alert — sync directly
      setPhase("syncing");
      await deltaSync();
      setPhase("idle");
      return;
    }

    Alert.alert(
      "Guide Updates Available",
      lines.join("\n"),
      [
        { text: "Cancel", style: "cancel", onPress: () => setPhase("idle") },
        {
          text: "Download",
          onPress: async () => {
            setPhase("syncing");
            try {
              await deltaSync();
            } catch {
              setPhase("error");
              return;
            }
            setPhase("idle");
          },
        },
      ],
      { cancelable: false }
    );
  };

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <Pressable
        style={({ pressed }) => [
          styles.banner,
          pressed && phase === "idle" && { opacity: 0.8 },
          phase === "error" && styles.bannerError,
        ]}
        onPress={phase === "error" || phase === "idle" ? handlePress : undefined}
        disabled={phase === "fetching" || phase === "syncing"}
      >
        {phase === "fetching" ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.text}>Checking for updates…</Text>
          </>
        ) : phase === "syncing" ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.text}>Downloading updates…</Text>
          </>
        ) : phase === "error" ? (
          <>
            <Ionicons name="alert-circle-outline" size={16} color="#fff" />
            <Text style={styles.text}>Update failed — tap to retry</Text>
            <Pressable
              onPress={() => setPhase("idle")}
              hitSlop={8}
              style={{ marginLeft: "auto" }}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </Pressable>
          </>
        ) : (
          <>
            <Ionicons name="cloud-download-outline" size={16} color="#fff" />
            <Text style={styles.text}>New guides available</Text>
            <Text style={styles.action}>Update</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#2C6B4F",
    borderRadius: 12,
  },
  bannerError: {
    backgroundColor: "#C0392B",
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  action: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textDecorationLine: "underline",
  },
});
```

**Note on styles:** The banner styles above are extracted from the existing `updateBanner`, `updateBannerText`, and `updateBannerAction` styles in `knowledge.tsx`'s `makeStyles`. After verifying the exact values in the next step, adjust colors/padding if they differ. The key addition is `bannerError` with the red background.

- [ ] **Step 2: Verify the existing banner styles in knowledge.tsx**

Read the `makeStyles` function in `knowledge.tsx` and find the existing `updateBanner`, `updateBannerText`, and `updateBannerAction` styles. Copy the exact property values into `UpdateBanner.tsx` styles if they differ from Step 1. The component uses its own StyleSheet (not theme-dependent, since the banner is always green/red on white text).

- [ ] **Step 3: Replace the inline banner in knowledge.tsx**

First, add the import at the top of `knowledge.tsx`:
```typescript
import { UpdateBanner } from "@/components/UpdateBanner";
```

Add `fetchUpdateDetails` to the `useGuideStore()` destructuring (line ~221-233):
```typescript
const {
  guides: allGuides,
  updateAvailable,
  isDownloadingAll,
  isSeedingFromBundle,
  deltaSync,
  fetchUpdateDetails,  // ← add this
  availableCategories,
  downloadedCategories,
  onlineGuidesCache,
  onlineFetchingCategories,
  fetchOnlineGuides,
  globalMetadata,
} = useGuideStore();
```

Remove the `handleDeltaSync` function (lines 268-271) entirely.

Replace the existing banner block (lines 431-452) with:
```jsx
{view === "categories" && (updateAvailable || isDownloadingAll) ? (
  <UpdateBanner
    fetchUpdateDetails={fetchUpdateDetails}
    deltaSync={deltaSync}
  />
) : null}
```

- [ ] **Step 4: Clean up unused banner styles in knowledge.tsx**

In the `makeStyles` function, remove these styles (they're now in `UpdateBanner.tsx`):
- `updateBanner`
- `updateBannerText`
- `updateBannerAction`

Only remove them if they are not used elsewhere in the file (search first).

- [ ] **Step 5: Verify in preview**

Reload the Expo Web preview. Navigate to Knowledge tab. Confirm:
- If no update is available, no banner shows
- No console errors or TypeScript build errors
- The banner renders correctly when `updateAvailable` is true (if you can simulate this)

- [ ] **Step 6: Commit**

```bash
git add NorthKeep/artifacts/survival-app/components/UpdateBanner.tsx NorthKeep/artifacts/survival-app/app/\(tabs\)/knowledge.tsx
git commit -m "feat: extract UpdateBanner component with confirmation dialog"
```

---

## Task 4: Add Release column to Review Queue

**Files:**
- Modify: `NorthKeepAdmin/northkeep-admin/src/app/(dashboard)/review/page.tsx`

**Context:** The existing query (lines 26-42) fetches `guide_versions` with a join to `guides`. The table header is at lines 121-129, body rows at 136-156. The FK constraint name for guide_release_items → guide_versions is `guide_release_items_guide_version_id_fkey` (confirmed from mobile codebase at `supabase-guide-service.ts:52`).

- [ ] **Step 1: Add a `getRelease` helper function**

Add at the top of the file (after imports, before the component function):
```typescript
function getRelease(releaseItems: unknown): string {
  const items = Array.isArray(releaseItems) ? releaseItems : [];
  if (items.length === 0) return "—";

  const releases = items
    .map((ri: Record<string, unknown>) => {
      const rel = ri.guide_releases;
      return Array.isArray(rel) ? rel[0] : rel;
    })
    .filter(Boolean) as { semantic_version: string; status: string }[];

  const published = releases.filter((r) => r.status === "published");
  if (published.length > 0) {
    return published.sort((a, b) =>
      b.semantic_version.localeCompare(a.semantic_version)
    )[0].semantic_version;
  }

  const draft = releases.filter((r) => r.status === "draft");
  if (draft.length > 0) return `${draft[0].semantic_version} (draft)`;

  return "—";
}
```

- [ ] **Step 2: Expand the Supabase query**

In the `.select()` call (lines 28-39), add the release items join. Change:
```typescript
.select(
  `
  id,
  guide_id,
  version_number,
  title,
  review_status,
  content_status,
  source_quality,
  updated_at,
  guides!guide_id(slug, title)
`
)
```
to:
```typescript
.select(
  `
  id,
  guide_id,
  version_number,
  title,
  review_status,
  content_status,
  source_quality,
  updated_at,
  guides!guide_id(slug, title),
  guide_release_items!guide_release_items_guide_version_id_fkey(
    guide_releases(semantic_version, status)
  )
`
)
```

Note: The join from `guide_release_items` to `guide_releases` uses the implicit FK (no disambiguation needed since there's only one FK from `guide_release_items` to `guide_releases`). Only the join FROM `guide_versions` TO `guide_release_items` needs the explicit constraint name.

- [ ] **Step 3: Add the Release column header**

In the table header (lines 121-129), add after the "Source quality" `<TableHead>`:
```tsx
<TableHead>Release</TableHead>
```

- [ ] **Step 4: Add the Release column cell in table body**

In the table body row, add after the source_quality `<TableCell>` (line 147):
```tsx
<TableCell className="text-muted-foreground text-sm">
  {getRelease((v as Record<string, unknown>).guide_release_items)}
</TableCell>
```

- [ ] **Step 5: Verify in preview**

Start the Admin Portal preview server. Navigate to `/review`. Confirm:
- "Release" column appears in the table header
- Published versions show their semantic version (e.g., "v1.0.0")
- Unpublished versions show "—"
- No console errors

- [ ] **Step 6: Commit**

```bash
git add NorthKeepAdmin/northkeep-admin/src/app/\(dashboard\)/review/page.tsx
git commit -m "feat: add Release column to review queue"
```

---

## Task 5: Add Release column to All Guides table

**Files:**
- Modify: `NorthKeepAdmin/northkeep-admin/src/app/(dashboard)/guides/page.tsx`

**Context:** The existing query (lines 45-60) fetches `guides` with nested `guide_versions!guide_id(...)`. The latest version is extracted at lines 149-152 by sorting `version_number` desc. The table header is at lines 135-143, body at 159-185.

- [ ] **Step 1: Add the same `getRelease` helper**

Copy the `getRelease` function from Task 4 and add it at the top of this file (after imports):
```typescript
function getRelease(releaseItems: unknown): string {
  const items = Array.isArray(releaseItems) ? releaseItems : [];
  if (items.length === 0) return "—";

  const releases = items
    .map((ri: Record<string, unknown>) => {
      const rel = ri.guide_releases;
      return Array.isArray(rel) ? rel[0] : rel;
    })
    .filter(Boolean) as { semantic_version: string; status: string }[];

  const published = releases.filter((r) => r.status === "published");
  if (published.length > 0) {
    return published.sort((a, b) =>
      b.semantic_version.localeCompare(a.semantic_version)
    )[0].semantic_version;
  }

  const draft = releases.filter((r) => r.status === "draft");
  if (draft.length > 0) return `${draft[0].semantic_version} (draft)`;

  return "—";
}
```

- [ ] **Step 2: Expand the Supabase query**

In the `.select()` call (lines 47-58), add the release join inside the existing `guide_versions` select. Change:
```typescript
guide_versions!guide_id(version_number, review_status, content_status, guide_type, layer, response_role)
```
to:
```typescript
guide_versions!guide_id(
  version_number, review_status, content_status, guide_type, layer, response_role,
  guide_release_items!guide_release_items_guide_version_id_fkey(
    guide_releases(semantic_version, status)
  )
)
```

- [ ] **Step 3: Add the Release column header**

In the table header (lines 135-143), add after the "Status" `<TableHead>`:
```tsx
<TableHead>Release</TableHead>
```

- [ ] **Step 4: Add the Release column cell in table body**

After extracting the latest version (lines 149-152), the `latest` variable holds the version object. Add the release cell after the Status `<TableCell>` (around line 181):
```tsx
<TableCell className="text-muted-foreground text-sm">
  {getRelease((latest as Record<string, unknown>)?.guide_release_items)}
</TableCell>
```

- [ ] **Step 5: Verify in preview**

Navigate to `/guides` in the admin portal. Confirm:
- "Release" column appears
- Guides with published versions show release versions
- Guides without releases show "—"
- No console errors

- [ ] **Step 6: Commit**

```bash
git add NorthKeepAdmin/northkeep-admin/src/app/\(dashboard\)/guides/page.tsx
git commit -m "feat: add Release column to all guides table"
```

---

## Verification Checklist

After all tasks are complete:

- [ ] Mobile: Knowledge screen shows guide counts without "offline"
- [ ] Mobile: Update banner shows when `updateAvailable` is true
- [ ] Mobile: Tapping the banner shows a confirmation dialog with guide titles (test on native device/simulator if possible — Alert doesn't work on web)
- [ ] Mobile: Confirming downloads the guides and clears the banner
- [ ] Mobile: Error state shows retry + dismiss
- [ ] Admin: Review Queue has Release column with correct data
- [ ] Admin: All Guides has Release column with correct data
- [ ] No TypeScript build errors in either app
