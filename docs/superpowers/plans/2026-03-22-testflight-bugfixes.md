# TestFlight Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 bugs and add 2 features discovered during the first TestFlight testing session.

**Architecture:** All changes are in the mobile app (`NorthKeep/artifacts/survival-app/`). Fixes span inventory form sheets (touch targets), settings cleanup, onboarding routing, offline knowledge browsing, and a new About modal. No backend changes needed.

**Tech Stack:** React Native, Expo Router, AsyncStorage, react-native-safe-area-context, react-native-keyboard-controller

**Spec:** `docs/superpowers/specs/2026-03-22-testflight-bugfixes-design.md`

**Note:** This project has no test suite. Verification is manual via TestFlight or Expo Go.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `app/inventory/add.tsx` | Modify | Fix header padding + button touch targets |
| `app/inventory/kit.tsx` | Modify | Same header fix + keyboard avoidance |
| `app/inventory/edit/[id].tsx` | Modify | Same header fix |
| `app/_layout.tsx` | Modify | Add onboarding gate in RootLayoutNav |
| `app/(tabs)/index.tsx` | Modify | Remove onboarding redirect |
| `app/(tabs)/settings.tsx` | Modify | Remove storage sections, hide rate, wire About modal |
| `components/AppFeedback.tsx` | Modify | Persist rating flag, add onRated callback |
| `components/AboutModal.tsx` | Create | Founder story modal |
| `app/(tabs)/knowledge.tsx` | Modify | Offline category browsing from globalMetadata |
| `contexts/GuideStoreContext.tsx` | Modify | Persist availableCategories to AsyncStorage |

---

## Task 1: Fix Inventory Form Sheet Headers (Bugs 1 & 2)

**Files:**
- Modify: `app/inventory/add.tsx`
- Modify: `app/inventory/kit.tsx`
- Modify: `app/inventory/edit/[id].tsx`

These screens are `presentation: "formSheet"` modals with `sheetGrabberVisible: true`. The header buttons need more padding and larger touch targets.

- [ ] **Step 1: Fix add.tsx header**

In `app/inventory/add.tsx`:

1. Add import: `import { useSafeAreaInsets } from "react-native-safe-area-context";`
2. Inside the component, add: `const insets = useSafeAreaInsets();`
3. Replace the header `<View>`:

```tsx
<View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
  <Pressable
    onPress={() => router.back()}
    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]}
  >
    <Text style={styles.cancelText}>Cancel</Text>
  </Pressable>
  <Text style={styles.headerTitle}>Add Item</Text>
  <Pressable
    onPress={handleSave}
    disabled={!name.trim()}
    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]}
  >
    <Text style={[styles.saveText, !name.trim() && styles.saveTextDisabled]}>Save</Text>
  </Pressable>
</View>
```

4. In `makeStyles`, remove `paddingTop` from the `header` style entirely (the inline dynamic style handles it now), and add:

```typescript
headerButton: {
  paddingVertical: 8,
  paddingHorizontal: 4,
},
```

- [ ] **Step 2: Apply same fix to kit.tsx**

Same changes as Step 1 but in `app/inventory/kit.tsx`:
- Add `useSafeAreaInsets` import and hook call
- Update header View with dynamic paddingTop
- Wrap Cancel and Save in Pressables with `hitSlop` and `styles.headerButton`
- Add `headerButton` style to makeStyles

- [ ] **Step 3: Apply same fix to edit/[id].tsx**

Same changes as Steps 1-2 but in `app/inventory/edit/[id].tsx`.

- [ ] **Step 4: Commit**

```bash
git add app/inventory/add.tsx app/inventory/kit.tsx app/inventory/edit/[id].tsx
git commit -m "fix: improve touch targets on inventory form sheet headers

Buttons were untappable on iOS devices because they sat too close to the
sheet grabber. Add safe area insets, hitSlop, and padding to all three
inventory form screens."
```

---

## Task 2: Fix Kit Creation Keyboard Gap (Bug 3)

**Files:**
- Modify: `app/inventory/kit.tsx`

- [ ] **Step 1: Add KeyboardAvoidingView**

The app uses `react-native-keyboard-controller` via `KeyboardProvider` in `_layout.tsx`. Check if it provides a `KeyboardAvoidingView` component. If so, use that. Otherwise, use React Native's built-in.

In `app/inventory/kit.tsx`:

