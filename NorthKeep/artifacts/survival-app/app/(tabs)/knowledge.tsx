import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { GuideRequestList } from "@/components/GuideRequestList";
import { GuideRequestForm } from "@/components/GuideRequestForm";

import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getAllCategories,
  searchGuides,
  getGuideCountByCategory,
} from "@/lib/guides";
import type { Guide, GuideCategory } from "@/lib/guides";
import { useGuideStore } from "@/contexts/GuideStoreContext";
import type { CategoryDownloadState } from "@/contexts/GuideStoreContext";

const CATEGORY_ICONS: Record<string, string> = {
  natural_disasters: "alert-circle-outline",
  medical_safety: "medkit-outline",
  water_food: "water-outline",
  preparedness: "bag-outline",
  communication: "radio-outline",
  navigation: "compass-outline",
  power_utilities_home_safety: "flash-outline",
  shelter_fire_warmth: "bonfire-outline",
  weather_environment: "thunderstorm-outline",
  core_skills: "flame-outline",
  "Core survival": "flame-outline",
  Water: "water-outline",
  Navigation: "compass-outline",
  Shelter: "home-outline",
  Communication: "radio-outline",
  Disaster: "alert-circle-outline",
  Weather: "thunderstorm-outline",
  "Medical safety": "medkit-outline",
  Preparedness: "bag-outline",
};

const CATEGORY_LABELS: Record<string, string> = {
  natural_disasters: "Natural Disasters",
  medical_safety: "Medical Safety",
  water_food: "Water, Food & Sanitation",
  preparedness: "Preparedness",
  communication: "Communication",
  navigation: "Navigation & Rescue",
  power_utilities_home_safety: "Power & Home Safety",
  shelter_fire_warmth: "Shelter, Fire & Warmth",
  weather_environment: "Weather & Environment",
  core_skills: "Core Skills",
};

const LAYER_LABELS: Record<string, string> = {
  action_card: "Action",
  scenario_guide: "Scenario",
  reference_guide: "Reference",
  preparedness: "Preparedness",
};

const LAYER_COLORS: Record<string, string> = {
  action_card: "#2D6A4F",
  scenario_guide: "#8E6B3E",
  reference_guide: "#6B7280",
  preparedness: "#3D5A80",
};

const LAYER_BG: Record<string, string> = {
  action_card: "#2D6A4F14",
  scenario_guide: "#8E6B3E14",
  reference_guide: "#6B728012",
  preparedness: "#3D5A8014",
};

const RISK_COLORS: Record<string, string> = {
  low: "#2D6A4F",
  medium: "#8E6B3E",
  high: "#C0392B",
};

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

function RiskDot({ level }: { level: string }) {
  return (
    <View style={{ width: 7, height: 7, borderRadius: 4, flexShrink: 0, backgroundColor: RISK_COLORS[level] ?? "#9A948E" }} />
  );
}

function LayerBadge({ layer, contentStatus }: { layer: string; contentStatus: string }) {
  const { colors: C } = useTheme();
  if (contentStatus === "metadata_only") {
    return (
      <View style={{ alignSelf: "flex-start", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: C.surfaceSecondary }}>
        <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: C.textTertiary, letterSpacing: 0.3 }}>Planned</Text>
      </View>
    );
  }
  if (contentStatus === "needs_source_review") {
    return (
      <View style={{ alignSelf: "flex-start", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: C.warningSurface }}>
        <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: C.warning, letterSpacing: 0.3 }}>Review</Text>
      </View>
    );
  }
  const label = LAYER_LABELS[layer];
  if (!label) return null;
  return (
    <View style={[{ alignSelf: "flex-start", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }, { backgroundColor: LAYER_BG[layer] }]}>
      <Text style={[{ fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 }, { color: LAYER_COLORS[layer] }]}>{label}</Text>
    </View>
  );
}

