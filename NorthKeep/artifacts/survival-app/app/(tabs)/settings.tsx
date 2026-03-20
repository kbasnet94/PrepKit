import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useKnowledge } from "@/contexts/KnowledgeContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { USER_TYPE_LABELS, EXPERIENCE_LABELS, HOUSEHOLD_LABELS } from "@/lib/user-profile";
import { AppFeedback } from "@/components/AppFeedback";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { downloadedCount, totalStorageBytes, deleteAllArticles } = useKnowledge();
  const [showAppFeedback, setShowAppFeedback] = useState(false);
  const { colors: C, mode: themeMode, setTheme } = useTheme();
  const { profile } = useUserProfile();
  const styles = useMemo(() => makeStyles(C), [C]);

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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDeleteDownloads = () => {
    if (Platform.OS === "web") {
      deleteAllArticles();
      return;
    }
    Alert.alert(
      "Delete All Downloads",
      "This will remove all downloaded articles. You can re-download them later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await deleteAllArticles();
          },
        },
      ]
    );
  };



  const SettingsRow = ({
    icon,
    title,
    subtitle,
    onPress,
    destructive,
    rightElement,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    destructive?: boolean;
    rightElement?: React.ReactNode;
  }) => (
    <Pressable
      style={({ pressed }) => [styles.settingsRow, pressed && onPress && styles.settingsRowPressed]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.settingsIcon, destructive && styles.settingsIconDestructive]}>
        <Ionicons
          name={icon as any}
          size={20}
          color={destructive ? C.danger : C.accent}
        />
      </View>
      <View style={styles.settingsContent}>
        <Text style={[styles.settingsTitle, destructive && styles.settingsTitleDestructive]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.settingsSubtitle}>{subtitle}</Text> : null}
      </View>
      {rightElement ? (
        rightElement
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />
      ) : null}
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: isWeb ? insets.top + 67 : insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: isWeb ? 34 + 84 : 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Your Profile */}
        <Text style={styles.sectionTitle}>Your Profile</Text>
        <View style={styles.section}>
          <SettingsRow icon="mail-outline" title="Email" subtitle={emailDisplay} />
          <SettingsRow icon="people-outline" title="User Type" subtitle={userTypeDisplay} />
          <SettingsRow icon="trending-up-outline" title="Experience" subtitle={experienceDisplay} />
          <SettingsRow icon="home-outline" title="Household" subtitle={householdDisplay} />
          <SettingsRow icon="chatbubble-outline" title="Offline AI Chat" subtitle="Coming Soon" />
        </View>

        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.section}>
          <View style={styles.settingsRow}>
            <View style={[styles.settingsIcon, { backgroundColor: C.accentSurface }]}>
              <Ionicons name="color-palette-outline" size={20} color={C.accent} />
            </View>
            <View style={styles.settingsContent}>
              <Text style={styles.settingsTitle}>Theme</Text>
              <Text style={styles.settingsSubtitle}>Choose your preferred visual style</Text>
            </View>
          </View>
          <View style={styles.themeModeSelector}>
            {(["light", "dark", "emergency"] as const).map((m) => (
              <Pressable
                key={m}
                style={[styles.themeModeOption, themeMode === m && styles.themeModeOptionActive]}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTheme(m);
                }}
              >
                <Text style={[styles.themeModeOptionText, themeMode === m && styles.themeModeOptionTextActive]}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Storage</Text>
        <View style={styles.section}>
          <SettingsRow
            icon="cloud-download-outline"
            title="Downloaded Articles"
            subtitle={`${downloadedCount} articles (${formatBytes(totalStorageBytes)})`}
          />
        </View>

        <Text style={styles.sectionTitle}>Data Management</Text>
        <View style={styles.section}>
          <SettingsRow
            icon="cloud-offline-outline"
            title="Delete All Downloads"
            subtitle="Remove all saved articles"
            onPress={handleDeleteDownloads}
            destructive
          />
        </View>

        {__DEV__ ? (
          <>
            <Text style={styles.sectionTitle}>Developer Tools</Text>
            <View style={styles.section}>
              <SettingsRow
                icon="flask-outline"
                title="Query Tester"
                subtitle="Test guide matching and query interpretation"
                onPress={() => router.push("/debug/query-test")}
              />
              <SettingsRow
                icon="document-text-outline"
                title="Answer Tester"
                subtitle="Test the structured answer engine against guide content"
                onPress={() => router.push("/debug/guide-answer-tester")}
              />
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Feedback</Text>
        <View style={styles.section}>
          <SettingsRow
            icon="star-outline"
            title="Rate the App"
            subtitle="Share your thoughts on NorthKeep"
            onPress={() => setShowAppFeedback(true)}
          />
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.section}>
          <SettingsRow
            icon="shield-checkmark-outline"
            title="NorthKeep"
            subtitle="Offline survival companion"
          />
          <View style={styles.separator} />
          <SettingsRow
            icon="lock-closed-outline"
            title="Privacy"
            subtitle="All data stored locally on your device"
          />
          <View style={styles.separator} />
          <SettingsRow
            icon="information-circle-outline"
            title="Version"
            subtitle="1.0.0"
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            NorthKeep is designed to work offline. All your data stays on your device.
          </Text>
        </View>
      </ScrollView>

      <AppFeedback visible={showAppFeedback} onClose={() => setShowAppFeedback(false)} />
    </View>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    headerTitle: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: C.text,
      letterSpacing: -0.5,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: C.textTertiary,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginTop: 20,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    section: {
      backgroundColor: C.surface,
      borderRadius: 14,
      overflow: "hidden",
    },
    settingsRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      gap: 12,
    },
    settingsRowPressed: {
      opacity: 0.7,
    },
    settingsIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: C.accentSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    settingsIconDestructive: {
      backgroundColor: C.dangerSurface,
    },
    settingsContent: {
      flex: 1,
      gap: 2,
    },
    settingsTitle: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
    },
    settingsTitleDestructive: {
      color: C.danger,
    },
    settingsSubtitle: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
    },
    separator: {
      height: 1,
      backgroundColor: C.borderLight,
      marginLeft: 62,
    },
    footer: {
      marginTop: 32,
      padding: 20,
      alignItems: "center",
    },
    footerText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textTertiary,
      textAlign: "center",
      lineHeight: 20,
    },
    themeModeSelector: {
      flexDirection: "row",
      marginHorizontal: 14,
      marginBottom: 14,
      backgroundColor: C.surfaceSecondary,
      borderRadius: 10,
      padding: 3,
      gap: 2,
    },
    themeModeOption: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 8,
      alignItems: "center",
    },
    themeModeOptionActive: {
      backgroundColor: C.surface,
    },
    themeModeOptionText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: C.textTertiary,
    },
    themeModeOptionTextActive: {
      color: C.accent,
    },
  });
}
