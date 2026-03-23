import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView, KeyboardProvider } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useChat, ChatMessage } from "@/contexts/ChatContext";
import type { GroundedChatMeta, GroundedGuideRef } from "@/lib/chat/types";
import type { QueryMode } from "@/lib/guides/query-types";

const MODE_LABELS: Record<QueryMode, string> = {
  emergency_urgent: "Emergency",
  medical_safety: "Medical",
  practical_how_to: "How-To",
  preparedness_planning: "Preparedness",
  educational_background: "Reference",
  unclear_or_unknown: "General",
};

const MODE_COLORS: Record<QueryMode, { bg: string; text: string }> = {
  emergency_urgent: { bg: "#C0392B14", text: "#C0392B" },
  medical_safety: { bg: "#C0392B14", text: "#C0392B" },
  practical_how_to: { bg: "#2D6A4F12", text: "#2D6A4F" },
  preparedness_planning: { bg: "#3D5A8014", text: "#3D5A80" },
  educational_background: { bg: "#6B728012", text: "#5A6370" },
  unclear_or_unknown: { bg: "#88888812", text: "#666666" },
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence — browse Knowledge for more",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "#2D6A4F",
  medium: "#8E6B3E",
  low: "#C0392B",
};

function parseGroundedMeta(sources: string | undefined): GroundedChatMeta | null {
  if (!sources) return null;
  try {
    const parsed = JSON.parse(sources);
    if (parsed && parsed.version === 2) return parsed as GroundedChatMeta;
    return null;
  } catch {
    return null;
  }
}

function parseLegacySources(sources: string | undefined): Array<{ title: string; section?: string }> {
  if (!sources) return [];
  try {
    const parsed = JSON.parse(sources);
    if (!Array.isArray(parsed)) return [];
    if (parsed.length === 0) return [];
    if (typeof parsed[0] === "string") return parsed.map((s: string) => ({ title: s }));
    return parsed;
  } catch {
    return [];
  }
}

function GuideChip({
  guide,
  variant,
  C,
  styles,
}: {
  guide: GroundedGuideRef;
  variant: "matched" | "related";
  C: typeof Colors.light;
  styles: ReturnType<typeof makeStyles>;
}) {
  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/guides/[slug]", params: { slug: guide.guideSlug } });
  };
  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.guideChip,
        variant === "related" && styles.guideChipRelated,
        pressed && { opacity: 0.7 },
      ]}
      hitSlop={4}
    >
      <Ionicons
        name={variant === "matched" ? "book" : "link-outline"}
        size={10}
        color={variant === "matched" ? C.accent : C.textSecondary}
      />
      <Text
        style={[styles.guideChipText, variant === "related" && styles.guideChipTextRelated]}
        numberOfLines={1}
      >
        {guide.guideTitle}
      </Text>
    </Pressable>
  );
}

function WarningBanner({
  warnings,
  strict,
  styles,
  C,
}: {
  warnings: string[];
  strict: boolean;
  styles: ReturnType<typeof makeStyles>;
  C: typeof Colors.light;
}) {
  const primaryWarning = warnings[0];
  if (!primaryWarning) return null;

  const isStrict = strict || warnings.some(
    (w) => w.toLowerCase().includes("field use only") || w.toLowerCase().includes("emergency services")
  );

  return (
    <View style={[styles.warningBanner, isStrict ? styles.warningBannerRed : styles.warningBannerAmber]}>
      <Ionicons
        name={isStrict ? "alert-circle" : "warning-outline"}
        size={13}
        color={isStrict ? "#C0392B" : "#8E6B3E"}
      />
      <Text style={[styles.warningText, isStrict ? styles.warningTextRed : styles.warningTextAmber]}>
        {primaryWarning}
      </Text>
    </View>
  );
}

