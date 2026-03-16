import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import Colors from "@/constants/colors";
import { buildGuideGroundingContext } from "@/lib/guides/grounding-context";
import type { GroundingContext } from "@/lib/guides/query-types";

const MODE_COLORS: Record<string, string> = {
  emergency_urgent: "#C0392B",
  medical_safety: "#8B3A8B",
  practical_how_to: Colors.light.accent,
  preparedness_planning: "#1A6B8A",
  educational_background: "#8E6B3E",
  unclear_or_unknown: Colors.light.textTertiary,
};

const MODE_LABELS: Record<string, string> = {
  emergency_urgent: "Emergency / Urgent",
  medical_safety: "Medical Safety",
  practical_how_to: "Practical How-To",
  preparedness_planning: "Preparedness / Planning",
  educational_background: "Educational / Background",
  unclear_or_unknown: "Unclear",
};

const RISK_COLORS: Record<string, string> = {
  low: Colors.light.accent,
  medium: "#8E6B3E",
  high: "#C0392B",
};

const CONF_COLORS: Record<string, string> = {
  high: Colors.light.accent,
  medium: "#8E6B3E",
  low: Colors.light.textTertiary,
};

const EXAMPLE_QUERIES = [
  "how do I start a fire without matches",
  "I need to stitch my leg right now",
  "what causes earthquakes",
  "what should I pack for an earthquake",
  "there is a flood happening right now",
  "how do I purify water by boiling",
  "my wound has red streaks around it",
  "how to build a tarp shelter",
  "what is the best emergency kit",
  "tell me about hypothermia",
];

function Chip({
  label,
  color,
  small,
}: {
  label: string;
  color: string;
  small?: boolean;
}) {
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: color + "18" },
        small && styles.chipSmall,
      ]}
    >
      <Text style={[styles.chipText, { color }, small && styles.chipTextSmall]}>
        {label}
      </Text>
    </View>
  );
}

