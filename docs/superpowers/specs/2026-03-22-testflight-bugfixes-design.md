# TestFlight Bug Fixes & Improvements

**Date:** 2026-03-22
**Scope:** 8 bugs/features discovered during first TestFlight testing session

---

## Bug 1 & 2: Save/Cancel Buttons Not Working + Too Close to Name Field

**Files:** `app/inventory/add.tsx`, `app/inventory/kit.tsx`, `app/inventory/edit/[id].tsx`

**Root cause:** All three inventory form screens are rendered as `presentation: "formSheet"` modals (configured in `app/_layout.tsx`) with `sheetGrabberVisible: true`. Inside the sheet, the header uses a plain `<View>` with only `paddingTop: 20`, which places the Save/Cancel buttons too close to the sheet grabber. The touch targets are small (text-only `<Pressable>` with no padding on the pressable itself), making them difficult or impossible to tap on real devices.

**Note:** Since these are form sheets (not full-screen), `SafeAreaView` may report zero top inset. The fix should increase explicit padding and add `hitSlop` rather than relying solely on SafeAreaView.

**Fix:**
- Increase `paddingTop` in the header style from 20 to 16 + use `useSafeAreaInsets()` to add the top inset dynamically (handles both full-screen and form sheet cases gracefully)
- Add `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}` to both Save and Cancel `<Pressable>` components
- Add `paddingVertical: 8` to the Pressable style for a larger built-in touch area
- This also increases the gap between the header buttons and the first form field (NAME), resolving bug #2

**Affected screens:**
- Add Item (`app/inventory/add.tsx`)
- Edit Item (`app/inventory/edit/[id].tsx`)
- New Kit (`app/inventory/kit.tsx`)

---

## Bug 3: White Space Below Description in Kit Creation

**File:** `app/inventory/kit.tsx`

**Root cause:** The kit creation screen has only 2 fields (Name, Description) in a plain `<View>` — the space between the description field and the keyboard is simply unused screen area. There are no missing fields. The sheet detent is `0.4` (40% of screen height), so the white gap is the remaining space.

**Fix:**
- Wrap the form content in a `KeyboardAvoidingView` with `behavior="padding"` (iOS) to push the form up when the keyboard opens, eliminating the awkward white gap
- **Note:** The app already uses `KeyboardProvider` from `react-native-keyboard-controller` in `_layout.tsx`. Verify no conflict — if `react-native-keyboard-controller` provides its own avoidance, use that instead of React Native's built-in `KeyboardAvoidingView`
- Keep the existing 2-field layout — no additional fields needed

---

## Bug 4: Onboarding Not Showing on First Open

**Files:** `app/(tabs)/index.tsx` (current redirect), `app/_layout.tsx` (target)

**Root cause:** The onboarding redirect is in `(tabs)/index.tsx`, which is the initial route inside the tabs navigator (it has `href: null` in `(tabs)/_layout.tsx` making it a hidden tab). In theory this should fire on launch, but there is likely a race condition: `onboardingCompleted` starts as `null` (loading from AsyncStorage), and the component returns `null` during that window. The tab navigator may render and display a visible tab (like Knowledge) before `onboardingCompleted` resolves to `false`, causing the user to miss the redirect.

**Fix:**
- Add the onboarding check inside `RootLayoutNav` (in `app/_layout.tsx`), which is already inside the `UserProfileProvider` wrapper and has access to `UserProfileContext`
- If `onboardingCompleted === null` (still loading), keep the splash screen visible or return null
- If `onboardingCompleted === false`, render `<Redirect href="/onboarding" />` instead of the `<Stack>` navigator
- Remove the redirect from `(tabs)/index.tsx` (no longer needed)
- This ensures onboarding is checked before any screen renders, regardless of entry point

---

## Bug 5: Remove Storage & Data Management from Settings

**File:** `app/(tabs)/settings.tsx`

**Root cause:** The "Storage" section (showing downloaded article count/size) and "Data Management" section (delete all downloads) reference an article download feature that no longer exists. Guides are the current content model.

**Fix:**
- Remove the "Storage" section (downloaded articles count and size display)
- Remove the "Data Management" section (delete all downloads button)
- Remove the `handleDeleteDownloads` function
- Remove the `useKnowledge` import and `formatBytes` utility if they become unused after this change
- Check if `KnowledgeContext` / `KnowledgeProvider` (in `_layout.tsx` line 93) has any other consumers — if not, remove the provider wrapper and context file as cleanup

