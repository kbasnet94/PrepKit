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
import { buildAIEnhancedAnswer } from "@/lib/ai/ai-answer-builder";
import type { AIEnhancedAnswer } from "@/lib/ai/types";
import type { StructuredAnswer, StructuredAnswerSection } from "@/lib/guides/response-types";
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

const TEMPLATE_LABELS: Record<string, string> = {
  practical: "Practical",
  medical: "Medical Safety",
  preparedness: "Preparedness",
  educational: "Educational",
  cautious: "Cautious",
};

const CONF_COLORS: Record<string, string> = {
  high: Colors.light.accent,
  medium: "#8E6B3E",
  low: Colors.light.textTertiary,
};

const EXAMPLES = [
  "how do I start a fire without matches",
  "I need to stitch my leg",
  "what causes earthquakes",
  "what should I pack for an earthquake",
  "there is a flood happening right now",
  "how do I purify water by boiling",
  "my wound has red streaks around it",
  "how to build a tarp shelter",
  "what is the best emergency kit",
];

type ViewTab = "structured" | "ai";

function Chip({ label, color, small }: { label: string; color: string; small?: boolean }) {
  return (
    <View style={[styles.chip, { backgroundColor: color + "18" }, small && styles.chipSm]}>
      <Text style={[styles.chipText, { color }, small && styles.chipTextSm]}>{label}</Text>
    </View>
  );
}