1. Add import: `import { KeyboardAvoidingView, Platform } from "react-native";` (Platform may already be imported)
2. Wrap the content `<View style={styles.content}>` inside a KeyboardAvoidingView:

```tsx
<KeyboardAvoidingView
  behavior={Platform.OS === "ios" ? "padding" : undefined}
  style={{ flex: 1 }}
>
  <View style={styles.content}>
    {/* existing fields */}
  </View>
</KeyboardAvoidingView>
```

- [ ] **Step 2: Commit**

```bash
git add app/inventory/kit.tsx
git commit -m "fix: eliminate white gap above keyboard in kit creation form"
```

---

## Task 3: Fix Onboarding Not Showing (Bug 4)

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Add onboarding gate to RootLayoutNav**

In `app/_layout.tsx`:

1. Add imports:
```tsx
import { Redirect } from "expo-router";
import { useUserProfile } from "@/contexts/UserProfileContext";
```

Note: `useUserProfile` is already imported in `_layout.tsx` if `UserProfileProvider` is in scope. `RootLayoutNav` is rendered inside `UserProfileProvider` (line 90-100), so the hook is accessible.

2. Modify `RootLayoutNav` to check onboarding:

```tsx
function RootLayoutNav() {
  const { onboardingCompleted } = useUserProfile();

  // Still loading from AsyncStorage — keep splash visible
  if (onboardingCompleted === null) return null;

  // Not completed — redirect to onboarding before showing any screens
  if (!onboardingCompleted) return <Redirect href="/onboarding" />;

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      {/* ... existing Stack.Screen entries unchanged ... */}
    </Stack>
  );
}
```

3. Coordinate splash screen: Move the `SplashScreen.hideAsync()` call from the `useEffect` in `RootLayout` into `RootLayoutNav`, so it only hides after both fonts are loaded AND onboarding state is resolved. In `RootLayout`, remove the `SplashScreen.hideAsync()` from the useEffect. In `RootLayoutNav`, add:

```tsx
useEffect(() => {
  if (onboardingCompleted !== null) {
    SplashScreen.hideAsync();
  }
}, [onboardingCompleted]);
```

And keep the font loading guard in `RootLayout` (`if (!fontsLoaded && !fontError) return null;`) — this ensures fonts load before anything renders, then `RootLayoutNav` waits for onboarding state before hiding splash.

- [ ] **Step 2: Simplify index.tsx**

In `app/(tabs)/index.tsx`, the onboarding check is no longer needed. Replace with:

```tsx
import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/knowledge" />;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx "app/(tabs)/index.tsx"
git commit -m "fix: move onboarding gate to root layout so it fires on all entry points

Previously the check was in (tabs)/index.tsx which could be skipped due
to a race condition during AsyncStorage load."
```

---

## Task 4: Remove Storage & Data Management from Settings (Bug 5)

**Files:**
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: Remove storage-related code**

In `app/(tabs)/settings.tsx`:

1. Remove the `useKnowledge` import line
2. Remove the destructured values: `const { downloadedCount, totalStorageBytes, deleteAllArticles } = useKnowledge();`
3. Remove the `formatBytes` helper function (around lines 46–51)
4. Remove the `handleDeleteDownloads` function (around lines 53–73)
5. Remove the `Alert` import if no longer used by any other code (check: the theme section doesn't use it, but verify)
6. Remove the entire "Storage" section JSX (the section showing downloaded article count)
7. Remove the entire "Data Management" section JSX (the delete all downloads button)

**Note:** `KnowledgeProvider` in `_layout.tsx` (line 93) and `KnowledgeContext` cannot be removed yet — `app/knowledge/[id].tsx` still imports `useKnowledge`. Leave the provider in place.

- [ ] **Step 2: Commit**

```bash
git add "app/(tabs)/settings.tsx"
git commit -m "fix: remove obsolete storage and data management sections from settings

These referenced a legacy article download feature that no longer exists."
```

---

## Task 5: Hide Rate the App After Rating (Bug 6)

**Files:**
- Modify: `components/AppFeedback.tsx`
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: Add persistence to AppFeedback**

In `components/AppFeedback.tsx`:

1. Add import: `import AsyncStorage from "@react-native-async-storage/async-storage";`
2. Add `onRated` to the Props interface:

```tsx
interface Props {
  visible: boolean;
  onClose: () => void;
  onRated?: () => void;
}
```

3. Destructure in component: `export function AppFeedback({ visible, onClose, onRated }: Props)`

4. In `handleSubmit`, after `await submitAppFeedback(...)` succeeds, add:

```tsx
await AsyncStorage.setItem("northkeep_has_rated", "true");
onRated?.();
```

- [ ] **Step 2: Hide the row in settings**

In `app/(tabs)/settings.tsx`:

1. Add import: `import AsyncStorage from "@react-native-async-storage/async-storage";` and add `useEffect` to React imports
2. Add state: `const [hasRated, setHasRated] = useState(false);`
3. Add effect to load the flag:

```tsx
useEffect(() => {
  AsyncStorage.getItem("northkeep_has_rated").then((v) => {
    if (v === "true") setHasRated(true);
  });
}, []);
```

4. Wrap the "Rate the App" `<SettingsRow>` in a conditional: `{!hasRated && (<SettingsRow ... />)}`

5. Update the AppFeedback component usage to pass the callback:

```tsx
<AppFeedback
  visible={showAppFeedback}
  onClose={() => setShowAppFeedback(false)}
  onRated={() => setHasRated(true)}
/>
```

- [ ] **Step 3: Commit**

```bash
git add components/AppFeedback.tsx "app/(tabs)/settings.tsx"
git commit -m "fix: hide Rate the App option after user submits feedback

Persists a flag to AsyncStorage and hides the settings row on next load."
```

---

## Task 6: Add About NorthKeep Modal (Bug 7)

**Files:**
- Create: `components/AboutModal.tsx`
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: Create AboutModal component**

Create `components/AboutModal.tsx` following the same pattern as `AppFeedback.tsx`:

```tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AboutModal({ visible, onClose }: Props) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View />
      </Pressable>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>About NorthKeep</Text>
          <Pressable onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color={C.textSecondary} />
          </Pressable>
        </View>
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.paragraph}>
            I built NorthKeep because I wanted one place where I could find clear, trusted survival
            guidance — even with no signal, no Wi-Fi, nothing.
          </Text>
          <Text style={styles.paragraph}>
            No ads, no subscriptions, no data collection. Just the knowledge you need, when you need
            it most.
          </Text>
          <Text style={styles.paragraph}>
            I hope it helps you and the people you care about stay safe.
          </Text>
          <Text style={styles.signature}>— Karan</Text>
          <Text style={styles.version}>Version 1.0.0 Beta</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
      backgroundColor: C.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 40,
      maxHeight: "60%",
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.borderLight,
      alignSelf: "center",
      marginTop: 10,
      marginBottom: 8,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    title: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
    },
    body: {
      paddingHorizontal: 20,
    },
    paragraph: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
      lineHeight: 24,
      marginBottom: 16,
    },
    signature: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
      marginBottom: 20,
    },
    version: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textTertiary,
      textAlign: "center",
      marginTop: 8,
    },
  });
}
```

- [ ] **Step 2: Wire up in settings**

In `app/(tabs)/settings.tsx`:

1. Add import: `import { AboutModal } from "@/components/AboutModal";`
2. Add state: `const [showAbout, setShowAbout] = useState(false);`
3. Add `onPress` to the NorthKeep About `<SettingsRow>`:

```tsx
<SettingsRow
  icon="shield-checkmark-outline"
  title="NorthKeep"
  subtitle="Offline survival companion"
  onPress={() => setShowAbout(true)}
/>
```

4. Add the modal next to AppFeedback at the bottom of the component:

```tsx
<AboutModal visible={showAbout} onClose={() => setShowAbout(false)} />
```

- [ ] **Step 3: Commit**

```bash
git add components/AboutModal.tsx "app/(tabs)/settings.tsx"
git commit -m "feat: add About NorthKeep modal with founder story"
```

---

## Task 7: Fix Offline Knowledge Page (Bug 8)

**Files:**
- Modify: `contexts/GuideStoreContext.tsx`
- Modify: `app/(tabs)/knowledge.tsx`

- [ ] **Step 1: Persist availableCategories in GuideStoreContext**

In `contexts/GuideStoreContext.tsx`:

1. Add a new AsyncStorage key constant near the existing ones:

```tsx
const AVAILABLE_CATEGORIES_KEY = "northkeep_available_categories";
```

2. In the `initialize()` function, after restoring `globalMetadata` from AsyncStorage (around line 318), add restoration of availableCategories:

```tsx
try {
  const storedCats = await AsyncStorage.getItem(AVAILABLE_CATEGORIES_KEY);
  if (storedCats) setAvailableCategories(JSON.parse(storedCats));
} catch { /* ignore */ }
```

3. In the background update check section, after `setAvailableCategories(availCats)` (near the end of the initialize function), add persistence:

```tsx
const availCats = await fetchAvailableCategories();
setAvailableCategories(availCats);
await AsyncStorage.setItem(AVAILABLE_CATEGORIES_KEY, JSON.stringify(availCats));
```

- [ ] **Step 2: Use globalMetadata for offline category browsing**

In `app/(tabs)/knowledge.tsx`:

1. Extract `CATEGORY_ORDER` to a module-level constant (outside the component) to avoid duplication:

```tsx
const CATEGORY_ORDER = [
  "natural_disasters", "medical_safety", "water_food", "preparedness",
  "communication", "navigation", "power_utilities_home_safety",
  "shelter_fire_warmth", "weather_environment", "core_skills",
];
```

2. In the `categoryGuides` useMemo (around line 270), add a third fallback using globalMetadata. Change the else branch:

```tsx
const categoryGuides = useMemo(() => {
  if (!selectedCategory) return [];
  let guides: Guide[];
  if (downloadedCategories.has(selectedCategory)) {
    guides = allGuides.filter((g) => g.category === selectedCategory);
  } else if (onlineGuidesCache.has(selectedCategory)) {
    guides = onlineGuidesCache.get(selectedCategory)!;
  } else {
    // Offline fallback: use persisted metadata for preview cards
    guides = globalMetadata.filter((g) => g.category === selectedCategory);
  }
  if (!searchQuery.trim()) return guides;
  const q = searchQuery.toLowerCase();
  return guides.filter(
    (g) =>
      g.title.toLowerCase().includes(q) ||
      g.summary.toLowerCase().includes(q) ||
      g.tags.some((t) => t.includes(q))
  );
}, [allGuides, selectedCategory, searchQuery, downloadedCategories, onlineGuidesCache, globalMetadata]);
```

3. In the `categories` useMemo (around line 241), replace the inline array with the constant and add a globalMetadata fallback:

```tsx
const categories = useMemo(() => {
  if (availableCategories.length > 0) {
    return CATEGORY_ORDER.filter((c) =>
      availableCategories.some((a) => a.slug === c)
    ) as GuideCategory[];
  }
  // Offline: derive from globalMetadata if available, else from downloaded guides
  if (globalMetadata.length > 0) {
    const metaCats = new Set(globalMetadata.map((g) => g.category));
    return CATEGORY_ORDER.filter((c) => metaCats.has(c)) as GuideCategory[];
  }
  return getAllCategories();
}, [availableCategories, allGuides, globalMetadata]);
```

4. In the `countByCategory` useMemo (around line 255), add globalMetadata fallback:

```tsx
const countByCategory = useMemo(() => {
  if (availableCategories.length > 0) {
    return Object.fromEntries(availableCategories.map((c) => [c.slug, c.guideCount]));
  }
  // Offline: count from globalMetadata if available
  if (globalMetadata.length > 0) {
    const counts: Record<string, number> = {};
    globalMetadata.forEach((g) => {
      counts[g.category] = (counts[g.category] || 0) + 1;
    });
    return counts;
  }
  return getGuideCountByCategory();
}, [availableCategories, globalMetadata]);
```

- [ ] **Step 3: Commit**

```bash
git add contexts/GuideStoreContext.tsx "app/(tabs)/knowledge.tsx"
git commit -m "fix: show all categories and guide previews when offline

Persist availableCategories to AsyncStorage and fall back to
globalMetadata for category listings and guide previews when offline."
```

---

## Task 8: Final Build & Verification

- [ ] **Step 1: Run EAS build**

```bash
cd NorthKeep/artifacts/survival-app
eas build --platform ios --profile preview
```

- [ ] **Step 2: Submit to TestFlight**

```bash
eas submit --platform ios --latest
```

- [ ] **Step 3: Verify all 8 fixes on device**

Manual verification checklist:
1. Inventory Add Item: Save and Cancel buttons respond to taps
2. Inventory Add Item: Adequate spacing between buttons and Name field
3. Kit Creation: No white gap between description and keyboard
4. First launch: Onboarding screen appears (reset AsyncStorage to test)
5. Settings: No "Storage" or "Data Management" sections
6. Settings: "Rate the App" disappears after submitting feedback
7. Settings: "About NorthKeep" opens modal with founder story
8. Knowledge page: Categories and guides visible when offline