---

## Bug 6: Hide "Rate the App" After Rating

**Files:** `app/(tabs)/settings.tsx`, `components/AppFeedback.tsx`

**Root cause:** After submitting feedback via the AppFeedback modal, no flag is persisted. The "Rate the App" row always appears in settings regardless of whether the user has already rated.

**Fix:**
- In `AppFeedback.tsx`, write the flag to AsyncStorage **immediately** inside `handleSubmit` after the `submitAppFeedback` call succeeds, before the 1500ms auto-close timeout fires: `await AsyncStorage.setItem('northkeep_has_rated', 'true')`
- Accept an `onRated` callback prop so the parent (settings) can update its local state immediately without waiting for a remount
- In `settings.tsx`, load the flag from AsyncStorage on mount into a `hasRated` state variable, and conditionally hide the "Rate the App" row when `hasRated === true`

---

## Bug 7: About NorthKeep Page

**File:** `app/(tabs)/settings.tsx`, `components/AboutModal.tsx` (new)

**Current state:** The "NorthKeep" row in the About section is non-interactive (no `onPress` handler). It shows title "NorthKeep" and subtitle "Offline survival companion".

**Fix:**
- Add `onPress` handler to the NorthKeep About row
- Show a modal (reuse the existing bottom-sheet pattern from AppFeedback) with the founder story
- Content:

> **About NorthKeep**
>
> I built NorthKeep because I wanted one place where I could find clear, trusted survival guidance — even with no signal, no Wi-Fi, nothing.
>
> No ads, no subscriptions, no data collection. Just the knowledge you need, when you need it most.
>
> I hope it helps you and the people you care about stay safe.
>
> — Karan

- Include the app version at the bottom of the modal
- Style: clean, centered text with subtle typography hierarchy

---

## Bug 8: Knowledge Page Empty When Offline

**Files:** `app/(tabs)/knowledge.tsx`, `contexts/GuideStoreContext.tsx`

**Root cause:** When offline or after app restart, the category list and per-category guide browsing break because they depend on ephemeral React state:
- `availableCategories` — fetched from Supabase during update check, not persisted, resets to `[]` on app restart. When empty, the categories list falls back to `getAllCategories()` which only returns categories with downloaded guides.
- `onlineGuidesCache` — fetched per-category from Supabase on tap, not persisted, resets to empty `Map` on restart

So categories **with** downloaded guides still appear offline, but categories that haven't been downloaded disappear entirely. Meanwhile, search works offline because it uses `globalMetadata` which IS persisted to AsyncStorage.

The `countByCategory` memo also depends on `availableCategories` — when empty, it falls back to counting only downloaded guides, so counts are inaccurate.

**Fix:**
- **Persist `availableCategories`** (including guide counts) to AsyncStorage alongside `globalMetadata` during the update check. On startup, restore from AsyncStorage before attempting an online fetch.
- **Derive category guide listings from `globalMetadata`** when offline and category is not downloaded. Instead of calling `fetchOnlineGuides()` (which fails offline), filter `globalMetadata` by category slug to show preview cards (title + summary).
- **Visual distinction:** Show a subtle indicator on non-downloaded guide cards (e.g., cloud/download icon) so users know these are previews. Tapping opens a prompt to download the full category for complete content.
- **Fallback chain:** Downloaded categories → use full SQLite data. Non-downloaded categories → use `globalMetadata` previews. No metadata at all → show "Connect to internet to browse guides" message.

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `app/inventory/add.tsx` | Increase header padding, hitSlop + padding on buttons |
| `app/inventory/kit.tsx` | Same header fix, KeyboardAvoidingView for form |
| `app/inventory/edit/[id].tsx` | Same header fix |
| `app/_layout.tsx` | Add onboarding redirect in RootLayoutNav, possibly remove KnowledgeProvider |
| `app/(tabs)/index.tsx` | Remove onboarding redirect (moved to _layout) |
| `app/(tabs)/settings.tsx` | Remove storage/data sections, hide rate after rating, make About clickable |
| `components/AppFeedback.tsx` | Persist rating flag to AsyncStorage, add onRated callback |
| `components/AboutModal.tsx` | New file — founder story modal |
| `app/(tabs)/knowledge.tsx` | Use globalMetadata for offline category browsing |
| `contexts/GuideStoreContext.tsx` | Persist availableCategories (with counts) to AsyncStorage |
| `contexts/KnowledgeContext.tsx` | Possibly remove if no other consumers |
