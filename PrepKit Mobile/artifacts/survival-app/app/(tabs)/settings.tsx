import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useChat } from "@/contexts/ChatContext";
import { useKnowledge } from "@/contexts/KnowledgeContext";
import { useAIMode } from "@/lib/ai/use-ai-mode";
import type { AIRewriteMode } from "@/lib/ai/types";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { sessions, clearAllChats } = useChat();
  const { downloadedCount, totalStorageBytes, deleteAllArticles } = useKnowledge();
  const { mode: aiMode, setMode: setAIMode } = useAIMode();
  const { colors: C, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleClearChats = () => {
    if (Platform.OS === "web") {
      clearAllChats();
      return;
    }
    Alert.alert("Clear All Chats", "This will permanently delete all conversations. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          await clearAllChats();
        },
      },
    ]);
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

  const handleThemeToggle = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleTheme();
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
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.section}>
          <SettingsRow
            icon={isDark ? "moon" : "sunny-outline"}
            title="Dark Mode"
            subtitle={isDark ? "Dark theme enabled" : "Light theme enabled"}
            rightElement={
              <Switch
                value={isDark}
                onValueChange={handleThemeToggle}
                trackColor={{ false: C.surfaceSecondary, true: C.accent }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        <Text style={styles.sectionTitle}>Storage</Text>
        <View style={styles.section}>
          <SettingsRow
            icon="cloud-download-outline"
            title="Downloaded Articles"
            subtitle={`${downloadedCount} articles (${formatBytes(totalStorageBytes)})`}
          />
          <View style={styles.separator} />
          <SettingsRow
            icon="chatbubbles-outline"
            title="Chat History"
            subtitle={`${sessions.length} conversation${sessions.length !== 1 ? "s" : ""}`}
          />
        </View>

        <Text style={styles.sectionTitle}>Data Management</Text>
        <View style={styles.section}>
          <SettingsRow
            icon="trash-outline"
            title="Clear Chat History"
            subtitle="Delete all conversations"
            onPress={handleClearChats}
            destructive
          />
          <View style={styles.separator} />
          <SettingsRow
            icon="cloud-offline-outline"
            title="Delete All Downloads"
            subtitle="Remove all saved articles"
            onPress={handleDeleteDownloads}
            destructive
          />
        </View>

        <Text style={styles.sectionTitle}>AI</Text>
        <View style={styles.section}>
          <View style={styles.settingsRow}>
            <View style={styles.settingsIcon}>
              <Ionicons name="sparkles-outline" size={20} color={C.accent} />
            </View>
            <View style={styles.settingsContent}>
              <Text style={styles.settingsTitle}>AI Rewrite Mode</Text>
              <Text style={styles.settingsSubtitle}>Enhance answers with natural language rewriting</Text>
            </View>
          </View>
          <View style={styles.aiModeSelector}>
            {(["off", "assistive"] as AIRewriteMode[]).map((m) => (
              <Pressable
                key={m}
                style={[styles.aiModeOption, aiMode === m && styles.aiModeOptionActive]}
                onPress={() => setAIMode(m)}
              >
                <Text style={[styles.aiModeOptionText, aiMode === m && styles.aiModeOptionTextActive]}>
                  {m === "off" ? "Off" : "Assistive"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

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

        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.section}>
          <SettingsRow
            icon="shield-checkmark-outline"
            title="PrepKit"
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
            PrepKit is designed to work offline. All your data stays on your device.
          </Text>
        </View>
      </ScrollView>
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
    aiModeSelector: {
      flexDirection: "row",
      marginHorizontal: 14,
      marginBottom: 14,
      backgroundColor: C.surfaceSecondary,
      borderRadius: 10,
      padding: 3,
      gap: 2,
    },
    aiModeOption: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 8,
      alignItems: "center",
    },
    aiModeOptionActive: {
      backgroundColor: C.surface,
    },
    aiModeOptionText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: C.textTertiary,
    },
    aiModeOptionTextActive: {
      color: C.accent,
    },
  });
}
