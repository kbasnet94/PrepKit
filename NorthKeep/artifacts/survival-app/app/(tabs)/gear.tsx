import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState, useCallback } from "react";
import {
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useGuideStore } from "@/contexts/GuideStoreContext";
import {
  aggregateTools,
  groupToolsByCategory,
  type AggregatedTool,
} from "@/lib/guides/tool-aggregator";
import { AmazonButton } from "@/components/AmazonButton";
import { ToolDetailSheet } from "@/components/ToolDetailSheet";

// ── Category icons ──────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  equipment: "build-outline",
  technique: "hand-left-outline",
  supply: "cube-outline",
  material: "layers-outline",
  "Water Purification": "water-outline",
  "First Aid": "medkit-outline",
  Communication: "radio-outline",
  Signaling: "megaphone-outline",
  Shelter: "home-outline",
  Fire: "flame-outline",
  Navigation: "compass-outline",
  Cutting: "cut-outline",
  "Rope & Cordage": "link-outline",
  Lighting: "flashlight-outline",
  Cooking: "restaurant-outline",
  Storage: "file-tray-stacked-outline",
  General: "construct-outline",
};

function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? "construct-outline";
}

// ── Component ───────────────────────────────────────────────────────────────

export default function GearTab() {
  const { colors: C, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { guides, isLoaded } = useGuideStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTool, setSelectedTool] = useState<AggregatedTool | null>(
    null
  );

  const styles = useMemo(() => makeStyles(C), [C]);

  // ── Aggregate tools from all guides ─────────────────────────────────────
  const allTools = useMemo(() => aggregateTools(guides), [guides]);

  // ── Filter by search ────────────────────────────────────────────────────
  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return allTools;
    const q = searchQuery.toLowerCase();
    return allTools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }, [allTools, searchQuery]);

  // ── Group by category for SectionList ───────────────────────────────────
  const sections = useMemo(
    () => groupToolsByCategory(filteredTools),
    [filteredTools]
  );

  const handleToolPress = useCallback((tool: AggregatedTool) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedTool(tool);
  }, []);

  const handleGuidePress = useCallback((slug: string) => {
    setSelectedTool(null);
    router.push(`/guides/${slug}`);
  }, []);

  // ── Empty state ─────────────────────────────────────────────────────────
  if (isLoaded && allTools.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.emptyState}>
          <Ionicons name="construct-outline" size={48} color={C.textTertiary} />
          <Text style={styles.emptyTitle}>No gear yet</Text>
          <Text style={styles.emptySubtitle}>
            Download some guides from the Knowledge tab — tools and gear will
            appear here automatically.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <Text style={styles.screenTitle}>Gear</Text>
        <Text style={styles.screenSubtitle}>
          {allTools.length} tool{allTools.length !== 1 && "s"} across your
          downloaded guides
        </Text>
      </Animated.View>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={18}
          color={C.textTertiary}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tools..."
          placeholderTextColor={C.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color={C.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* ── Tool list ───────────────────────────────────────────────────── */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Ionicons
              name={getCategoryIcon(section.title) as any}
              size={16}
              color={C.accent}
            />
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(index * 30).duration(200)}
          >
            <Pressable
              onPress={() => handleToolPress(item)}
              style={({ pressed }) => [
                styles.toolCard,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={styles.toolCardMain}>
                <View style={styles.toolIconContainer}>
                  <Ionicons
                    name={
                      (item.icon ?? getCategoryIcon(item.category)) as any
                    }
                    size={22}
                    color={C.accent}
                  />
                </View>
                <View style={styles.toolCardText}>
                  <View style={styles.toolNameRow}>
                    <Text style={styles.toolName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.optional && (
                      <View style={styles.optionalBadge}>
                        <Text style={styles.optionalText}>Optional</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={styles.toolDescription}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                  <View style={styles.toolMeta}>
                    <Text style={styles.guideCount}>
                      {item.guideCount} guide
                      {item.guideCount !== 1 && "s"}
                    </Text>
                    {item.amazonEnabled && item.amazonSearchKeywords && (
                      <View style={styles.amazonBadge}>
                        <Ionicons
                          name="cart-outline"
                          size={10}
                          color={C.accent}
                        />
                        <Text style={styles.amazonBadgeText}>Shop</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={C.textTertiary}
                />
              </View>
            </Pressable>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.emptySearch}>
            <Text style={styles.emptySearchText}>
              No tools matching "{searchQuery}"
            </Text>
          </View>
        }
      />

      {/* ── Tool detail sheet ───────────────────────────────────────────── */}
      {selectedTool && (
        <ToolDetailSheet
          tool={selectedTool}
          visible={!!selectedTool}
          onClose={() => setSelectedTool(null)}
          onGuidePress={handleGuidePress}
        />
      )}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: C.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 4,
    },
    screenTitle: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: C.text,
      letterSpacing: -0.5,
    },
    screenSubtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
      marginTop: 2,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.surface,
      marginHorizontal: 20,
      marginVertical: 12,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 40,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: C.text,
    },
    listContent: {
      paddingHorizontal: 20,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingTop: 20,
      paddingBottom: 8,
    },
    sectionTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      flex: 1,
    },
    sectionCount: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: C.textTertiary,
      backgroundColor: C.surface,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      overflow: "hidden",
    },
    toolCard: {
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
    },
    toolCardMain: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    toolIconContainer: {
      width: 42,
      height: 42,
      borderRadius: 10,
      backgroundColor: C.accentSurface ?? `${C.accent}15`,
      alignItems: "center",
      justifyContent: "center",
    },
    toolCardText: {
      flex: 1,
      gap: 3,
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
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    optionalText: {
      fontSize: 9,
      fontFamily: "Inter_600SemiBold",
      color: C.warning,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    toolDescription: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
      lineHeight: 18,
    },
    toolMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 2,
    },
    guideCount: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: C.textTertiary,
    },
    amazonBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: C.accentSurface ?? `${C.accent}15`,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    amazonBadgeText: {
      fontSize: 10,
      fontFamily: "Inter_600SemiBold",
      color: C.accent,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
      marginTop: 4,
    },
    emptySubtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
      textAlign: "center",
      lineHeight: 21,
    },
    emptySearch: {
      paddingVertical: 40,
      alignItems: "center",
    },
    emptySearchText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: C.textTertiary,
    },
  });
}