function DownloadButton({
  state,
  onPress,
  C,
}: {
  state: CategoryDownloadState;
  onPress: () => void;
  C: typeof Colors.light;
}) {
  const btnBase = { width: 32, height: 32, borderRadius: 16, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: C.accentSurface };
  if (state === "downloading") {
    return (
      <View style={btnBase}>
        <ActivityIndicator size="small" color={C.accent} />
      </View>
    );
  }
  if (state === "downloaded") {
    return (
      <View style={btnBase}>
        <Ionicons name="checkmark" size={15} color={C.accent} />
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [btnBase, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name="cloud-download-outline" size={17} color={C.accent} />
    </Pressable>
  );
}

function CategoryCard({
  category,
  count,
  downloadState,
  onPress,
  onDownload,
  index,
  C,
  styles,
}: {
  category: GuideCategory;
  count: number;
  downloadState: CategoryDownloadState;
  onPress: () => void;
  onDownload: () => void;
  index: number;
  C: typeof Colors.light;
  styles: ReturnType<typeof makeStyles>;
}) {
  const icon = CATEGORY_ICONS[category] ?? "document-outline";
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(260)}>
      <Pressable
        style={({ pressed }) => [styles.categoryCard, pressed && styles.categoryCardPressed]}
        onPress={onPress}
      >
        <View style={styles.categoryIconWrap}>
          <Ionicons name={icon as any} size={22} color={C.accent} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{categoryLabel(category)}</Text>
          <Text style={styles.categoryCount}>
            {count} {count === 1 ? "guide" : "guides"}
            {downloadState === "downloaded" ? "  ·  saved offline" : ""}
          </Text>
        </View>
        <DownloadButton state={downloadState} onPress={onDownload} C={C} />
        <Ionicons name="chevron-forward" size={16} color={C.textTertiary} />
      </Pressable>
    </Animated.View>
  );
}

function GuideRow({
  guide,
  index,
  onPress,
  C,
  styles,
}: {
  guide: Guide;
  index: number;
  onPress: () => void;
  C: typeof Colors.light;
  styles: ReturnType<typeof makeStyles>;
}) {
  const isPlanned = guide.contentStatus === "metadata_only";
  return (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(220)}>
      <Pressable
        style={({ pressed }) => [
          styles.guideRow,
          pressed && styles.guideRowPressed,
          isPlanned && styles.guideRowPlanned,
        ]}
        onPress={onPress}
      >
        <View style={styles.guideRowLeft}>
          <RiskDot level={guide.riskLevel} />
          <View style={styles.guideRowText}>
            <Text style={[styles.guideRowTitle, isPlanned && styles.guideRowTitlePlanned]}>
              {guide.title}
            </Text>
            <View style={styles.guideRowMeta}>
              <LayerBadge layer={guide.layer} contentStatus={guide.contentStatus} />
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={15} color={C.textTertiary} />
      </Pressable>
    </Animated.View>
  );
}

type ScreenView = "categories" | "category-guides";

