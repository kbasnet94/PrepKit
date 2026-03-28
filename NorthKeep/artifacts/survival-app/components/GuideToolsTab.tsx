import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useInventory, type ItemCategory, type InventoryItem } from "@/contexts/InventoryContext";
import type { GuideTool } from "@/lib/guides/types";
import { AmazonButton } from "@/components/AmazonButton";

// ── Tool category → Inventory category mapping ─────────────────────────────

const TOOL_TO_INVENTORY: Record<string, ItemCategory> = {
  "Water Purification": "Water",
  "First Aid": "Medical",
  "Communication": "Comms",
  "Signaling": "Comms",
  "Shelter": "Shelter",
  "Fire": "Tools",
  "Navigation": "Tools",
  "Cutting": "Tools",
  "Rope & Cordage": "Tools",
  "Lighting": "Tools",
  "Cooking": "Tools",
  "Storage": "Tools",
  "General": "Other",
};

function mapToolCategory(toolCategory: string): ItemCategory {
  return TOOL_TO_INVENTORY[toolCategory] ?? "Tools";
}

// ── Fuzzy matching ──────────────────────────────────────────────────────────

function findInventoryMatch(
  toolName: string,
  items: InventoryItem[]
): InventoryItem | null {
  const norm = toolName.toLowerCase().trim();
  return (
    items.find((item) => {
      const n = item.name.toLowerCase().trim();
      return n.includes(norm) || norm.includes(n);
    }) ?? null
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export function GuideToolsTab({ tools }: { tools: GuideTool[] }) {
  const { colors: C } = useTheme();
  const { items: inventoryItems, addItem } = useInventory();
  const styles = useMemo(() => makeStyles(C), [C]);

  const handleAdd = useCallback(
    async (tool: GuideTool, status: "owned" | "need_to_buy" = "owned") => {
      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await addItem({
        name: tool.name,
        category: mapToolCategory(tool.category),
        quantity: 1,
        unit: null,
        notes: null,
        condition: status === "owned" ? "Good" : "Good",
        expiryDate: null,
        kitId: null,
        status,
      });
    },
    [addItem]
  );

  if (!tools || tools.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="construct-outline" size={40} color={C.textTertiary} />
        <Text style={styles.emptyTitle}>No tools listed</Text>
        <Text style={styles.emptySubtitle}>
          This guide doesn't reference any specific tools or equipment.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {tools.map((tool, index) => {
        const match = findInventoryMatch(tool.name, inventoryItems);
        const hasMatch = !!match;

        return (
          <Animated.View
            key={`${tool.name}-${index}`}
            entering={FadeInDown.delay(index * 40).duration(220)}
            style={styles.toolCard}
          >
            <View style={styles.toolHeader}>
              <View style={styles.toolNameRow}>
                <Text style={styles.toolName}>{tool.name}</Text>
              </View>
              <Text style={styles.toolCategory}>{tool.category}</Text>
            </View>

            <Text style={styles.toolDescription}>{tool.description}</Text>
            {tool.context ? (
              <Text style={styles.toolContext}>{tool.context}</Text>
            ) : null}

            {tool.amazonEnabled && tool.amazonSearchKeywords ? (
              <View style={styles.amazonRow}>
                <AmazonButton keywords={tool.amazonSearchKeywords} compact />
              </View>
            ) : null}

            <View style={styles.toolFooter}>
              {hasMatch && match?.status === "need_to_buy" ? (
                <View style={styles.statusRow}>
                  <Ionicons name="cart" size={16} color={C.warning} />
                  <Text style={[styles.inventoryText, { color: C.warning }]}>
                    Need to Buy
                  </Text>
                  {match && (
                    <Text style={styles.matchDetail}>
                      ({match.quantity} {match.unit ?? "pcs"})
                    </Text>
                  )}
                </View>
              ) : hasMatch ? (
                <View style={styles.statusRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={C.statusGood}
                  />
                  <Text style={[styles.inventoryText, { color: C.statusGood }]}>
                    In Inventory
                  </Text>
                  {match && (
                    <Text style={styles.matchDetail}>
                      ({match.quantity} {match.unit ?? "pcs"})
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.segmentedPill}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.segmentLeft,
                      { backgroundColor: C.accentSurface },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => handleAdd(tool, "owned")}
                  >
                    <Ionicons name="checkmark" size={14} color={C.accent} />
                    <Text style={[styles.segmentText, { color: C.accent }]}>
                      Own
                    </Text>
                  </Pressable>
                  <View style={[styles.segmentDivider, { backgroundColor: C.border }]} />
                  <Pressable
                    style={({ pressed }) => [
                      styles.segmentRight,
                      { backgroundColor: C.warningSurface },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => handleAdd(tool, "need_to_buy")}
                  >
                    <Ionicons name="cart-outline" size={14} color={C.warning} />
                    <Text style={[styles.segmentText, { color: C.warning }]}>
                      Need
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    container: {
      gap: 10,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
      marginTop: 4,
    },
    emptySubtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
      textAlign: "center",
      maxWidth: 260,
      lineHeight: 20,
    },
    toolCard: {
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 14,
      gap: 8,
    },
    toolHeader: {
      gap: 2,
    },
    toolNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    toolName: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
      flexShrink: 1,
    },
    toolCategory: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: C.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    toolDescription: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
      lineHeight: 19,
    },
    toolContext: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      fontStyle: "italic",
      color: C.textTertiary,
      lineHeight: 18,
    },
    amazonRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 2,
    },
    toolFooter: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 2,
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    inventoryText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
    },
    matchDetail: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: C.textTertiary,
    },
    segmentedPill: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 8,
      overflow: "hidden",
    },
    segmentLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8,
    },
    segmentDivider: {
      width: 1,
      height: 18,
    },
    segmentRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderTopRightRadius: 8,
      borderBottomRightRadius: 8,
    },
    segmentText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
    },
  });
}
