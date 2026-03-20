# Onboarding, IAP & Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-launch onboarding screens, guide view tracking, user profile sync to Supabase, and architect the IAP entitlement system for offline AI chat.

**Architecture:** Local-first with Supabase sync. Onboarding captures profile data stored in AsyncStorage and synced to a `user_profiles` table. Guide views tracked in SQLite with batch sync. IAP uses StoreKit 2 with server-side receipt validation via Supabase Edge Function. All new state managed through React Context providers following existing codebase patterns.

**Tech Stack:** React Native (Expo), Expo Router, AsyncStorage, expo-sqlite, Supabase (PostgreSQL + Edge Functions), StoreKit 2

**Spec:** `docs/superpowers/specs/2026-03-20-onboarding-iap-analytics-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `NorthKeep/artifacts/survival-app/lib/user-profile.ts` | Profile types, AsyncStorage read/write, Supabase sync functions |
| `NorthKeep/artifacts/survival-app/lib/guide-views.ts` | SQLite guide view counter, batch sync to Supabase |
| `NorthKeep/artifacts/survival-app/lib/ai-chat-capability.ts` | Device compatibility check stub (returns `unknown` for now) |
| `NorthKeep/artifacts/survival-app/contexts/UserProfileContext.tsx` | React Context provider for profile state + sync |
| `NorthKeep/artifacts/survival-app/app/onboarding/index.tsx` | Welcome screen |
| `NorthKeep/artifacts/survival-app/app/onboarding/profile.tsx` | Profile questions screen (user type, experience, household) |
| `NorthKeep/artifacts/survival-app/app/onboarding/_layout.tsx` | Onboarding stack navigation layout |
| `NorthKeep/artifacts/survival-app/app/onboarding/email.tsx` | Optional email capture screen |

### Modified Files

| File | Changes |
|------|---------|
| `NorthKeep/artifacts/survival-app/app/_layout.tsx` | Add `UserProfileProvider`, add onboarding conditional route |
| `NorthKeep/artifacts/survival-app/app/(tabs)/settings.tsx` | Add "Your Profile" section above Appearance |
| `NorthKeep/artifacts/survival-app/app/guides/[slug].tsx` | Add view tracking call on mount |
| `NorthKeep/artifacts/survival-app/lib/database.ts` | Add `guide_views` table to SQLite schema |
| `NorthKeep/artifacts/survival-app/contexts/GuideStoreContext.tsx` | Call view count sync during `deltaSync()` |

### Supabase (Admin Side)

| Item | Responsibility |
|------|---------------|
| Supabase migration (run via dashboard or CLI) | Create `user_profiles`, `guide_view_counts` tables + RLS policies + trigger |
| Edge Function `validate-receipt` (future) | Apple receipt validation — stubbed in plan, built when IAP launches |

---

## Task 1: Supabase Schema — `user_profiles` and `guide_view_counts` Tables

**Files:**
- Run via Supabase SQL Editor (dashboard)

- [ ] **Step 1: Create `user_profiles` table**

Run this SQL in the Supabase SQL Editor:

```sql
CREATE TABLE user_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id text UNIQUE NOT NULL,
  email text,
  user_types text[] DEFAULT '{}',
  experience_level text CHECK (experience_level IN ('beginner', 'intermediate', 'expert')),
  household_size text CHECK (household_size IN ('just_me', '2', '3_to_5', '6_plus')),
  ai_chat_unlocked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

- [ ] **Step 2: Create `guide_view_counts` table**

```sql
CREATE TABLE guide_view_counts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id text NOT NULL,
  guide_slug text NOT NULL,
  view_count integer DEFAULT 0,
  last_viewed_at timestamptz DEFAULT now(),
  synced_at timestamptz DEFAULT now(),
  UNIQUE (device_id, guide_slug)
);
```

- [ ] **Step 3: Create BEFORE UPDATE trigger to protect `ai_chat_unlocked`**

```sql
CREATE OR REPLACE FUNCTION protect_ai_chat_unlocked()
RETURNS TRIGGER AS $$
BEGIN
  -- Only service role (via Edge Functions) can modify ai_chat_unlocked
  -- For anon/authenticated roles, preserve the existing value
  IF current_setting('request.jwt.claim.role', true) != 'service_role' THEN
    NEW.ai_chat_unlocked := OLD.ai_chat_unlocked;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_ai_chat_unlocked
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_ai_chat_unlocked();
```

