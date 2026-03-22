import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";

import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import {
  useInventory,
  CATEGORIES,
  CATEGORY_ICONS,
  ItemCategory,
  InventoryItem,
  ItemStatus,
} from "@/contexts/InventoryContext";

function SwipeDeleteAction({ C }: { C: typeof Colors.light }) {
  return (
    <View style={{ backgroundColor: C.danger, justifyContent: "center", alignItems: "center", width: 80, borderRadius: 12, marginLeft: 8, gap: 4 }}>
      <Ionicons name="trash" size={20} color="#fff" />
      <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>Delete</Text>
    </View>
  );
}

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const {
    items,
    kits,
    isLoading,
    loadInventory,
    deleteItem,
    getItemsByCategory,
    getItemsByKit,
    getExpiringItems,
    getExpiredItems,
    getNeedToBuyItems,
    markAsPurchased,
  } = useInventory();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORIES));
  const [expandedKits, setExpandedKits] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"category" | "kit" | "shopping">("category");

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    setExpandedKits(new Set(kits.map((k) => k.id).concat(["unassigned"])));
  }, [kits]);

  const itemsByCategory = getItemsByCategory();
  const expiringItems = getExpiringItems();
  const expiredItems = getExpiredItems();
  const needToBuyItems = getNeedToBuyItems();

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleKit = (kitId: string) => {
    setExpandedKits((prev) => {
      const next = new Set(prev);
      if (next.has(kitId)) next.delete(kitId);
      else next.add(kitId);
      return next;
    });
  };

  const handleDelete = useCallback(async (item: InventoryItem) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (Platform.OS === "web") {
      await deleteItem(item.id);
      return;
    }
    Alert.alert("Delete Item", `Remove "${item.name}" from your inventory?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteItem(item.id),
      },
    ]);
  }, [deleteItem]);

  const handleSwipeDelete = useCallback(async (item: InventoryItem) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    await deleteItem(item.id);
  }, [deleteItem]);

  const formatExpiry = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  const getExpiryStatus = (item: InventoryItem) => {
    if (!item.expiryDate) return null;
    const now = Date.now();
    const thirtyDays = now + 30 * 24 * 60 * 60 * 1000;
    if (item.expiryDate <= now) return "expired";
    if (item.expiryDate <= thirtyDays) return "expiring";
    return "ok";
  };

  const conditionColor = (condition: string) => {
    switch (condition) {
      case "Good": return C.statusGood;
      case "Fair": return C.statusFair;
      case "Poor": return C.statusPoor;
      case "Expired": return C.statusExpired;
      default: return C.textSecondary;
    }
  };

  const renderItem = (item: InventoryItem, index: number) => {
    const expiryStatus = getExpiryStatus(item);
    const kit = kits.find((k) => k.id === item.kitId);

    const itemContent = (
      <Pressable
        style={({ pressed }) => [styles.itemCard, pressed && styles.itemCardPressed]}
        onPress={() => router.push({ pathname: "/inventory/edit/[id]", params: { id: item.id } })}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.itemMain}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.itemMeta}>
              {item.status === "need_to_buy" && viewMode !== "shopping" ? (
                <View style={styles.needToBuyBadge}>
                  <Ionicons name="cart" size={10} color={C.warning} />
                  <Text style={styles.needToBuyBadgeText}>Need to Buy</Text>
                </View>
              ) : null}
              <Text style={styles.itemQuantity}>
                {item.quantity}{item.unit ? ` ${item.unit}` : ""}
              </Text>
              {item.status !== "need_to_buy" ? (
                <>
                  <View style={[styles.conditionDot, { backgroundColor: conditionColor(item.condition) }]} />
                  <Text style={[styles.conditionText, { color: conditionColor(item.condition) }]}>
                    {item.condition}
                  </Text>
                </>
              ) : null}
              {viewMode === "category" && kit ? (
                <View style={styles.kitBadge}>
                  <Ionicons name="cube-outline" size={10} color={C.accent} />
                  <Text style={styles.kitBadgeText}>{kit.name}</Text>
                </View>
              ) : viewMode === "kit" ? (
                <View style={styles.kitBadge}>
                  <Ionicons name={CATEGORY_ICONS[item.category] as any} size={10} color={C.accent} />
                  <Text style={styles.kitBadgeText}>{item.category}</Text>
                </View>
              ) : null}
            </View>
          </View>
          {expiryStatus === "expired" ? (
            <View style={styles.expiryBadgeRed}>
              <Text style={styles.expiryBadgeRedText}>Expired</Text>
            </View>
          ) : expiryStatus === "expiring" ? (
            <View style={styles.expiryBadgeAmber}>
              <Text style={styles.expiryBadgeAmberText}>
                {formatExpiry(item.expiryDate!)}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );

    if (Platform.OS === "web") {
      return (
        <Animated.View key={item.id} entering={FadeInRight.delay(index * 30).duration(200)}>
          {itemContent}
        </Animated.View>
      );
    }

    return (
      <Animated.View key={item.id} entering={FadeInRight.delay(index * 30).duration(200)}>
        <Swipeable
          renderRightActions={() => <SwipeDeleteAction C={C} />}
          onSwipeableOpen={() => handleSwipeDelete(item)}
          overshootRight={false}
        >
          {itemContent}
        </Swipeable>
      </Animated.View>
    );
  };

  const unassignedItems = items.filter((i) => !i.kitId);

  const renderCategoryView = () => (
    <>
      {CATEGORIES.map((category) => {
        const categoryItems = itemsByCategory[category];
        if (categoryItems.length === 0) return null;
        const isExpanded = expandedCategories.has(category);
        return (
          <Animated.View key={category} entering={FadeInDown.duration(300)}>
            <Pressable
              style={styles.categoryHeader}
              onPress={() => toggleCategory(category)}
            >
              <View style={styles.categoryLeft}>
                <View style={styles.categoryIcon}>
                  <Ionicons
                    name={CATEGORY_ICONS[category as ItemCategory] as any}
                    size={18}
                    color={C.accent}
                  />
                </View>
                <Text style={styles.categoryTitle}>{category}</Text>
                <View style={styles.categoryCount}>
                  <Text style={styles.categoryCountText}>{categoryItems.length}</Text>
                </View>
              </View>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={C.textTertiary}
              />
            </Pressable>
            {isExpanded ? (
              <View style={styles.categoryItems}>
                {categoryItems.map((item, idx) => renderItem(item, idx))}
              </View>
            ) : null}
          </Animated.View>
        );
      })}
    </>
  );

  const renderKitView = () => (
    <>
      {kits.map((kit) => {
        const kitItems = getItemsByKit(kit.id);
        if (kitItems.length === 0) return null;
        const isExpanded = expandedKits.has(kit.id);
        return (
          <Animated.View key={kit.id} entering={FadeInDown.duration(300)}>
            <Pressable
              style={styles.categoryHeader}
              onPress={() => toggleKit(kit.id)}
            >
              <View style={styles.categoryLeft}>
                <View style={styles.categoryIcon}>
                  <Ionicons name="cube" size={18} color={C.accent} />
                </View>
                <Text style={styles.categoryTitle}>{kit.name}</Text>
                <View style={styles.categoryCount}>
                  <Text style={styles.categoryCountText}>{kitItems.length}</Text>
                </View>
              </View>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={C.textTertiary}
              />
            </Pressable>
            {isExpanded ? (
              <View style={styles.categoryItems}>
                {kitItems.map((item, idx) => renderItem(item, idx))}
              </View>
            ) : null}
          </Animated.View>
        );
      })}

      {unassignedItems.length > 0 ? (
        <Animated.View entering={FadeInDown.duration(300)}>
          <Pressable
            style={styles.categoryHeader}
            onPress={() => toggleKit("unassigned")}
          >
            <View style={styles.categoryLeft}>
              <View style={[styles.categoryIcon, { backgroundColor: C.surfaceSecondary }]}>
                <Ionicons name="remove-circle-outline" size={18} color={C.textTertiary} />
              </View>
              <Text style={styles.categoryTitle}>Unassigned</Text>
              <View style={styles.categoryCount}>
                <Text style={styles.categoryCountText}>{unassignedItems.length}</Text>
              </View>
            </View>
            <Ionicons
              name={expandedKits.has("unassigned") ? "chevron-up" : "chevron-down"}
              size={18}
              color={C.textTertiary}
            />
          </Pressable>
          {expandedKits.has("unassigned") ? (
            <View style={styles.categoryItems}>
              {unassignedItems.map((item, idx) => renderItem(item, idx))}
            </View>
          ) : null}
        </Animated.View>
      ) : null}

      {kits.length === 0 ? (
        <View style={styles.noKitsContainer}>
          <Ionicons name="folder-outline" size={32} color={C.textTertiary} />
          <Text style={styles.noKitsText}>No kits created yet</Text>
          <Pressable
            onPress={() => router.push("/inventory/kit")}
            style={({ pressed }) => [styles.noKitsButton, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="add" size={16} color={C.accent} />
            <Text style={styles.noKitsButtonText}>Create Kit</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );

  const handleMarkPurchased = useCallback(async (item: InventoryItem) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markAsPurchased(item.id);
  }, [markAsPurchased]);

  const renderShoppingListView = () => {
    if (needToBuyItems.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="cart-outline" size={48} color={C.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>Shopping List Empty</Text>
          <Text style={styles.emptySubtitle}>
            Browse guides and tap "Need to Buy" on tools you want to purchase
          </Text>
        </View>
      );
    }

    const grouped: Record<ItemCategory, InventoryItem[]> = {
      Food: [], Water: [], Tools: [], Medical: [], Shelter: [], Comms: [], Other: [],
    };
    for (const item of needToBuyItems) {
      if (grouped[item.category]) grouped[item.category].push(item);
    }

    return (
      <>
        {CATEGORIES.map((category) => {
          const catItems = grouped[category];
          if (catItems.length === 0) return null;
          return (
            <Animated.View key={category} entering={FadeInDown.duration(300)}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryLeft}>
                  <View style={[styles.categoryIcon, { backgroundColor: C.warningSurface }]}>
                    <Ionicons
                      name={CATEGORY_ICONS[category as ItemCategory] as any}
                      size={18}
                      color={C.warning}
                    />
                  </View>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  <View style={styles.categoryCount}>
                    <Text style={styles.categoryCountText}>{catItems.length}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.categoryItems}>
                {catItems.map((item, idx) => (
                  <Animated.View key={item.id} entering={FadeInRight.delay(idx * 30).duration(200)}>
                    <View style={styles.shoppingItem}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.itemQuantity}>
                          {item.quantity}{item.unit ? ` ${item.unit}` : ""}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleMarkPurchased(item)}
                        style={({ pressed }) => [styles.purchasedButton, pressed && { opacity: 0.7 }]}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color={C.statusGood} />
                        <Text style={styles.purchasedText}>Bought</Text>
                      </Pressable>
                    </View>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          );
        })}
      </>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: isWeb ? insets.top + 67 : insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventory</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push("/inventory/kit")}
            style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="folder-outline" size={22} color={C.accent} />
          </Pressable>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/inventory/add");
            }}
            style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]}
            testID="add-item-button"
          >
            <Ionicons name="add-circle-outline" size={24} color={C.accent} />
          </Pressable>
        </View>
      </View>

      {(expiredItems.length > 0 || expiringItems.length > 0) ? (
        <View style={styles.alertBanner}>
          <Ionicons
            name="warning-outline"
            size={18}
            color={expiredItems.length > 0 ? C.danger : C.warning}
          />
          <Text style={styles.alertText}>
            {expiredItems.length > 0
              ? `${expiredItems.length} expired item${expiredItems.length > 1 ? "s" : ""}`
              : ""}
            {expiredItems.length > 0 && expiringItems.length > 0 ? " · " : ""}
            {expiringItems.length > 0
              ? `${expiringItems.length} expiring soon`
              : ""}
          </Text>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{items.filter((i) => i.status !== "need_to_buy").length}</Text>
          <Text style={styles.statLabel}>Owned</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, needToBuyItems.length > 0 ? { color: C.warning } : undefined]}>{needToBuyItems.length}</Text>
          <Text style={styles.statLabel}>To Buy</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{kits.length}</Text>
          <Text style={styles.statLabel}>Kits</Text>
        </View>
      </View>

      {items.length > 0 ? (
        <View style={styles.viewToggle}>
          <Pressable
            onPress={() => setViewMode("category")}
            style={[styles.toggleButton, viewMode === "category" && styles.toggleButtonActive]}
          >
            <Ionicons
              name="grid-outline"
              size={14}
              color={viewMode === "category" ? "#fff" : C.textSecondary}
            />
            <Text style={[styles.toggleText, viewMode === "category" && styles.toggleTextActive]}>
              By Category
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode("kit")}
            style={[styles.toggleButton, viewMode === "kit" && styles.toggleButtonActive]}
          >
            <Ionicons
              name="cube-outline"
              size={14}
              color={viewMode === "kit" ? "#fff" : C.textSecondary}
            />
            <Text style={[styles.toggleText, viewMode === "kit" && styles.toggleTextActive]}>
              By Kit
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode("shopping")}
            style={[styles.toggleButton, viewMode === "shopping" && styles.toggleButtonShoppingActive]}
          >
            <Ionicons
              name="cart-outline"
              size={14}
              color={viewMode === "shopping" ? "#fff" : C.textSecondary}
            />
            <Text style={[styles.toggleText, viewMode === "shopping" && styles.toggleTextActive]}>
              To Buy{needToBuyItems.length > 0 ? ` (${needToBuyItems.length})` : ""}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: isWeb ? 34 + 84 : 100 }}
        showsVerticalScrollIndicator={false}
      >
        {viewMode === "shopping" ? (
          renderShoppingListView()
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="cube-outline" size={48} color={C.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Items Yet</Text>
            <Text style={styles.emptySubtitle}>
              Start building your survival inventory
            </Text>
            <Pressable
              onPress={() => router.push("/inventory/add")}
              style={({ pressed }) => [styles.emptyButton, pressed && { opacity: 0.8 }]}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Add Item</Text>
            </Pressable>
          </View>
        ) : viewMode === "category" ? (
          renderCategoryView()
        ) : (
          renderKitView()
        )}

        {items.length > 0 && Platform.OS !== "web" ? (
          <Text style={styles.swipeHint}>Swipe left on any item to delete</Text>
        ) : null}
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
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    headerTitle: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: C.text,
      letterSpacing: -0.5,
    },
    headerActions: {
      flexDirection: "row",
      gap: 4,
    },
    headerButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    alertBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 20,
      marginBottom: 8,
      padding: 12,
      backgroundColor: C.dangerSurface,
      borderRadius: 12,
    },
    alertText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: C.danger,
    },
    statsRow: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    statBox: {
      flex: 1,
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 14,
      alignItems: "center",
    },
    statNumber: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: C.accent,
    },
    statLabel: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: C.textSecondary,
      marginTop: 2,
    },
    viewToggle: {
      flexDirection: "row",
      marginHorizontal: 20,
      marginBottom: 12,
      backgroundColor: C.surface,
      borderRadius: 10,
      padding: 3,
    },
    toggleButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 8,
      borderRadius: 8,
    },
    toggleButtonActive: {
      backgroundColor: C.accent,
    },
    toggleButtonShoppingActive: {
      backgroundColor: C.warning,
    },
    toggleText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: C.textSecondary,
    },
    toggleTextActive: {
      color: "#fff",
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 20,
    },
    categoryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 4,
    },
    categoryLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    categoryIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: C.accentSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryTitle: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
    },
    categoryCount: {
      backgroundColor: C.surfaceSecondary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    categoryCountText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: C.textSecondary,
    },
    categoryItems: {
      gap: 4,
      marginBottom: 8,
    },
    itemCard: {
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 14,
    },
    itemCardPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.98 }],
    },
    itemMain: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    itemInfo: {
      flex: 1,
      gap: 4,
    },
    itemName: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
    },
    itemMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    itemQuantity: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: C.textSecondary,
    },
    conditionDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    conditionText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
    },
    kitBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: C.accentSurface,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    kitBadgeText: {
      fontSize: 10,
      fontFamily: "Inter_500Medium",
      color: C.accent,
    },
    expiryBadgeRed: {
      backgroundColor: C.dangerSurface,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    expiryBadgeRedText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: C.danger,
    },
    expiryBadgeAmber: {
      backgroundColor: C.warningSurface,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    expiryBadgeAmberText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: C.warning,
    },
    swipeHint: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: C.textTertiary,
      textAlign: "center",
      marginTop: 16,
    },
    noKitsContainer: {
      alignItems: "center",
      padding: 32,
      gap: 8,
    },
    noKitsText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
    },
    noKitsButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: C.accentSurface,
    },
    noKitsButtonText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: C.accent,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
      marginTop: 40,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 20,
      backgroundColor: C.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 24,
    },
    needToBuyBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: C.warningSurface,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    needToBuyBadgeText: {
      fontSize: 10,
      fontFamily: "Inter_600SemiBold",
      color: C.warning,
    },
    shoppingItem: {
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    purchasedButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: C.accentSurface,
    },
    purchasedText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: C.statusGood,
    },
    emptyButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: C.accent,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 14,
    },
    emptyButtonText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
  });
}
