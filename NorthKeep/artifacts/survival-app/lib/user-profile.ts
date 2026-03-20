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

// --- Validation ---

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return false;
  const atIndex = trimmed.indexOf("@");
  if (atIndex < 1) return false;
  const domain = trimmed.slice(atIndex + 1);
  return domain.includes(".") && domain.length >= 3;
}
