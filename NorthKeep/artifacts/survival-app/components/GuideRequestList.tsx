import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import {
  fetchRequests,
  upvoteRequest,
  getUpvotedIds,
  type GuideRequest,
} from "@/lib/guide-requests";

const STATUS_LABELS: Record<string, string> = {
  pending: "Requested",
  planned: "Planned",
  completed: "Added",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#9A948E",
  planned: "#3D5A80",
  completed: "#2D6A4F",
};

interface Props {
  initialSearch?: string;
  onRequestNew: (topic: string) => void;
}

export function GuideRequestList({ initialSearch = "", onRequestNew }: Props) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [search, setSearch] = useState(initialSearch);
  const [requests, setRequests] = useState<GuideRequest[]>([]);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [upvoting, setUpvoting] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const [data, ids] = await Promise.all([
        fetchRequests(q || undefined),
        getUpvotedIds(),
      ]);
      setRequests(data);
      setUpvotedIds(ids);
    } catch {
      // silently fail — network may be unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(initialSearch);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => load(search), 350);
    return () => clearTimeout(timer);
  }, [search, load]);

  async function handleUpvote(req: GuideRequest) {
    if (upvoting || upvotedIds.has(req.id)) return;
    setUpvoting(req.id);
    try {
      await upvoteRequest(req.id);
      setUpvotedIds((prev) => new Set([...prev, req.id]));
      setRequests((prev) =>
        prev.map((r) =>
          r.id === req.id ? { ...r, upvote_count: r.upvote_count + 1 } : r
        )
      );
    } catch {
      // ignore — duplicate or offline
    } finally {
      setUpvoting(null);
    }
  }

  function renderItem({ item, index }: { item: GuideRequest; index: number }) {
    const alreadyVoted = upvotedIds.has(item.id);
    const isVoting = upvoting === item.id;
    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(220)}>
        <View style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.topic}>{item.topic}</Text>
            {item.description ? (
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: STATUS_COLORS[item.status] + "18" },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: STATUS_COLORS[item.status] },
                  ]}
                >
                  {STATUS_LABELS[item.status] ?? item.status}
                </Text>
              </View>
            </View>
          </View>
          <Pressable
            onPress={() => handleUpvote(item)}
            disabled={alreadyVoted || !!upvoting}
            hitSlop={8}
            style={({ pressed }) => [
              styles.upvoteBtn,
              alreadyVoted && styles.upvoteBtnActive,
              pressed && !alreadyVoted && { opacity: 0.6 },
            ]}
          >
            {isVoting ? (
              <ActivityIndicator size="small" color={C.accent} />
            ) : (
              <Ionicons
                name={alreadyVoted ? "arrow-up-circle" : "arrow-up-circle-outline"}
                size={22}
                color={alreadyVoted ? C.accent : C.textTertiary}
              />
            )}
            <Text
              style={[
                styles.upvoteCount,
                alreadyVoted && { color: C.accent },
              ]}
            >
              {item.upvote_count}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={15} color={C.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search requests…"
            placeholderTextColor={C.textTertiary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <Pressable
          onPress={() => onRequestNew(search)}
          style={({ pressed }) => [styles.newBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.newBtnText}>Request</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bulb-outline" size={44} color={C.textTertiary} />
              <Text style={styles.emptyTitle}>No requests yet</Text>
              <Text style={styles.emptySubtitle}>
                {search.trim()
                  ? `No one has requested "${search}" yet`
                  : "Be the first to suggest a guide topic"}
              </Text>
              <Pressable
                onPress={() => onRequestNew(search)}
                style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.emptyBtnText}>
                  {search.trim()
                    ? `Request "${search}"`
                    : "Submit a request"}
                </Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    searchBox: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.surface,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 6,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: C.text,
    },
    newBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.accent,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      gap: 4,
    },
    newBtnText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 100,
      gap: 8,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 10,
    },
    cardBody: {
      flex: 1,
      gap: 4,
    },
    topic: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
      lineHeight: 20,
    },
    description: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
      lineHeight: 17,
    },
    statusRow: {
      flexDirection: "row",
      marginTop: 2,
    },
    statusBadge: {
      alignSelf: "flex-start",
      borderRadius: 5,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    statusText: {
      fontSize: 10,
      fontFamily: "Inter_600SemiBold",
      letterSpacing: 0.3,
    },
    upvoteBtn: {
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      minWidth: 40,
    },
    upvoteBtnActive: {},
    upvoteCount: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: C.textTertiary,
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 60,
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
      textAlign: "center",
      paddingHorizontal: 32,
    },
    emptyBtn: {
      marginTop: 8,
      backgroundColor: C.accent,
      borderRadius: 10,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    emptyBtnText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
  });
}