export default function KnowledgeScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [view, setView] = useState<ScreenView>("categories");
  const [selectedCategory, setSelectedCategory] = useState<GuideCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [requestsModal, setRequestsModal] = useState(false);
  const [requestFormTopic, setRequestFormTopic] = useState<string | null>(null);
  const {
    guides: allGuides,
    getCategoryState,
    downloadCategory,
    updateAvailable,
    checkForUpdates,
    availableCategories,
  } = useGuideStore();

  const totalGuides = allGuides.length;
  const hasNoGuides = totalGuides === 0;

  // When guides haven't been downloaded yet, show available categories from Supabase
  // so the user knows what they can download. Fall back to downloaded guide categories.
  const categories = useMemo(() => {
    if (availableCategories.length > 0) {
      const CATEGORY_ORDER = [
        "natural_disasters", "medical_safety", "water_food", "preparedness",
        "communication", "navigation", "power_utilities_home_safety",
        "shelter_fire_warmth", "weather_environment", "core_skills",
      ];
      return CATEGORY_ORDER.filter((c) =>
        availableCategories.some((a) => a.slug === c)
      ) as GuideCategory[];
    }
    return getAllCategories();
  }, [availableCategories, allGuides]);

  const countByCategory = useMemo(() => {
    if (availableCategories.length > 0) {
      return Object.fromEntries(availableCategories.map((c) => [c.slug, c.guideCount]));
    }
    return getGuideCountByCategory();
  }, [availableCategories, allGuides]);

  const layerCounts = useMemo(() => {
    const counts = { action_card: 0, scenario_guide: 0, reference_guide: 0, preparedness: 0 };
    for (const g of allGuides) {
      if (g.layer in counts) counts[g.layer as keyof typeof counts]++;
    }
    return counts;
  }, [allGuides]);

  const handleUpdateRefresh = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    checkForUpdates();
  };

  const categoryGuides = useMemo(() => {
    if (!selectedCategory) return [];
    const guides = allGuides.filter((g) => g.category === selectedCategory);
    if (!searchQuery.trim()) return guides;
    const q = searchQuery.toLowerCase();
    return guides.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.summary.toLowerCase().includes(q) ||
        g.tags.some((t) => t.includes(q))
    );
  }, [allGuides, selectedCategory, searchQuery]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || view !== "categories") return null;
    return searchGuides(searchQuery);
  }, [searchQuery, view]);

  const handleSelectCategory = (category: GuideCategory) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(category);
    setView("category-guides");
    setSearchQuery("");
  };

  const handleDownloadCategory = (category: GuideCategory) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    downloadCategory(category);
  };

  const handleBack = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setView("categories");
    setSelectedCategory(null);
    setSearchQuery("");
  };

  const handleOpenGuide = (guide: Guide) => {
    router.push({ pathname: "/guides/[slug]", params: { slug: guide.slug } });
  };

  return (
    <View style={[styles.container, { paddingTop: isWeb ? insets.top + 67 : insets.top }]}>
      <View style={styles.header}>
        {view === "category-guides" ? (
          <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={C.accent} />
          </Pressable>
        ) : null}
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>
            {view === "category-guides" && selectedCategory
              ? categoryLabel(selectedCategory)
              : "Knowledge"}
          </Text>
          {view === "categories" ? (
            <Pressable
              onPress={() => { setRequestsModal(true); setRequestFormTopic(null); }}
              style={({ pressed }) => [styles.requestsLink, pressed && { opacity: 0.6 }]}
              hitSlop={4}
            >
              <Ionicons name="bulb-outline" size={13} color={C.accent} />
              <Text style={styles.requestsLinkText}>Request a guide</Text>
            </Pressable>
          ) : null}
          {view === "categories" ? (
            <>
              <Text style={styles.headerSub}>
                {hasNoGuides ? "Download guides to get started" : `${totalGuides} guides · offline`}
              </Text>
              <View style={[styles.layerCountRow, hasNoGuides && { opacity: 0 }]}>
                <View style={styles.layerCountItem}>
                  <View style={[styles.layerCountDot, { backgroundColor: LAYER_COLORS.action_card }]} />
                  <Text style={styles.layerCountText}>{layerCounts.action_card} Action</Text>
                </View>
                <Text style={styles.layerCountSep}>·</Text>
                <View style={styles.layerCountItem}>
                  <View style={[styles.layerCountDot, { backgroundColor: LAYER_COLORS.scenario_guide }]} />
                  <Text style={styles.layerCountText}>{layerCounts.scenario_guide} Scenario</Text>
                </View>
                <Text style={styles.layerCountSep}>·</Text>
                <View style={styles.layerCountItem}>
                  <View style={[styles.layerCountDot, { backgroundColor: LAYER_COLORS.reference_guide }]} />
                  <Text style={styles.layerCountText}>{layerCounts.reference_guide} Reference</Text>
                </View>
                <Text style={styles.layerCountSep}>·</Text>
                <View style={styles.layerCountItem}>
                  <View style={[styles.layerCountDot, { backgroundColor: LAYER_COLORS.preparedness }]} />
                  <Text style={styles.layerCountText}>{layerCounts.preparedness} Preparedness</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={C.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder={
            view === "category-guides"
              ? `Search ${selectedCategory ? categoryLabel(selectedCategory) : ""}…`
              : "Search all guides…"
          }
          placeholderTextColor={C.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={C.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {view === "categories" && updateAvailable ? (
        <Animated.View entering={FadeIn.duration(300)}>
          <Pressable
            style={({ pressed }) => [styles.updateBanner, pressed && { opacity: 0.8 }]}
            onPress={handleUpdateRefresh}
          >
            <Ionicons name="cloud-download-outline" size={16} color="#fff" />
            <Text style={styles.updateBannerText}>Guide updates available — tap to refresh</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {view === "categories" && !searchQuery ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: isWeb ? 34 + 84 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {categories.map((cat, i) => (
            <CategoryCard
              key={cat}
              category={cat}
              count={countByCategory[cat] ?? 0}
              downloadState={getCategoryState(cat)}
              onPress={() => handleSelectCategory(cat)}
              onDownload={() => handleDownloadCategory(cat)}
              index={i}
              C={C}
              styles={styles}
            />
          ))}
        </ScrollView>
      ) : view === "categories" && searchQuery ? (
        <FlatList
          data={searchResults ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <GuideRow guide={item} index={index} onPress={() => handleOpenGuide(item)} C={C} styles={styles} />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: isWeb ? 34 + 84 : 100 },
          ]}
          ListHeaderComponent={
            <Text style={styles.searchResultsLabel}>
              {searchResults?.length ?? 0} result{(searchResults?.length ?? 0) !== 1 ? "s" : ""}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={44} color={C.textTertiary} />
              <Text style={styles.emptyTitle}>No results</Text>
              <Text style={styles.emptySubtitle}>Try a different search term</Text>
              <Pressable
                onPress={() => {
                  setRequestsModal(true);
                  setRequestFormTopic(null);
                }}
                style={({ pressed }) => [styles.requestPromptBtn, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="bulb-outline" size={14} color={C.accent} />
                <Text style={styles.requestPromptText}>
                  Request "{searchQuery}" as a guide topic
                </Text>
              </Pressable>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={categoryGuides}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <GuideRow guide={item} index={index} onPress={() => handleOpenGuide(item)} C={C} styles={styles} />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: isWeb ? 34 + 84 : 100 },
          ]}
          ListHeaderComponent={
            <View style={styles.layerLegend}>
              <View style={styles.layerLegendItem}>
                <View style={[styles.layerDot, { backgroundColor: LAYER_COLORS.action_card }]} />
                <Text style={styles.layerLegendText}>Action</Text>
              </View>
              <View style={styles.layerLegendItem}>
                <View style={[styles.layerDot, { backgroundColor: LAYER_COLORS.scenario_guide }]} />
                <Text style={styles.layerLegendText}>Scenario</Text>
              </View>
              <View style={styles.layerLegendItem}>
                <View style={[styles.layerDot, { backgroundColor: LAYER_COLORS.reference_guide }]} />
                <Text style={styles.layerLegendText}>Reference</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={44} color={C.textTertiary} />
              <Text style={styles.emptyTitle}>No guides</Text>
              <Text style={styles.emptySubtitle}>Nothing matches your search</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Requests modal — list + form */}
      <Modal
        visible={requestsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setRequestsModal(false); setRequestFormTopic(null); }}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            {requestFormTopic !== null ? (
              <Pressable onPress={() => setRequestFormTopic(null)} hitSlop={8} style={styles.modalBack}>
                <Ionicons name="arrow-back" size={20} color={C.textSecondary} />
              </Pressable>
            ) : (
              <View style={{ width: 32 }} />
            )}
            <Text style={styles.modalTitle}>
              {requestFormTopic !== null ? "New Request" : "Guide Requests"}
            </Text>
            <Pressable
              onPress={() => { setRequestsModal(false); setRequestFormTopic(null); }}
              hitSlop={8}
              style={styles.modalClose}
            >
              <Ionicons name="close" size={20} color={C.textSecondary} />
            </Pressable>
          </View>

          {requestFormTopic !== null ? (
            <GuideRequestForm
              initialTopic={requestFormTopic}
              onSuccess={() => { setRequestFormTopic(null); setRequestsModal(false); }}
            />
          ) : (
            <GuideRequestList
              initialSearch={searchQuery}
              onRequestNew={(topic) => setRequestFormTopic(topic)}
            />
          )}
        </View>
      </Modal>
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
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
      gap: 10,
    },
    backButton: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 18,
      backgroundColor: C.accentSurface,
    },
    headerTitles: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 24,
      fontFamily: "Inter_700Bold",
      color: C.text,
      letterSpacing: -0.3,
    },
    headerSub: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
      marginTop: 2,
    },
    layerCountRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 5,
    },
    layerCountItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    layerCountDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    layerCountText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
    },
    layerCountSep: {
      fontSize: 12,
      color: C.textTertiary,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.surface,
      marginHorizontal: 20,
      marginBottom: 12,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 9,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: C.text,
    },
    scroll: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingTop: 4,
      gap: 8,
    },
    categoryCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.surface,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 13,
      gap: 12,
    },
    categoryCardPressed: {
      opacity: 0.75,
    },
    categoryIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: C.accentSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryInfo: {
      flex: 1,
    },
    categoryName: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
    },
    categoryCount: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
      marginTop: 2,
    },
    guideRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 10,
    },
    guideRowPressed: {
      opacity: 0.75,
    },
    guideRowPlanned: {
      opacity: 0.65,
      borderWidth: 1,
      borderColor: C.border,
      borderStyle: "dashed",
      backgroundColor: "transparent",
    },
    guideRowLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    guideRowText: {
      flex: 1,
      gap: 4,
    },
    guideRowTitle: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: C.text,
      lineHeight: 20,
    },
    guideRowTitlePlanned: {
      color: C.textTertiary,
    },
    guideRowMeta: {
      flexDirection: "row",
      alignItems: "center",
    },
    layerLegend: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 8,
      paddingBottom: 12,
    },
    layerLegendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    layerDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    layerLegendText: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
    },
    updateBanner: {
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
    updateBannerText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: "#fff",
      flex: 1,
    },
    searchResultsLabel: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: C.textSecondary,
      paddingBottom: 8,
    },
    emptyContainer: {
      alignItems: "center",
      paddingTop: 60,
      gap: 10,
    },
    emptyTitle: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
    },
    emptySubtitle: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
    },
    requestsLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 4,
    },
    requestsLinkText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: C.accent,
    },
    requestPromptBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 8,
      backgroundColor: C.accentSurface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    requestPromptText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: C.accent,
      flex: 1,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: C.background,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    modalBack: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    modalTitle: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
    },
    modalClose: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
