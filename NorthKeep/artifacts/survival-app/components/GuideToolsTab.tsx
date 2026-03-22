import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useInventory, type ItemCategory, type InventoryItem } from "@/contexts/InventoryContext";
import type { GuideTool } from "@/lib/guides/types";

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
                {tool.optional && (
                  <View style={styles.optionalBadge}>
                    <Text style={styles.optionalText}>Optional</Text>
                  </View>
                )}
              </View>
              <Text style={styles.toolCategory}>{tool.category}</Text>
            </View>

            <Text style={styles.toolDescription}>{tool.description}</Text>
            {tool.context ? (
              <Text style={styles.toolContext}>{tool.context}</Text>
            ) : null}

            <View style={styles.toolFooter}>
              {hasMatch && match?.status === "need_to_buy" ? (
                <View style={styles.needToBuy}>
                  <Ionicons
                    name="cart"
                    size={16}
                    color={C.warning}
                  />
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
                <View style={styles.inInventory}>
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
                <View style={styles.actionButtons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.addButton,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => handleAdd(tool, "owned")}
                  >
                    <Ionicons name="add-circle-outline" size={16} color={C.accent} />
                    <Text style={styles.addText}>Add to Inventory</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.needToBuyButton,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => handleAdd(tool, "need_to_buy")}
                  >
                    <Ionicons name="cart-outline" size={16} color={C.warning} />
                    <Text style={styles.needToBuyText}>Need to Buy</Text>
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
    optionalBadge: {
      backgroundColor: C.warningSurface,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    optionalText: {
      fontSize: 10,
      fontFamily: "Inter_600SemiBold",
      color: C.warning,
      textTransform: "uppercase",
      letterSpacing: 0.3,
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
    toolFooter: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 2,
    },
    inInventory: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    needToBuy: {
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
    actionButtons: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: C.accentSurface,
    },
    addText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: C.accent,
    },
    needToBuyButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: C.warningSurface,
    },
    needToBuyText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: C.warning,
    },
  });
}