function MessageBubble({ message, C, styles }: { message: ChatMessage; C: typeof Colors.light; styles: ReturnType<typeof makeStyles> }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <View style={[styles.bubbleRow, styles.bubbleRowUser]}>
        <View style={[styles.bubble, styles.bubbleUser]}>
          <Text style={[styles.bubbleText, styles.bubbleTextUser]}>{message.content}</Text>
        </View>
      </View>
    );
  }

  const meta = parseGroundedMeta(message.sources);
  const legacySources = meta ? [] : parseLegacySources(message.sources);

  const showWarnings = meta
    ? (meta.warnings.length > 0 || meta.strictSafetyMode)
    : false;
  const modeLabel = meta ? MODE_LABELS[meta.queryMode] : null;
  const modeStyle = meta ? MODE_COLORS[meta.queryMode] : null;
  const confidenceLabel = meta ? CONFIDENCE_LABELS[meta.confidence] : null;
  const confidenceColor = meta ? CONFIDENCE_COLORS[meta.confidence] : null;

  return (
    <View style={styles.bubbleRow}>
      <View style={styles.avatarAi}>
        <Ionicons name="shield-checkmark" size={14} color={C.accent} />
      </View>
      <View style={[styles.bubble, styles.bubbleAi]}>
        {modeLabel && modeStyle ? (
          <View style={[styles.modeBadge, { backgroundColor: modeStyle.bg }]}>
            <Text style={[styles.modeBadgeText, { color: modeStyle.text }]}>{modeLabel}</Text>
          </View>
        ) : null}

        {showWarnings && meta ? (
          <WarningBanner
            warnings={meta.warnings}
            strict={meta.strictSafetyMode}
            styles={styles}
            C={C}
          />
        ) : null}

        <Text style={[styles.bubbleText, styles.bubbleTextAi]}>{message.content}</Text>

        {meta && meta.matchedGuides.length > 0 ? (
          <View style={styles.guidesSection}>
            <Text style={styles.guidesSectionLabel}>Guide</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.guidesChipRow}
            >
              {meta.matchedGuides.map((g) => (
                <GuideChip key={g.guideId} guide={g} variant="matched" C={C} styles={styles} />
              ))}
            </ScrollView>
          </View>
        ) : legacySources.length > 0 ? (
          <View style={styles.guidesSection}>
            <Text style={styles.guidesSectionLabel}>Sources</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.guidesChipRow}
            >
              {legacySources.map((s, i) => (
                <View key={i} style={styles.guideChip}>
                  <Ionicons name="book-outline" size={10} color={C.accent} />
                  <Text style={styles.guideChipText} numberOfLines={1}>
                    {s.section && s.section !== s.title ? `${s.title} › ${s.section}` : s.title}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {meta && meta.relatedGuides.length > 0 ? (
          <View style={styles.relatedSection}>
            <Text style={styles.relatedSectionLabel}>Related guides</Text>
            <View style={styles.relatedChipRow}>
              {meta.relatedGuides.map((g) => (
                <GuideChip key={g.guideId} guide={g} variant="related" C={C} styles={styles} />
              ))}
            </View>
          </View>
        ) : null}

        {meta && meta.hasSourceReviewNotice ? (
          <View style={styles.reviewNotice}>
            <Ionicons name="information-circle-outline" size={11} color={C.textTertiary} />
            <Text style={styles.reviewNoticeText}>
              Includes guidance still under source review.
            </Text>
          </View>
        ) : null}

        {meta && confidenceLabel && confidenceColor ? (
          <Text style={[styles.confidenceText, { color: confidenceColor }]}>
            {confidenceLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { currentSession, messages, isSending, selectSession, sendMessage } = useChat();
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (id) selectSession(id);
  }, [id, selectSession]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText("");
    await sendMessage(text);
    inputRef.current?.focus();
  };

  const handleExport = async () => {
    if (messages.length === 0) return;

    const sessionTitle = currentSession?.title || "NorthKeep Chat";
    const exportDate = new Date().toLocaleString();

    const lines: string[] = [
      `NorthKeep — Chat Export`,
      `Session: ${sessionTitle}`,
      `Exported: ${exportDate}`,
      `${"─".repeat(48)}`,
      "",
    ];

    for (const msg of messages) {
      const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (msg.role === "user") {
        lines.push(`[${time}] You:`);
        lines.push(msg.content);
      } else {
        lines.push(`[${time}] NorthKeep:`);
        lines.push(msg.content);
        const meta = parseGroundedMeta(msg.sources);
        if (meta?.matchedGuides?.length) {
          lines.push(`  ↳ Guide: ${meta.matchedGuides[0].guideTitle}`);
        }
        if (meta?.confidence) {
          lines.push(`  ↳ Confidence: ${meta.confidence}`);
        }
      }
      lines.push("");
    }

    lines.push(`${"─".repeat(48)}`);
    lines.push(`NorthKeep — offline-first emergency preparedness`);

    const text = lines.join("\n");
    const filename = `northkeep-chat-${Date.now()}.txt`;

    if (Platform.OS === "web") {
      try {
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        // fallback: copy to clipboard not available, silently fail
      }
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        await Share.share({ message: text, title: sessionTitle });
      } catch {
        // user dismissed or share unavailable
      }
    }
  };

  const reversedMessages = [...messages].reverse();

  return (
    <KeyboardProvider>
    <View style={[styles.container, { paddingTop: isWeb ? insets.top + 67 : insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="chevron-back" size={24} color={C.accent} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {currentSession?.title || "Chat"}
        </Text>
        <Pressable
          onPress={handleExport}
          disabled={messages.length === 0}
          style={({ pressed }) => [
            styles.exportButton,
            messages.length === 0 && styles.exportButtonDisabled,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityLabel={Platform.OS === "web" ? "Download chat" : "Share chat"}
          accessibilityRole="button"
        >
          <Ionicons
            name={Platform.OS === "web" ? "download-outline" : "share-outline"}
            size={20}
            color={messages.length === 0 ? C.textTertiary : C.accent}
          />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          ref={flatListRef}
          data={reversedMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble message={item} C={C} styles={styles} />
          )}
          inverted
          contentContainerStyle={styles.messagesList}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            isSending ? (
              <View style={styles.typingContainer}>
                <View style={styles.avatarAi}>
                  <Ionicons name="shield-checkmark" size={14} color={C.accent} />
                </View>
                <View style={styles.typingBubble}>
                  <ActivityIndicator size="small" color={C.accent} />
                  <Text style={styles.typingText}>Searching guides…</Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View style={styles.emptyChatIcon}>
                <Ionicons name="shield-checkmark" size={32} color={C.accent} />
              </View>
              <Text style={styles.emptyChatTitle}>NorthKeep Assistant</Text>
              
              <View style={styles.topBetaWarning}>
                <Ionicons name="warning" size={16} color="#C0392B" />
                <Text style={styles.topBetaWarningText}>
                  BETA DISCLAIMER: Do not rely on AI in active life-or-death emergencies. AI can hallucinate or omit critical steps. Always refer to offline Knowledge guides.
                </Text>
              </View>

              <Text style={styles.emptyChatSubtitle}>
                Ask about survival, emergencies, or first aid. Answers are grounded in the guide library — no guessing.
              </Text>
              <View style={styles.emptySuggestions}>
                {[
                  "I am overheating",
                  "How do I purify water?",
                  "I'm lost and it's getting dark",
                  "What is hypothermia?",
                ].map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.7 }]}
                    onPress={() => {
                      setInputText(suggestion);
                      inputRef.current?.focus();
                    }}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
        />

        <View style={[styles.inputContainer, { paddingBottom: isWeb ? 34 : Math.max(insets.bottom, 8) }]}>
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Ask about survival…"
              placeholderTextColor={C.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              returnKeyType="default"
              testID="chat-input"
            />
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || isSending}
              style={({ pressed }) => [
                styles.sendButton,
                (!inputText.trim() || isSending) && styles.sendButtonDisabled,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={!inputText.trim() || isSending ? C.textTertiary : "#fff"}
              />
            </Pressable>
          </View>
          <Text style={styles.groundedLabel}>
            Answers grounded in guide library
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
    </KeyboardProvider>
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
    exportButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    exportButtonDisabled: {
      opacity: 0.35,
    },
    headerTitle: {
      flex: 1,
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
      textAlign: "center",
    },
    messagesList: {
      paddingHorizontal: 14,
      paddingVertical: 16,
      gap: 12,
    },
    bubbleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      maxWidth: "95%",
    },
    bubbleRowUser: {
      alignSelf: "flex-end",
      flexDirection: "row-reverse",
    },
    avatarAi: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: C.accentSurface,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      flexShrink: 0,
    },
    bubble: {
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 10,
      maxWidth: "94%",
      gap: 8,
    },
    bubbleUser: {
      backgroundColor: C.userBubble,
      borderBottomRightRadius: 6,
    },
    bubbleAi: {
      backgroundColor: C.aiBubble,
      borderBottomLeftRadius: 6,
    },
    bubbleText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      lineHeight: 22,
    },
    bubbleTextUser: {
      color: C.userBubbleText,
    },
    bubbleTextAi: {
      color: C.aiBubbleText,
    },
    modeBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    modeBadgeText: {
      fontSize: 10,
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    warningBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
      borderRadius: 8,
      padding: 8,
    },
    warningBannerRed: {
      backgroundColor: "#C0392B10",
    },
    warningBannerAmber: {
      backgroundColor: "#8E6B3E0C",
    },
    warningText: {
      flex: 1,
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      lineHeight: 17,
    },
    warningTextRed: {
      color: "#C0392B",
    },
    warningTextAmber: {
      color: "#8E6B3E",
    },
    guidesSection: {
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: C.borderLight,
      gap: 5,
    },
    guidesSectionLabel: {
      fontSize: 9,
      fontFamily: "Inter_700Bold",
      color: C.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    guidesChipRow: {
      flexDirection: "row",
      gap: 6,
    },
    guideChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: C.accentSurface,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 20,
      maxWidth: 240,
    },
    guideChipRelated: {
      backgroundColor: C.surfaceSecondary,
    },
    guideChipText: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: C.accent,
      flexShrink: 1,
    },
    guideChipTextRelated: {
      color: C.textSecondary,
    },
    relatedSection: {
      paddingTop: 6,
      gap: 5,
    },
    relatedSectionLabel: {
      fontSize: 9,
      fontFamily: "Inter_700Bold",
      color: C.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    relatedChipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 5,
    },
    reviewNotice: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingTop: 4,
    },
    reviewNoticeText: {
      fontSize: 10,
      fontFamily: "Inter_400Regular",
      color: C.textTertiary,
      fontStyle: "italic",
    },
    confidenceText: {
      fontSize: 10,
      fontFamily: "Inter_500Medium",
    },
    typingContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    typingBubble: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: C.aiBubble,
      borderRadius: 18,
      borderBottomLeftRadius: 6,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    typingText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: C.textSecondary,
    },
    emptyChat: {
      alignItems: "center",
      padding: 32,
      transform: [{ scaleY: -1 }],
    },
    emptyChatIcon: {
      width: 60,
      height: 60,
      borderRadius: 16,
      backgroundColor: C.accentSurface,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    emptyChatTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: C.text,
      marginBottom: 6,
    },
    emptyChatSubtitle: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 20,
    },
    topBetaWarning: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
      backgroundColor: "#C0392B12",
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "#C0392B30",
      marginBottom: 16,
      width: "100%",
    },
    topBetaWarningText: {
      flex: 1,
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: "#C0392B",
      lineHeight: 18,
    },
    emptySuggestions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "center",
    },
    suggestion: {
      backgroundColor: C.surface,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    suggestionText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: C.accent,
    },
    inputContainer: {
      paddingHorizontal: 14,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: C.borderLight,
      backgroundColor: C.headerBackground,
      gap: 4,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
    },
    textInput: {
      flex: 1,
      minHeight: 40,
      maxHeight: 120,
      backgroundColor: C.surface,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: C.text,
    },
    sendButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: C.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    sendButtonDisabled: {
      backgroundColor: C.surfaceSecondary,
    },
    groundedLabel: {
      fontSize: 10,
      fontFamily: "Inter_400Regular",
      color: C.textTertiary,
      textAlign: "center",
    },
  });
}
