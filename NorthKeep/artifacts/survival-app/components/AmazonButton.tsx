import React from "react";
import { Pressable, Text, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { openAmazonLink } from "@/lib/amazon-link";
import { useTheme } from "@/contexts/ThemeContext";

interface AmazonButtonProps {
  keywords: string;
  /** Compact mode for inline use in tool cards */
  compact?: boolean;
}

export function AmazonButton({ keywords, compact = false }: AmazonButtonProps) {
  const { colors: C } = useTheme();

  const handlePress = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await openAmazonLink(keywords);
  };

  if (compact) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.compactButton,
          {
            backgroundColor: C.accent,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Ionicons name="cart-outline" size={14} color="#fff" />
        <Text style={styles.compactLabel}>Shop</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: C.accent,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Ionicons name="cart-outline" size={18} color="#fff" />
      <Text style={styles.label}>Shop on Amazon</Text>
      <Ionicons
        name="open-outline"
        size={14}
        color="rgba(255,255,255,0.7)"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  label: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  compactButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  compactLabel: {
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
});