function SectionCard({ section }: { section: StructuredAnswerSection }) {
  const isWarning = section.emphasis === "warning";
  const isImportant = section.emphasis === "important";
  const accentColor = isWarning ? "#C0392B" : isImportant ? Colors.light.accent : Colors.light.textTertiary;

  return (
    <View style={[styles.sectionCard, isWarning && styles.sectionCardWarning, isImportant && styles.sectionCardImportant]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionDot, { backgroundColor: accentColor }]} />
        <Text style={[styles.sectionLabel, { color: accentColor }]}>{section.label}</Text>
      </View>
      {typeof section.content === "string" ? (
        <Text style={styles.sectionText}>{section.content}</Text>
      ) : (
        <View style={styles.listContainer}>
          {section.content.map((item, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={[styles.listBullet, { color: accentColor }]}>
                {section.id === "steps" ? `${i + 1}.` : "•"}
              </Text>
              <Text style={styles.listItemText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function AnswerMetaRow({ answer }: { answer: StructuredAnswer }) {
  return (
    <View style={styles.answerMeta}>
      <View style={styles.chipRow}>
        <Chip label={MODE_LABELS[answer.mode] ?? answer.mode} color={MODE_COLORS[answer.mode] ?? Colors.light.textTertiary} />
        <Chip label={`${TEMPLATE_LABELS[answer.templateType] ?? answer.templateType} template`} color={Colors.light.textSecondary} small />
        <Chip label={`${answer.confidence} confidence`} color={CONF_COLORS[answer.confidence]} small />
      </View>
      {answer.strictSafetyMode ? (
        <View style={styles.safetyBadge}>
          <Ionicons name="shield-checkmark-outline" size={13} color="#8B3A8B" />
          <Text style={styles.safetyBadgeText}>Strict safety mode</Text>
        </View>
      ) : null}
    </View>
  );
}

function SourcesBlock({ answer }: { answer: StructuredAnswer }) {
  if (answer.sources.length === 0) return null;
  return (
    <View style={styles.sourcesBlock}>
      <Text style={styles.sourcesLabel}>Sources</Text>
      {answer.sources.map((src, i) => (
        <View key={src.guideId} style={styles.sourceRow}>
          <View style={styles.sourceIndex}>
            <Text style={styles.sourceIndexText}>{i + 1}</Text>
          </View>
          <View style={styles.sourceBody}>
            <Text style={styles.sourceTitle}>{src.guideTitle}</Text>
            {src.sectionHints && src.sectionHints.length > 0 ? (
              <Text style={styles.sourceHints} numberOfLines={1}>{src.sectionHints.join("  ·  ")}</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function StructuredView({ enhanced }: { enhanced: AIEnhancedAnswer }) {
  const answer = enhanced.structuredAnswer;
  return (
    <View style={styles.answerCard}>
      <AnswerMetaRow answer={answer} />
      <Text style={styles.answerTitle}>{answer.title}</Text>
      {answer.sections.map((section) => (
        <SectionCard key={section.id} section={section} />
      ))}
      {answer.warnings.some((w) => w.includes("field use only") || w.includes("field-use only")) ? (
        <View style={styles.globalWarning}>
          <Ionicons name="medical-outline" size={14} color="#8B3A8B" />
          <Text style={styles.globalWarningText}>
            {answer.warnings.find((w) => w.includes("field use only") || w.includes("field-use only"))}
          </Text>
        </View>
      ) : null}
      <SourcesBlock answer={answer} />
    </View>
  );
}

function AIView({ enhanced }: { enhanced: AIEnhancedAnswer }) {
  const answer = enhanced.structuredAnswer;
  return (
    <View style={styles.answerCard}>
      <AnswerMetaRow answer={answer} />

      <View style={styles.aiBadgeRow}>
        {enhanced.usedAI ? (
          <View style={[styles.aiBadge, styles.aiBadgeActive]}>
            <Ionicons name="sparkles" size={12} color={Colors.light.accent} />
            <Text style={[styles.aiBadgeText, { color: Colors.light.accent }]}>Mock AI used</Text>
          </View>
        ) : (
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles-outline" size={12} color={Colors.light.textTertiary} />
            <Text style={styles.aiBadgeText}>Deterministic fallback</Text>
          </View>
        )}
        {enhanced.fallbackReason ? (
          <Text style={styles.fallbackReason}>{enhanced.fallbackReason}</Text>
        ) : null}
      </View>

      <Text style={styles.answerTitle}>{answer.title}</Text>

      <View style={styles.rewrittenBlock}>
        <Text style={styles.rewrittenText}>{enhanced.rewrittenText}</Text>
      </View>

      {enhanced.strictSafetyMode ? (
        <View style={styles.globalWarning}>
          <Ionicons name="medical-outline" size={14} color="#8B3A8B" />
          <Text style={styles.globalWarningText}>
            Field use only. Seek professional medical help as soon as possible.
          </Text>
        </View>
      ) : null}

      <SourcesBlock answer={answer} />
    </View>
  );
}

function MatchesRow({ ctx }: { ctx: GroundingContext }) {
  if (ctx.topGuides.length === 0) return null;
  return (
    <View style={styles.matchesBlock}>
      <Text style={styles.matchesLabel}>Top guide matches</Text>
      {ctx.topGuides.slice(0, 3).map((m) => (
        <View key={m.guide.id} style={styles.matchRow}>
          <View style={styles.matchScore}>
            <Text style={styles.matchScoreText}>{m.score}</Text>
          </View>
          <View style={styles.matchInfo}>
            <Text style={styles.matchTitle}>{m.guide.title}</Text>
            <Text style={styles.matchMeta}>{m.guide.category} · {m.guide.cardType}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function TabSelector({ active, onChange }: { active: ViewTab; onChange: (t: ViewTab) => void }) {
  return (
    <View style={styles.tabSelector}>
      {(["structured", "ai"] as ViewTab[]).map((tab) => (
        <Pressable
          key={tab}
          style={[styles.tabItem, active === tab && styles.tabItemActive]}
          onPress={() => onChange(tab)}
        >
          {tab === "ai" ? (
            <Ionicons
              name={active === tab ? "sparkles" : "sparkles-outline"}
              size={13}
              color={active === tab ? Colors.light.accent : Colors.light.textTertiary}
              style={{ marginRight: 4 }}
            />
          ) : (
            <Ionicons
              name="list-outline"
              size={13}
              color={active === tab ? Colors.light.accent : Colors.light.textTertiary}
              style={{ marginRight: 4 }}
            />
          )}
          <Text style={[styles.tabItemText, active === tab && styles.tabItemTextActive]}>
            {tab === "structured" ? "Structured" : "AI Enhanced"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function GuideAnswerTesterScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ enhanced: AIEnhancedAnswer; ctx: GroundingContext } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>("structured");

  const analyze = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setIsRunning(true);
    setResult(null);
    try {
      const ctx = buildGuideGroundingContext(trimmed);
      const enhanced = await buildAIEnhancedAnswer(trimmed, "assistive");
      setResult({ enhanced, ctx });
    } finally {
      setIsRunning(false);
    }
  }, []);

  const handleSubmit = () => analyze(query);

  const tryExample = (ex: string) => {
    setQuery(ex);
    analyze(ex);
  };

  return (
    <View style={[styles.container, { paddingTop: isWeb ? insets.top + 67 : insets.top }]}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.accent} />
        </Pressable>
        <View style={styles.navTitles}>
          <Text style={styles.navTitle}>Answer Tester</Text>
          <Text style={styles.navSub}>Phase 4 · Structured + AI enhanced</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: isWeb ? 34 + 84 : 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputBlock}>
          <TextInput
            style={styles.queryInput}
            placeholder="Type any question…"
            placeholderTextColor={Colors.light.textTertiary}
            value={query}
            onChangeText={(t) => { setQuery(t); setResult(null); }}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            multiline={false}
            autoCorrect={false}
          />
          <Pressable
            style={({ pressed }) => [styles.analyzeButton, pressed && { opacity: 0.8 }, !query.trim() && styles.analyzeButtonDisabled]}
            onPress={handleSubmit}
            disabled={!query.trim() || isRunning}
          >
            {isRunning ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.analyzeButtonText}>Build Answer</Text>
            )}
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.examplesScroll}>
          {EXAMPLES.map((ex) => (
            <Pressable
              key={ex}
              style={({ pressed }) => [styles.exampleChip, pressed && { opacity: 0.7 }]}
              onPress={() => tryExample(ex)}
            >
              <Text style={styles.exampleChipText}>{ex}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {result ? (
          <Animated.View entering={FadeInDown.duration(240)} style={{ gap: 12 }}>
            <MatchesRow ctx={result.ctx} />
            <TabSelector active={activeTab} onChange={setActiveTab} />
            {activeTab === "structured" ? (
              <StructuredView enhanced={result.enhanced} />
            ) : (
              <AIView enhanced={result.enhanced} />
            )}
          </Animated.View>
        ) : !isRunning ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={44} color={Colors.light.textTertiary} />
            <Text style={styles.emptyTitle}>Enter a query to generate an answer</Text>
            <Text style={styles.emptySubtitle}>
              Compare the structured guide-based answer with the AI-enhanced prose version
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  navBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 10, gap: 12 },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.accentSurface, alignItems: "center", justifyContent: "center" },
  navTitles: { flex: 1 },
  navTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text, letterSpacing: -0.3 },
  navSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textTertiary },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 14, paddingTop: 4 },

  inputBlock: { gap: 8 },
  queryInput: { backgroundColor: Colors.light.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.light.text },
  analyzeButton: { backgroundColor: Colors.light.accent, borderRadius: 12, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  analyzeButtonDisabled: { opacity: 0.4 },
  analyzeButtonText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },

  examplesScroll: { flexGrow: 0 },
  exampleChip: { backgroundColor: Colors.light.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8 },
  exampleChipText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },

  tabSelector: { flexDirection: "row", backgroundColor: Colors.light.surface, borderRadius: 12, padding: 4, gap: 2 },
  tabItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 9, borderRadius: 9 },
  tabItemActive: { backgroundColor: Colors.light.background },
  tabItemText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.textTertiary },
  tabItemTextActive: { color: Colors.light.accent },

  matchesBlock: { backgroundColor: Colors.light.surface, borderRadius: 14, padding: 14, gap: 8 },
  matchesLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.light.textTertiary, textTransform: "uppercase", letterSpacing: 0.6 },
  matchRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  matchScore: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.light.accentSurface, alignItems: "center", justifyContent: "center" },
  matchScoreText: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.light.accent },
  matchInfo: { flex: 1 },
  matchTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  matchMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textTertiary, marginTop: 1 },

  answerCard: { backgroundColor: Colors.light.surface, borderRadius: 16, padding: 16, gap: 12 },
  answerMeta: { gap: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  chipSm: { paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  chipTextSm: { fontSize: 11 },

  safetyBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#8B3A8B12", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" },
  safetyBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#8B3A8B" },

  aiBadgeRow: { gap: 4 },
  aiBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: Colors.light.surfaceSecondary, alignSelf: "flex-start" },
  aiBadgeActive: { backgroundColor: Colors.light.accentSurface },
  aiBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.light.textTertiary },
  fallbackReason: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textTertiary, fontStyle: "italic" },

  answerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.text, letterSpacing: -0.3 },

  sectionCard: { borderRadius: 10, padding: 12, backgroundColor: Colors.light.surfaceSecondary, gap: 6 },
  sectionCardWarning: { backgroundColor: "#C0392B08", borderWidth: 1, borderColor: "#C0392B20" },
  sectionCardImportant: { backgroundColor: Colors.light.accentSurface, borderWidth: 1, borderColor: Colors.light.accent + "30" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.6 },
  sectionText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.text, lineHeight: 20 },
  listContainer: { gap: 5 },
  listItem: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  listBullet: { fontSize: 13, fontFamily: "Inter_600SemiBold", width: 18, flexShrink: 0, marginTop: 2 },
  listItemText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.text, lineHeight: 20 },

  rewrittenBlock: { backgroundColor: Colors.light.surfaceSecondary, borderRadius: 10, padding: 14 },
  rewrittenText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.text, lineHeight: 22 },

  globalWarning: { flexDirection: "row", alignItems: "flex-start", gap: 7, backgroundColor: "#8B3A8B10", borderRadius: 10, padding: 11 },
  globalWarningText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#8B3A8B", lineHeight: 17, fontStyle: "italic" },

  sourcesBlock: { gap: 6, paddingTop: 4 },
  sourcesLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.light.textTertiary, textTransform: "uppercase", letterSpacing: 0.6 },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5, borderTopWidth: 1, borderTopColor: Colors.light.borderLight },
  sourceIndex: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.light.accentSurface, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sourceIndexText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.light.accent },
  sourceBody: { flex: 1 },
  sourceTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  sourceHints: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textTertiary, fontStyle: "italic", marginTop: 1 },

  emptyState: { alignItems: "center", paddingTop: 40, gap: 8 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.light.text, marginTop: 8, textAlign: "center" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center", lineHeight: 19, maxWidth: 290 },
});
