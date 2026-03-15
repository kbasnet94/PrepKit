import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useKnowledge } from "@/contexts/KnowledgeContext";

export default function KnowledgeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { articles, deleteArticle } = useKnowledge();

  const article = articles.find((a) => a.id === id);

  if (!article) {
    return (
      <View style={[styles.container, { paddingTop: isWeb ? insets.top + 67 : insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={C.accent} />
          </Pressable>
          <Text style={styles.headerTitle}>Not Found</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Article not found</Text>
        </View>
      </View>
    );
  }

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleDateString([], {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatContent = (content: string) => {
    const paragraphs = content.split(/\n\n+/);
    return paragraphs.map((p) => p.trim()).filter((p) => p.length > 0);
  };

  return (
    <View style={[styles.container, { paddingTop: isWeb ? insets.top + 67 : insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="chevron-back" size={24} color={C.accent} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {article.title}
        </Text>
        <Pressable
          onPress={async () => {
            await deleteArticle(article.id);
            router.back();
          }}
          style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="trash-outline" size={20} color={C.danger} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: isWeb ? 34 : insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metaRow}>
          <View style={styles.categoryBadge}>
            <Ionicons name={article.iconName as any || "book-outline"} size={14} color={C.accent} />
            <Text style={styles.categoryText}>{article.category}</Text>
          </View>
          {article.downloadedAt ? (
            <Text style={styles.dateText}>
              Saved {formatDate(article.downloadedAt)}
            </Text>
          ) : null}
        </View>

        <Text style={styles.title}>{article.title}</Text>

        {article.summary ? (
          <Text style={styles.summary}>{article.summary}</Text>
        ) : null}

        <View style={styles.divider} />

        {article.content ? (
          <View style={styles.contentContainer}>
            {formatContent(article.content).map((paragraph, idx) => (
              <Text key={idx} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.noContent}>No content available</Text>
        )}

        <View style={styles.sourceNote}>
          <Ionicons name="globe-outline" size={14} color={C.textTertiary} />
          <Text style={styles.sourceText}>
            Content sourced from Wikipedia for offline reference
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
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.borderLight,
      backgroundColor: C.headerBackground,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
      textAlign: "center",
    },
    deleteButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 20,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 20,
      marginBottom: 12,
    },
    categoryBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: C.accentSurface,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    categoryText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: C.accent,
    },
    dateText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: C.textTertiary,
    },
    title: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: C.text,
      letterSpacing: -0.5,
      lineHeight: 34,
      marginBottom: 12,
    },
    summary: {
      fontSize: 16,
      fontFamily: "Inter_500Medium",
      color: C.textSecondary,
      lineHeight: 24,
      marginBottom: 16,
    },
    divider: {
      height: 1,
      backgroundColor: C.borderLight,
      marginBottom: 20,
    },
    contentContainer: {
      gap: 16,
    },
    paragraph: {
      fontSize: 16,
      fontFamily: "Inter_400Regular",
      color: C.text,
      lineHeight: 26,
    },
    noContent: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: C.textTertiary,
      textAlign: "center",
      marginTop: 40,
    },
    sourceNote: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 32,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: C.borderLight,
    },
    sourceText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: C.textTertiary,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      fontSize: 16,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
    },
  });
}
