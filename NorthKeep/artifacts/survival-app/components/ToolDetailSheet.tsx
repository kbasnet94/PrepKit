import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useCallback } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// Animated.View removed — Modal handles its own slide animation

import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import {
  useInventory,
  type ItemCategory,
} from "@/contexts/InventoryContext";
import type { AggregatedTool } from "@/lib/guides/tool-aggregator";
import { AmazonButton } from "@/components/AmazonButton";

// ── Tool category → Inventory category mapping ─────────────────────────────

const TOOL_TO_INVENTORY: Record<string, ItemCategory> = {
  "Water Purification": "Water",
  "First Aid": "Medical",
  Communication: "Comms",
  Signaling: "Comms",
  Shelter: "Shelter",
  Fire: "Tools",
  Navigation: "Tools",
  Cutting: "Tools",
  "Rope & Cordage": "Tools",
  Lighting: "Tools",
  Cooking: "Tools",
  Storage: "Tools",
  General: "Other",
};

function mapToolCategory(toolCategory: string): ItemCategory {
  return TOOL_TO_INVENTORY[toolCategory] ?? "Tools";
}

interface ToolDetailSheetProps {
  tool: AggregatedTool;
  visible: boolean;
  onClose: () => void;
  onGuidePress: (slug: string) => void;
}

