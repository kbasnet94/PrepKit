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
