import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useChat } from "@/contexts/ChatContext";

export default function ChatListScreen() {
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const { sessions, loadSessions, createSession, deleteSession, aiCapability } = useChat();
  const isWeb = Platform.OS === "web";

  const styles = useMemo(() => makeStyles(C), [C]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleNewChat = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const id = await createSession();
    router.push({ pathname: "/chat/[id]", params: { id } });
  };

  const handleSelectChat = (id: string) => {
    router.push({ pathname: "/chat/[id]", params: { id } });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const renderSession = ({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <Pressable
        style={({ pressed }) => [styles.sessionCard, pressed && styles.sessionCardPressed]}
        onPress={() => handleSelectChat(item.id)}
        onLongPress={async () => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          await deleteSession(item.id);
        }}
      >
        <View style={styles.sessionIcon}>
          <Ionicons name="chatbubble" size={18} color={C.accent} />
        </View>
        <View style={styles.sessionContent}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.sessionTime}>{formatTime(item.updatedAt)}</Text>
          </View>
          {item.lastMessage ? (
            <Text style={styles.sessionPreview} numberOfLines={2}>
              {item.lastMessage}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { paddingTop: isWeb ? insets.top + 67 : insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
        <Pressable
          onPress={handleNewChat}
          style={({ pressed }) => [styles.newChatButton, pressed && { opacity: 0.7 }]}
          testID="new-chat-button"
        >
          <Ionicons name="create-outline" size={24} color={C.accent} />
        </Pressable>
      </View>

      {aiCapability && aiCapability.method === "fallback" ? (
        <View style={styles.aiBanner}>
          <Ionicons name="information-circle-outline" size={18} color={C.warning} />
          <Text style={styles.aiBannerText}>
            {aiCapability.message}
          </Text>
        </View>
      ) : null}

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={renderSession}
        contentContainerStyle={[
          styles.listContent,
          sessions.length === 0 && styles.emptyList,
          { paddingBottom: isWeb ? 34 + 84 : 100 },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={48} color={C.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Conversations</Text>
            <Text style={styles.emptySubtitle}>
              Start a conversation to get survival tips and advice
            </Text>
            <Pressable
              onPress={handleNewChat}
              style={({ pressed }) => [styles.emptyButton, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>New Chat</Text>
            </Pressable>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
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
    newChatButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    aiBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 20,
      marginBottom: 8,
      padding: 12,
      backgroundColor: C.warningSurface,
      borderRadius: 12,
    },
    aiBannerText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
      lineHeight: 18,
    },
    listContent: {
      paddingHorizontal: 20,
      gap: 2,
    },
    emptyList: {
      flex: 1,
    },
    sessionCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      backgroundColor: C.surface,
      borderRadius: 14,
      marginBottom: 8,
      gap: 12,
    },
    sessionCardPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.98 }],
    },
    sessionIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: C.accentSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    sessionContent: {
      flex: 1,
      gap: 4,
    },
    sessionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sessionTitle: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
      marginRight: 8,
    },
    sessionTime: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: C.textTertiary,
    },
    sessionPreview: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
      lineHeight: 18,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
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