- [ ] **Step 4: Create RLS policies for `user_profiles`**

```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Anon can insert their own profile
CREATE POLICY "anon_insert_own_profile" ON user_profiles
  FOR INSERT TO anon
  WITH CHECK (true);

-- Anon can update any profile (no auth to match against; trigger protects ai_chat_unlocked)
CREATE POLICY "anon_update_own_profile" ON user_profiles
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Anon can read their own profile
CREATE POLICY "anon_select_own_profile" ON user_profiles
  FOR SELECT TO anon
  USING (true);
```

Note: Since we don't have auth, the anon policies are permissive. The `device_id` matching is enforced client-side. The trigger protects the sensitive `ai_chat_unlocked` column regardless.

- [ ] **Step 5: Create RLS policies for `guide_view_counts`**

```sql
ALTER TABLE guide_view_counts ENABLE ROW LEVEL SECURITY;

-- Anon can insert view counts
CREATE POLICY "anon_insert_view_counts" ON guide_view_counts
  FOR INSERT TO anon
  WITH CHECK (true);

-- Anon can update view counts
CREATE POLICY "anon_update_view_counts" ON guide_view_counts
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Anon can read view counts (for potential future use)
CREATE POLICY "anon_select_view_counts" ON guide_view_counts
  FOR SELECT TO anon
  USING (true);
```

- [ ] **Step 6: Verify tables exist**

Run in SQL Editor:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('user_profiles', 'guide_view_counts');
```
Expected: Both tables listed.

---

## Task 2: User Profile Library — `lib/user-profile.ts`

**Files:**
- Create: `NorthKeep/artifacts/survival-app/lib/user-profile.ts`

- [ ] **Step 1: Create user profile types and constants**

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { getDeviceId } from "./device-id";

// --- Types ---

export type UserType =
  | "doomsday_prepper"
  | "survivalist"
  | "outdoors_enthusiast"
  | "first_responder"
  | "military_veteran"
  | "parent_family"
  | "other";

export type ExperienceLevel = "beginner" | "intermediate" | "expert";
export type HouseholdSize = "just_me" | "2" | "3_to_5" | "6_plus";

export interface UserProfile {
  email: string | null;
  userTypes: UserType[];
  experienceLevel: ExperienceLevel | null;
  householdSize: HouseholdSize | null;
}

export const USER_TYPE_LABELS: Record<UserType, string> = {
  doomsday_prepper: "Doomsday Prepper",
  survivalist: "Survivalist",
  outdoors_enthusiast: "Outdoors Enthusiast",
  first_responder: "First Responder / Medical",
  military_veteran: "Military / Veteran",
  parent_family: "Parent / Family Preparedness",
  other: "Other",
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  expert: "Expert",
};

export const HOUSEHOLD_LABELS: Record<HouseholdSize, string> = {
  just_me: "Just me",
  "2": "2 people",
  "3_to_5": "3–5 people",
  "6_plus": "6+",
};

// --- Storage Keys ---

const PROFILE_KEY = "northkeep_user_profile";
const ONBOARDING_KEY = "northkeep_onboarding_completed";
```

- [ ] **Step 2: Add local storage functions**

Append to the same file:

```typescript
// --- Local Storage ---

export const EMPTY_PROFILE: UserProfile = {
  email: null,
  userTypes: [],
  experienceLevel: null,
  householdSize: null,
};

export async function loadProfile(): Promise<UserProfile> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return EMPTY_PROFILE;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return EMPTY_PROFILE;
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function isOnboardingCompleted(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_KEY);
  return value === "true";
}

export async function markOnboardingCompleted(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, "true");
}
```

- [ ] **Step 3: Add Supabase sync function**

Append to the same file:

```typescript
// --- Supabase Sync ---

export async function syncProfileToSupabase(profile: UserProfile): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    const { error } = await supabase.from("user_profiles").upsert(
      {
        device_id: deviceId,
        email: profile.email,
        user_types: profile.userTypes,
        experience_level: profile.experienceLevel,
        household_size: profile.householdSize,
      },
      { onConflict: "device_id" }
    );
    if (error) {
      console.warn("[UserProfile] Sync failed:", error.message);
    }
  } catch (e) {
    console.warn("[UserProfile] Sync error:", e);
  }
}
```

- [ ] **Step 4: Add email validation helper**

Append to the same file:

```typescript
// --- Validation ---

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return false;
  // Basic check: has @ and dot in domain
  const atIndex = trimmed.indexOf("@");
  if (atIndex < 1) return false;
  const domain = trimmed.slice(atIndex + 1);
  return domain.includes(".") && domain.length >= 3;
}
```

- [ ] **Step 5: Commit**

```bash
git add NorthKeep/artifacts/survival-app/lib/user-profile.ts
git commit -m "feat: add user profile types, storage, and sync library"
```

---

## Task 3: Guide View Tracking Library — `lib/guide-views.ts`

**Files:**
- Create: `NorthKeep/artifacts/survival-app/lib/guide-views.ts`
- Modify: `NorthKeep/artifacts/survival-app/lib/database.ts`

- [ ] **Step 1: Add `guide_views` table to SQLite schema in `database.ts`**

In `lib/database.ts`, find the `initTables()` function (the section where tables are created with `CREATE TABLE IF NOT EXISTS`). Add after the existing `guides_cache` table creation:

```typescript
await db.execAsync(`
  CREATE TABLE IF NOT EXISTS guide_views (
    guide_slug TEXT PRIMARY KEY,
    view_count INTEGER DEFAULT 0,
    last_viewed_at TEXT,
    needs_sync INTEGER DEFAULT 1
  );
`);
```

Also add a web fallback constant near the other web storage keys. Add the key `"northkeep_guide_views"` to the web mock storage section if following the existing pattern for web compatibility.

- [ ] **Step 2: Create `lib/guide-views.ts`**

```typescript
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { getDeviceId } from "./device-id";
import { getDatabase } from "./database";

// --- Record a view (called when guide detail screen opens) ---

export async function recordGuideView(guideSlug: string): Promise<void> {
  if (Platform.OS === "web") return; // SQLite not available on web

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO guide_views (guide_slug, view_count, last_viewed_at, needs_sync)
     VALUES (?, 1, ?, 1)
     ON CONFLICT(guide_slug) DO UPDATE SET
       view_count = view_count + 1,
       last_viewed_at = ?,
       needs_sync = 1`,
    [guideSlug, now, now]
  );
}

// --- Sync dirty view counts to Supabase ---

