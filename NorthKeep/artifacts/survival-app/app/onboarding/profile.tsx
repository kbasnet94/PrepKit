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
    router.replace("/knowledge");
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
