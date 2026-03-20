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

import { useTheme } from "@/contexts/ThemeContext";

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
  const { colors: C } = useTheme();
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

  const styles = StyleSheet.create({
    banner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.accent,
      marginHorizontal: 20,
      marginBottom: 8,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 8,
    },
    bannerError: {
      backgroundColor: "#C0392B",
    },
    text: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: "#fff",
      flex: 1,
    },
    action: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
      opacity: 0.85,
      textDecorationLine: "underline" as const,
    },
  });

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