export async function syncGuideViews(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const db = await getDatabase();
    const deviceId = await getDeviceId();

    // Get rows that need syncing
    const rows = await db.getAllAsync<{
      guide_slug: string;
      view_count: number;
      last_viewed_at: string;
    }>("SELECT guide_slug, view_count, last_viewed_at FROM guide_views WHERE needs_sync = 1");

    if (rows.length === 0) return;

    // Upsert to Supabase
    const upsertData = rows.map((row) => ({
      device_id: deviceId,
      guide_slug: row.guide_slug,
      view_count: row.view_count,
      last_viewed_at: row.last_viewed_at,
      synced_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("guide_view_counts")
      .upsert(upsertData, { onConflict: "device_id,guide_slug" });

    if (error) {
      console.warn("[GuideViews] Sync failed:", error.message);
      return;
    }

    // Mark as synced locally
    const slugs = rows.map((r) => r.guide_slug);
    const placeholders = slugs.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE guide_views SET needs_sync = 0 WHERE guide_slug IN (${placeholders})`,
      slugs
    );
  } catch (e) {
    console.warn("[GuideViews] Sync error:", e);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add NorthKeep/artifacts/survival-app/lib/guide-views.ts NorthKeep/artifacts/survival-app/lib/database.ts
git commit -m "feat: add guide view tracking with SQLite counter and Supabase sync"
```

---

## Task 4: AI Chat Capability Stub — `lib/ai-chat-capability.ts`

**Files:**
- Create: `NorthKeep/artifacts/survival-app/lib/ai-chat-capability.ts`

- [ ] **Step 1: Create the stub**

```typescript
export type AIChatCapability = "compatible" | "incompatible" | "unknown";

/**
 * Check whether the device can run on-device AI chat.
 * Returns "unknown" until we finalize the AI framework choice.
 * Will be updated to check chip/RAM/iOS version when ready.
 */
export function getAIChatCapability(): AIChatCapability {
  return "unknown";
}
```

- [ ] **Step 2: Commit**

```bash
git add NorthKeep/artifacts/survival-app/lib/ai-chat-capability.ts
git commit -m "feat: add AI chat device capability check stub"
```

---

## Task 5: User Profile Context Provider — `contexts/UserProfileContext.tsx`

**Files:**
- Create: `NorthKeep/artifacts/survival-app/contexts/UserProfileContext.tsx`

- [ ] **Step 1: Create the context provider**

```typescript
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  UserProfile,
  EMPTY_PROFILE,
  loadProfile,
  saveProfile,
  syncProfileToSupabase,
  isOnboardingCompleted,
  markOnboardingCompleted,
} from "@/lib/user-profile";

interface UserProfileContextValue {
  profile: UserProfile;
  onboardingCompleted: boolean | null; // null = still loading
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const [loaded, completed] = await Promise.all([loadProfile(), isOnboardingCompleted()]);
      setProfile(loaded);
      setOnboardingCompleted(completed);
    })();
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const next = { ...profile, ...updates };
    setProfile(next);
    // Save locally and sync to Supabase outside the state updater
    await saveProfile(next);
    syncProfileToSupabase(next);
  }, [profile]);

  const completeOnboarding = useCallback(async () => {
    // Read the latest profile from AsyncStorage to avoid stale closure
    const latestProfile = await loadProfile();
    await markOnboardingCompleted();
    setOnboardingCompleted(true);
    syncProfileToSupabase(latestProfile);
  }, []);

  return (
    <UserProfileContext.Provider
      value={{ profile, onboardingCompleted, updateProfile, completeOnboarding }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) throw new Error("useUserProfile must be used within UserProfileProvider");
  return context;
}
```

- [ ] **Step 2: Commit**

```bash
git add NorthKeep/artifacts/survival-app/contexts/UserProfileContext.tsx
git commit -m "feat: add UserProfileContext for profile state and sync"
```

---

## Task 6: Onboarding Screens

**Files:**
- Create: `NorthKeep/artifacts/survival-app/app/onboarding/index.tsx`
- Create: `NorthKeep/artifacts/survival-app/app/onboarding/profile.tsx`
- Create: `NorthKeep/artifacts/survival-app/app/onboarding/email.tsx`

- [ ] **Step 1: Create onboarding directory layout file**

Create `NorthKeep/artifacts/survival-app/app/onboarding/_layout.tsx`:

```typescript
import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="email" />
    </Stack>
  );
}
```

- [ ] **Step 2: Create welcome screen — `onboarding/index.tsx`**

```typescript
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { useUserProfile } from "@/contexts/UserProfileContext";

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const { completeOnboarding } = useUserProfile();

  const styles = makeStyles(C, insets);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>NorthKeep</Text>
        <Text style={styles.subtitle}>Your offline emergency survival guide</Text>
      </View>
      <View style={styles.footer}>
        <Pressable style={styles.primaryButton} onPress={() => router.push("/onboarding/profile")}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </Pressable>
        <Pressable
          style={styles.skipButton}
          onPress={async () => {
            await completeOnboarding();
          }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(C: any, insets: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
      paddingTop: insets.top,
      paddingBottom: insets.bottom + 16,
      paddingHorizontal: 24,
    },
    content: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      fontSize: 36,
      fontWeight: "700",
      color: C.text,
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 18,
      color: C.textSecondary,
      textAlign: "center",
    },
    footer: {
      gap: 12,
    },
    primaryButton: {
      backgroundColor: C.accent,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
    },
    primaryButtonText: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "600",
    },
    skipButton: {
      paddingVertical: 12,
      alignItems: "center",
    },
    skipText: {
      color: C.textSecondary,
      fontSize: 16,
    },
  });
}
```

- [ ] **Step 3: Create profile screen — `onboarding/profile.tsx`**

```typescript
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import {
  UserType,
  ExperienceLevel,
  HouseholdSize,
  USER_TYPE_LABELS,
  EXPERIENCE_LABELS,
  HOUSEHOLD_LABELS,
} from "@/lib/user-profile";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const { profile, updateProfile, completeOnboarding } = useUserProfile();

  const [selectedTypes, setSelectedTypes] = useState<UserType[]>(profile.userTypes);
  const [experience, setExperience] = useState<ExperienceLevel | null>(profile.experienceLevel);
  const [household, setHousehold] = useState<HouseholdSize | null>(profile.householdSize);

  // Pre-fill from saved profile (in case of interrupted onboarding restart)
  useEffect(() => {
    setSelectedTypes(profile.userTypes);
    setExperience(profile.experienceLevel);
    setHousehold(profile.householdSize);
  }, [profile]);

  const toggleType = (type: UserType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleNext = async () => {
    await updateProfile({
      userTypes: selectedTypes,
      experienceLevel: experience,
      householdSize: household,
    });
    router.push("/onboarding/email");
  };

  const handleSkip = async () => {
    await completeOnboarding();
  };

  const styles = makeStyles(C, insets);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.heading}>Tell us about yourself</Text>

        {/* User Type - Multi-select */}
        <Text style={styles.label}>I identify as... (select all that apply)</Text>
        <View style={styles.chipContainer}>
          {(Object.keys(USER_TYPE_LABELS) as UserType[]).map((type) => (
            <Pressable
              key={type}
              style={[styles.chip, selectedTypes.includes(type) && styles.chipSelected]}
              onPress={() => toggleType(type)}
            >
              <Text
                style={[styles.chipText, selectedTypes.includes(type) && styles.chipTextSelected]}
              >
                {USER_TYPE_LABELS[type]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Experience Level - Single-select */}
        <Text style={styles.label}>Experience level</Text>
        <View style={styles.chipContainer}>
          {(Object.keys(EXPERIENCE_LABELS) as ExperienceLevel[]).map((level) => (
            <Pressable
              key={level}
              style={[styles.chip, experience === level && styles.chipSelected]}
              onPress={() => setExperience(level)}
            >
              <Text style={[styles.chipText, experience === level && styles.chipTextSelected]}>
                {EXPERIENCE_LABELS[level]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Household Size - Single-select */}
        <Text style={styles.label}>Household size</Text>
        <View style={styles.chipContainer}>
          {(Object.keys(HOUSEHOLD_LABELS) as HouseholdSize[]).map((size) => (
            <Pressable
              key={size}
              style={[styles.chip, household === size && styles.chipSelected]}
              onPress={() => setHousehold(size)}
            >
              <Text style={[styles.chipText, household === size && styles.chipTextSelected]}>
                {HOUSEHOLD_LABELS[size]}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>Next</Text>
        </Pressable>
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(C: any, insets: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
      paddingTop: insets.top + 16,
      paddingBottom: insets.bottom + 16,
    },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 24 },
    heading: {
      fontSize: 28,
      fontWeight: "700",
      color: C.text,
      marginBottom: 24,
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      color: C.text,
      marginBottom: 12,
      marginTop: 20,
    },
    chipContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
    },
    chipSelected: {
      backgroundColor: C.accent,
      borderColor: C.accent,
    },
    chipText: {
      fontSize: 14,
      color: C.text,
    },
    chipTextSelected: {
      color: "#fff",
    },
    footer: {
      paddingHorizontal: 24,
      gap: 12,
    },
    primaryButton: {
      backgroundColor: C.accent,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
    },
    primaryButtonText: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "600",
    },
    skipButton: {
      paddingVertical: 12,
      alignItems: "center",
    },
    skipText: {
      color: C.textSecondary,
      fontSize: 16,
    },
  });
}
```

- [ ] **Step 4: Create email screen — `onboarding/email.tsx`**

```typescript
import { View, Text, TextInput, StyleSheet, Pressable, Keyboard } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { isValidEmail } from "@/lib/user-profile";

export default function EmailScreen() {
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const { profile, updateProfile, completeOnboarding } = useUserProfile();

  const [email, setEmail] = useState(profile.email ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    const trimmed = email.trim();
    if (trimmed && !isValidEmail(trimmed)) {
      setError("Please enter a valid email address");
      return;
    }
    if (trimmed) {
      await updateProfile({ email: trimmed });
    }
    await completeOnboarding();
  };

  const handleSkip = async () => {
    await completeOnboarding();
  };

  const styles = makeStyles(C, insets);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>Stay in the loop</Text>
        <Text style={styles.description}>
          Get notified about new guides, features, and emergency preparedness tips. We'll never
          spam you.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor={C.textSecondary}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (error) setError(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
        />

        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.primaryButton} onPress={handleSubmit}>
          <Text style={styles.primaryButtonText}>
            {email.trim() ? "Continue" : "Continue without email"}
          </Text>
        </Pressable>
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Maybe Later</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(C: any, insets: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
      paddingTop: insets.top + 16,
      paddingBottom: insets.bottom + 16,
      paddingHorizontal: 24,
    },
    content: {
      flex: 1,
      justifyContent: "center",
    },
    heading: {
      fontSize: 28,
      fontWeight: "700",
      color: C.text,
      marginBottom: 12,
    },
    description: {
      fontSize: 16,
      color: C.textSecondary,
      lineHeight: 24,
      marginBottom: 24,
    },
    input: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: C.text,
      backgroundColor: C.surface,
    },
    error: {
      color: "#e53e3e",
      fontSize: 14,
      marginTop: 8,
    },
    footer: {
      gap: 12,
    },
    primaryButton: {
      backgroundColor: C.accent,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
    },
    primaryButtonText: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "600",
    },
    skipButton: {
      paddingVertical: 12,
      alignItems: "center",
    },
    skipText: {
      color: C.textSecondary,
      fontSize: 16,
    },
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add NorthKeep/artifacts/survival-app/app/onboarding/
git commit -m "feat: add onboarding screens (welcome, profile, email)"
```

---

## Task 7: Wire Onboarding Gate into Root Layout

**Files:**
- Modify: `NorthKeep/artifacts/survival-app/app/_layout.tsx`

- [ ] **Step 1: Add UserProfileProvider to the provider tree**

In `app/_layout.tsx`, add the import:

```typescript
import { UserProfileProvider } from "@/contexts/UserProfileContext";
```

Wrap `UserProfileProvider` around the existing providers, just inside `ThemeProvider` (before `GuideStoreProvider`):

```typescript
<ThemeProvider>
  <UserProfileProvider>
    <GuideStoreProvider>
      {/* ... rest of providers ... */}
    </GuideStoreProvider>
  </UserProfileProvider>
</ThemeProvider>
```

- [ ] **Step 2: Add conditional routing for onboarding**

In the `RootLayoutNav` component (which renders the `Stack`), use the `useUserProfile` hook to check onboarding state:

```typescript
import { useUserProfile } from "@/contexts/UserProfileContext";

function RootLayoutNav() {
  const { onboardingCompleted } = useUserProfile();

  // Still loading onboarding state — show nothing (splash is still visible)
  if (onboardingCompleted === null) return null;

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      {!onboardingCompleted && (
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      )}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* ... rest of existing screens ... */}
    </Stack>
  );
}
```

The key: when `onboardingCompleted` is false, the `onboarding` stack screen is rendered first in the Stack, making it the initial route. When onboarding completes, the state update causes a re-render that removes the onboarding screen and shows the tabs. Expo Router handles this transition automatically.

- [ ] **Step 3: Commit**

```bash
git add NorthKeep/artifacts/survival-app/app/_layout.tsx
git commit -m "feat: wire onboarding gate and UserProfileProvider into root layout"
```

---

## Task 8: Guide View Tracking Integration

**Files:**
- Modify: `NorthKeep/artifacts/survival-app/app/guides/[slug].tsx`
- Modify: `NorthKeep/artifacts/survival-app/contexts/GuideStoreContext.tsx`

- [ ] **Step 1: Record view in guide detail screen**

In `app/guides/[slug].tsx`, add the import:

```typescript
import { recordGuideView } from "@/lib/guide-views";
```

Add a `useEffect` near the existing effects (after the guide lookup) to record the view when the screen mounts with a valid slug:

```typescript
useEffect(() => {
  if (slug) {
    recordGuideView(slug);
  }
}, [slug]);
```

- [ ] **Step 2: Add view sync to the guide sync cycle**

In `contexts/GuideStoreContext.tsx`, add the import:

```typescript
import { syncGuideViews } from "@/lib/guide-views";
```

At the end of the `deltaSync()` function, after the existing sync logic completes successfully, add:

```typescript
// Sync guide view counts (fire and forget)
syncGuideViews().catch((e) => console.warn("[GuideStore] View sync error:", e));
```

Also add the same call at the end of the initial sync / auto-sync block so view counts are synced whenever the app talks to Supabase.

- [ ] **Step 3: Commit**

```bash
git add NorthKeep/artifacts/survival-app/app/guides/[slug].tsx NorthKeep/artifacts/survival-app/contexts/GuideStoreContext.tsx
git commit -m "feat: track guide views locally and sync to Supabase during guide sync"
```

---

## Task 9: Settings — "Your Profile" Section

**Files:**
- Modify: `NorthKeep/artifacts/survival-app/app/(tabs)/settings.tsx`

- [ ] **Step 1: Add profile section imports**

Add to the top of `settings.tsx`:

```typescript
import { useUserProfile } from "@/contexts/UserProfileContext";
import { USER_TYPE_LABELS, EXPERIENCE_LABELS, HOUSEHOLD_LABELS } from "@/lib/user-profile";
```

- [ ] **Step 2: Add the "Your Profile" section**

Inside the Settings component, after the hooks but before the existing sections, add:

```typescript
const { profile } = useUserProfile();

const userTypeDisplay = profile.userTypes.length > 0
  ? profile.userTypes.map((t) => USER_TYPE_LABELS[t]).join(", ")
  : "Not set";

const experienceDisplay = profile.experienceLevel
  ? EXPERIENCE_LABELS[profile.experienceLevel]
  : "Not set";

const householdDisplay = profile.householdSize
  ? HOUSEHOLD_LABELS[profile.householdSize]
  : "Not set";

const emailDisplay = profile.email ?? "Not provided";
```

Then in the JSX, add a new section **above** the existing "Appearance" section. Use the existing `SettingsRow` component pattern:

```tsx
{/* Your Profile */}
<Text style={styles.sectionTitle}>Your Profile</Text>
<View style={styles.section}>
  <SettingsRow icon="mail-outline" title="Email" subtitle={emailDisplay} />
  <SettingsRow icon="people-outline" title="User Type" subtitle={userTypeDisplay} />
  <SettingsRow icon="trending-up-outline" title="Experience" subtitle={experienceDisplay} />
  <SettingsRow icon="home-outline" title="Household" subtitle={householdDisplay} />
  <SettingsRow icon="chatbubble-outline" title="Offline AI Chat" subtitle="Coming Soon" />
</View>
```

Note: Profile editing from Settings (tappable fields that open edit modals) is a follow-up task. For now, display-only is sufficient. Users can see their data; editing can be added in a subsequent iteration.

- [ ] **Step 3: Commit**

```bash
git add NorthKeep/artifacts/survival-app/app/(tabs)/settings.tsx
git commit -m "feat: add Your Profile section to Settings screen"
```

---

## Task 10: Manual Testing & Verification

**Files:** None (testing only)

- [ ] **Step 1: Run the app on iOS simulator**

```bash
cd NorthKeep/artifacts/survival-app && npx expo start --ios
```

- [ ] **Step 2: Verify onboarding flow**

1. Fresh launch → Welcome screen appears
2. "Get Started" → Profile screen with chip selectors
3. Select types, experience, household → "Next"
4. Email screen → enter email or skip
5. App navigates to Knowledge tab
6. Kill and relaunch → onboarding does NOT show again

- [ ] **Step 3: Verify skip flow**

Clear AsyncStorage (delete app from simulator), relaunch:
1. Welcome screen → tap "Skip"
2. App goes straight to Knowledge tab
3. Relaunch → no onboarding

- [ ] **Step 4: Verify guide view tracking**

1. Open any guide detail screen
2. Check SQLite (via debug tools or console logs) for `guide_views` row
3. If online, check Supabase `guide_view_counts` table after a sync

- [ ] **Step 5: Verify Settings profile section**

1. Go to Settings tab
2. "Your Profile" section shows above "Appearance"
3. Fields display the values entered during onboarding (or "Not set" / "Not provided")
4. "Offline AI Chat" shows "Coming Soon"

- [ ] **Step 6: Verify Supabase data**

In Supabase dashboard, check:
1. `user_profiles` table has a row with the device's UUID and profile data
2. `guide_view_counts` table has rows for viewed guides
3. Try updating `ai_chat_unlocked` via the client — verify the trigger resets it

---

## Summary

| Task | What it does |
|------|-------------|
| 1 | Supabase schema: tables, RLS, trigger |
| 2 | `lib/user-profile.ts`: types, storage, sync |
| 3 | `lib/guide-views.ts`: SQLite counter, batch sync |
| 4 | `lib/ai-chat-capability.ts`: device check stub |
| 5 | `contexts/UserProfileContext.tsx`: React context |
| 6 | `app/onboarding/*`: three onboarding screens |
| 7 | `app/_layout.tsx`: onboarding gate + provider wiring |
| 8 | Guide view tracking integration (detail screen + sync) |
| 9 | Settings: "Your Profile" display section |
| 10 | Manual testing & verification |