export function ToolDetailSheet({
  tool,
  visible,
  onClose,
  onGuidePress,
}: ToolDetailSheetProps) {
  const { colors: C } = useTheme();
  const insets = useSafeAreaInsets();
  const { items: inventoryItems, addItem } = useInventory();
  const styles = useMemo(() => makeStyles(C), [C]);

  // ── Inventory match ───────────────────────────────────────────────────
  const inventoryMatch = useMemo(() => {
    const norm = tool.name.toLowerCase().trim();
    return (
      inventoryItems.find((item) => {
        const n = item.name.toLowerCase().trim();
        return n.includes(norm) || norm.includes(n);
      }) ?? null
    );
  }, [tool.name, inventoryItems]);

  const handleAddToInventory = useCallback(
    async (status: "owned" | "need_to_buy") => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      await addItem({
        name: tool.name,
        category: mapToolCategory(tool.category),
        quantity: 1,
        unit: null,
        notes: null,
        condition: "Good",
        expiryDate: null,
        kitId: null,
        status,
      });
    },
    [addItem, tool]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 20 },
          ]}
        >
          {/* ── Handle + Close ────────────────────────────────────────── */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHandle} />
            <Pressable onPress={onClose} style={styles.closeTextButton}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Tool name + category ──────────────────────────────────── */}
            <View style={styles.titleSection}>
              <Text style={styles.toolName}>{tool.name}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{tool.category}</Text>
              </View>
            </View>

            {/* ── Description ───────────────────────────────────────────── */}
            <Text style={styles.description}>{tool.description}</Text>

            {/* ── Use cases ─────────────────────────────────────────────── */}
            {tool.useCases && tool.useCases.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Use Cases</Text>
                {tool.useCases.map((uc, i) => (
                  <View key={i} style={styles.useCaseRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={C.statusGood}
                    />
                    <Text style={styles.useCaseText}>{uc}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── Actions: Amazon + Inventory ──────────────────────────── */}
            <View style={styles.section}>
              {/* Amazon — full-width primary CTA */}
              {tool.amazonEnabled && tool.amazonSearchKeywords && !tool.variants?.length ? (
                <AmazonButton keywords={tool.amazonSearchKeywords} />
              ) : null}

              {/* Inventory — segmented control */}
              <Text style={[styles.sectionTitle, tool.amazonEnabled && tool.amazonSearchKeywords && !tool.variants?.length ? { marginTop: 14 } : undefined]}>
                Inventory
              </Text>
              {inventoryMatch ? (
                <View style={styles.inventoryStatus}>
                  <Ionicons
                    name={
                      inventoryMatch.status === "need_to_buy"
                        ? "cart"
                        : "checkmark-circle"
                    }
                    size={18}
                    color={
                      inventoryMatch.status === "need_to_buy"
                        ? C.warning
                        : C.statusGood
                    }
                  />
                  <Text
                    style={[
                      styles.inventoryText,
                      {
                        color:
                          inventoryMatch.status === "need_to_buy"
                            ? C.warning
                            : C.statusGood,
                      },
                    ]}
                  >
                    {inventoryMatch.status === "need_to_buy"
                      ? "Need to Buy"
                      : "In Inventory"}
                  </Text>
                  <Text style={styles.inventoryDetail}>
                    ({inventoryMatch.quantity}{" "}
                    {inventoryMatch.unit ?? "pcs"})
                  </Text>
                </View>
              ) : (
                <View style={styles.segmentedControl}>
                  <Pressable
                    onPress={() => handleAddToInventory("owned")}
                    style={({ pressed }) => [
                      styles.segmentLeft,
                      { backgroundColor: C.accentSurface },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Ionicons name="checkmark" size={16} color={C.accent} />
                    <Text style={[styles.segmentLabel, { color: C.accent }]}>
                      I Own This
                    </Text>
                  </Pressable>
                  <View style={[styles.segmentDivider, { backgroundColor: C.border }]} />
                  <Pressable
                    onPress={() => handleAddToInventory("need_to_buy")}
                    style={({ pressed }) => [
                      styles.segmentRight,
                      { backgroundColor: C.warningSurface },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Ionicons name="cart-outline" size={16} color={C.warning} />
                    <Text style={[styles.segmentLabel, { color: C.warning }]}>
                      Need to Buy
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* ── Variants / Amazon ─────────────────────────────────────── */}
            {tool.amazonEnabled &&
            tool.variants &&
            tool.variants.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Types</Text>
                {tool.variants.map((v, i) => (
                  <View key={i} style={styles.variantCard}>
                    <Text style={styles.variantLabel}>{v.label}</Text>
                    {v.description ? (
                      <Text
                        style={styles.variantDescription}
                        numberOfLines={3}
                      >
                        {v.description}
                      </Text>
                    ) : null}
                    <AmazonButton
                      keywords={v.amazonSearchKeywords}
                      compact
                    />
                  </View>
                ))}
              </View>
            ) : null}

            {/* ── Linked guides ─────────────────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Used in {tool.guideCount} guide
                {tool.guideCount !== 1 && "s"}
              </Text>
              {tool.guideTitles.map((title, i) => (
                <Pressable
                  key={tool.guideSlugs[i]}
                  onPress={() => onGuidePress(tool.guideSlugs[i])}
                  style={({ pressed }) => [
                    styles.guideLink,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Ionicons
                    name="book-outline"
                    size={16}
                    color={C.accent}
                  />
                  <Text style={styles.guideLinkText} numberOfLines={2}>
                    {title}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={C.textTertiary}
                  />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
      backgroundColor: C.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "80%",
      zIndex: 10,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 14,
      paddingBottom: 8,
      paddingHorizontal: 16,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.borderLight,
    },
    closeTextButton: {
      position: "absolute",
      right: 16,
      top: 12,
      padding: 4,
    },
    closeText: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: C.accent,
    },
    scrollContent: {
      paddingHorizontal: 20,
    },
    titleSection: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 12,
      marginBottom: 8,
    },
    toolName: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: C.text,
      letterSpacing: -0.3,
      flexShrink: 1,
    },
    categoryBadge: {
      backgroundColor: C.surface,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    categoryText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: C.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    description: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
      lineHeight: 22,
      marginBottom: 16,
    },
    variantCard: {
      backgroundColor: C.surface,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      gap: 4,
    },
    variantLabel: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
    },
    variantDescription: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
      lineHeight: 18,
      marginBottom: 4,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    useCaseRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      marginBottom: 6,
    },
    useCaseText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: C.text,
      lineHeight: 20,
      flex: 1,
    },
    inventoryStatus: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    inventoryText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
    },
    inventoryDetail: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textTertiary,
    },
    segmentedControl: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 10,
      overflow: "hidden",
    },
    segmentLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderTopLeftRadius: 10,
      borderBottomLeftRadius: 10,
    },
    segmentDivider: {
      width: 1,
      height: 22,
    },
    segmentRight: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderTopRightRadius: 10,
      borderBottomRightRadius: 10,
    },
    segmentLabel: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
    },
    guideLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: C.surface,
      borderRadius: 10,
      marginBottom: 6,
    },
    guideLinkText: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: C.text,
    },
  });
}