function ResultCard({ ctx }: { ctx: GroundingContext }) {
  const { interpretation: i, topGuides, warnings } = ctx;

  return (
    <Animated.View entering={FadeInDown.duration(280)} style={styles.resultCard}>
      <View style={styles.resultSection}>
        <Text style={styles.resultSectionLabel}>Intent</Text>
        <View style={styles.chipRow}>
          <Chip
            label={MODE_LABELS[i.primaryIntent] ?? i.primaryIntent}
            color={MODE_COLORS[i.primaryIntent] ?? Colors.light.textTertiary}
          />
          {i.secondaryIntents.slice(0, 2).map((s) => (
            <Chip
              key={s}
              label={MODE_LABELS[s] ?? s}
              color={MODE_COLORS[s] ?? Colors.light.textTertiary}
              small
            />
          ))}
        </View>
      </View>

      <View style={styles.resultSection}>
        <Text style={styles.resultSectionLabel}>Assessment</Text>
        <View style={styles.chipRow}>
          <Chip label={`Risk: ${i.riskLevel}`} color={RISK_COLORS[i.riskLevel]} small />
          <Chip label={`Urgency: ${i.urgencyLevel}`} color={RISK_COLORS[i.urgencyLevel]} small />
          <Chip label={`Confidence: ${i.confidence}`} color={CONF_COLORS[i.confidence]} small />
        </View>
      </View>

      <View style={styles.resultSection}>
        <Text style={styles.resultSectionLabel}>Answer style</Text>
        <Text style={styles.resultBodyText}>{i.answerStyle.replace(/_/g, " ")}</Text>
      </View>

      {i.shouldUseStrictSafetyMode ? (
        <View style={styles.safetyBanner}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#8B3A8B" />
          <Text style={styles.safetyBannerText}>Strict safety mode active</Text>
        </View>
      ) : (
        <View style={[styles.safetyBanner, styles.safetyBannerOff]}>
          <Ionicons name="shield-outline" size={14} color={Colors.light.textTertiary} />
          <Text style={[styles.safetyBannerText, { color: Colors.light.textTertiary }]}>
            Standard mode
          </Text>
        </View>
      )}

      {i.detectedKeywords.length > 0 ? (
        <View style={styles.resultSection}>
          <Text style={styles.resultSectionLabel}>Detected keywords</Text>
          <View style={styles.chipRow}>
            {i.detectedKeywords.map((kw) => (
              <Chip key={kw} label={kw} color={Colors.light.textSecondary} small />
            ))}
          </View>
        </View>
      ) : null}

      {topGuides.length > 0 ? (
        <View style={styles.resultSection}>
          <Text style={styles.resultSectionLabel}>Top guide matches</Text>
          {topGuides.map((m, idx) => (
            <View key={m.guide.id} style={styles.matchRow}>
              <View style={styles.matchScore}>
                <Text style={styles.matchScoreText}>{m.score}</Text>
              </View>
              <View style={styles.matchBody}>
                <Text style={styles.matchTitle}>{m.guide.title}</Text>
                <Text style={styles.matchCategory}>
                  {m.guide.category} · {m.guide.cardType}
                </Text>
                {m.matchReasons.length > 0 ? (
                  <Text style={styles.matchReasons} numberOfLines={2}>
                    {m.matchReasons.slice(0, 3).join("  ·  ")}
                  </Text>
                ) : null}
              </View>
              <View
                style={[
                  styles.riskDot,
                  { backgroundColor: RISK_COLORS[m.guide.riskLevel] },
                ]}
              />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.noMatchBanner}>
          <Ionicons name="search-outline" size={16} color={Colors.light.textTertiary} />
          <Text style={styles.noMatchText}>No guides matched with sufficient confidence</Text>
        </View>
      )}

      {warnings.length > 0 ? (
        <View style={styles.resultSection}>
          <Text style={styles.resultSectionLabel}>Warnings</Text>
          {warnings.map((w, idx) => (
            <View key={idx} style={styles.warningRow}>
              <Ionicons name="warning-outline" size={13} color="#C0392B" style={{ marginTop: 2 }} />
              <Text style={styles.warningText}>{w}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

export default function QueryTestScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<GroundingContext | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const analyze = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    setIsRunning(true);
    setResult(null);
    setTimeout(() => {
      const ctx = buildGuideGroundingContext(q);
      setResult(ctx);
      setIsRunning(false);
    }, 120);
  }, [query]);

  const tryExample = (example: string) => {
    setQuery(example);
    setResult(null);
    setTimeout(() => {
      const ctx = buildGuideGroundingContext(example);
      setResult(ctx);
    }, 80);
  };

  return (
    <View style={[styles.container, { paddingTop: isWeb ? insets.top + 67 : insets.top }]}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.navTitles}>
          <Text style={styles.navTitle}>Query Tester</Text>
          <Text style={styles.navSub}>Phase 2 · Guide matching debug</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isWeb ? 34 + 84 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputBlock}>
          <TextInput
            style={styles.queryInput}
            placeholder="Type any question…"
            placeholderTextColor={Colors.light.textTertiary}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              setResult(null);
            }}
            onSubmitEditing={analyze}
            returnKeyType="search"
            multiline={false}
            autoCorrect={false}
          />
          <Pressable
            style={({ pressed }) => [
              styles.analyzeButton,
              pressed && styles.analyzeButtonPressed,
              !query.trim() && styles.analyzeButtonDisabled,
            ]}
            onPress={analyze}
            disabled={!query.trim()}
          >
            {isRunning ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.analyzeButtonText}>Analyze</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.examplesSection}>
          <Text style={styles.examplesLabel}>Try an example</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.examplesScroll}>
            {EXAMPLE_QUERIES.map((ex) => (
              <Pressable
                key={ex}
                style={({ pressed }) => [styles.exampleChip, pressed && { opacity: 0.7 }]}
                onPress={() => tryExample(ex)}
              >
                <Text style={styles.exampleChipText}>{ex}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {result ? <ResultCard ctx={result} /> : null}

        {!result && !isRunning ? (
          <View style={styles.emptyState}>
            <Ionicons name="flask-outline" size={44} color={Colors.light.textTertiary} />
            <Text style={styles.emptyTitle}>Enter a query to test</Text>
            <Text style={styles.emptySubtitle}>
              See how the guide-matching engine interprets questions and ranks guides
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.accentSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitles: { flex: 1 },
  navTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  navSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textTertiary,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 16, paddingTop: 4 },

  inputBlock: { gap: 8 },
  queryInput: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
  },
  analyzeButton: {
    backgroundColor: Colors.light.accent,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  analyzeButtonPressed: { opacity: 0.8 },
  analyzeButtonDisabled: { opacity: 0.4 },
  analyzeButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },

  examplesSection: { gap: 8 },
  examplesLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  examplesScroll: { flexGrow: 0 },
  exampleChip: {
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  exampleChipText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },

  resultCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  resultSection: { gap: 8 },
  resultSectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  resultBodyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
    textTransform: "capitalize",
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  chipSmall: { paddingHorizontal: 8, paddingVertical: 3 },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  chipTextSmall: { fontSize: 11 },

  safetyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#8B3A8B12",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  safetyBannerOff: { backgroundColor: Colors.light.surfaceSecondary },
  safetyBannerText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#8B3A8B",
  },

  matchRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
  },
  matchScore: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.light.accentSurface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  matchScoreText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.light.accent,
  },
  matchBody: { flex: 1 },
  matchTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  matchCategory: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textTertiary,
    marginTop: 2,
  },
  matchReasons: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 3,
    fontStyle: "italic",
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    flexShrink: 0,
  },

  noMatchBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: Colors.light.surfaceSecondary,
    borderRadius: 10,
  },
  noMatchText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textTertiary,
  },

  warningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#C0392B",
    lineHeight: 19,
  },

  emptyState: {
    alignItems: "center",
    paddingTop: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 280,
  },
});
