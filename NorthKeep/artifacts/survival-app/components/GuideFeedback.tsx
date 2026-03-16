import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { submitGuideFeedback, type FeedbackRating } from "@/lib/feedback";

const THUMBS_UP_TAGS = [
  { key: "very_helpful", label: "Very helpful" },
  { key: "easy_to_follow", label: "Easy to follow" },
  { key: "great_detail", label: "Great detail" },
  { key: "accurate", label: "Accurate" },
];

const THUMBS_DOWN_TAGS = [
  { key: "incorrect_information", label: "Incorrect info" },
  { key: "not_detailed_enough", label: "Not detailed enough" },
  { key: "hard_to_follow", label: "Hard to follow" },
  { key: "missing_steps", label: "Missing steps" },
  { key: "outdated", label: "Outdated" },
];

interface Props {
  guideId: string;
  guideSlug: string;
  guideVersionId?: string;
}

export function GuideFeedback({ guideId, guideSlug, guideVersionId }: Props) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const tags = rating === "thumbs_up" ? THUMBS_UP_TAGS : THUMBS_DOWN_TAGS;

  function toggleTag(key: string) {
    setSelectedTags((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  }

  function handleRating(r: FeedbackRating) {
    if (rating !== r) {
      setRating(r);
      setSelectedTags([]);
    }
  }

  async function handleSubmit() {
    if (!rating) return;
    setSubmitting(true);
    await submitGuideFeedback({
      guideId,
      guideSlug,
      guideVersionId,
      rating,
      tags: selectedTags,
      comment: comment.trim() || undefined,
    });
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.thankYou}>
          <Ionicons name="checkmark-circle" size={22} color={C.accent} />
          <Text style={styles.thankYouText}>Thanks for your feedback!</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Was this guide helpful?</Text>

      <View style={styles.ratingRow}>
        <Pressable
          style={[styles.ratingBtn, rating === "thumbs_up" && styles.ratingBtnUp]}
          onPress={() => handleRating("thumbs_up")}
        >
          <Ionicons
            name={rating === "thumbs_up" ? "thumbs-up" : "thumbs-up-outline"}
            size={20}
            color={rating === "thumbs_up" ? C.accent : C.textSecondary}
          />
          <Text style={[styles.ratingBtnText, rating === "thumbs_up" && styles.ratingBtnTextUp]}>
            Yes
          </Text>
        </Pressable>

        <Pressable
          style={[styles.ratingBtn, rating === "thumbs_down" && styles.ratingBtnDown]}
          onPress={() => handleRating("thumbs_down")}
        >
          <Ionicons
            name={rating === "thumbs_down" ? "thumbs-down" : "thumbs-down-outline"}
            size={20}
            color={rating === "thumbs_down" ? C.danger : C.textSecondary}
          />
          <Text style={[styles.ratingBtnText, rating === "thumbs_down" && styles.ratingBtnTextDown]}>
            No
          </Text>
        </Pressable>
      </View>

      {rating ? (
        <>
          <View style={styles.tagRow}>
            {tags.map((t) => (
              <Pressable
                key={t.key}
                style={[styles.tag, selectedTags.includes(t.key) && styles.tagSelected]}
                onPress={() => toggleTag(t.key)}
              >
                <Text style={[styles.tagText, selectedTags.includes(t.key) && styles.tagTextSelected]}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.textInput}
            placeholder="Anything else? (optional)"
            placeholderTextColor={C.textTertiary}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
          />

          <Pressable
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Feedback</Text>
            )}
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    container: {
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 16,
      gap: 12,
    },
    label: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
    },
    ratingRow: {
      flexDirection: "row",
      gap: 10,
    },
    ratingBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.background,
    },
    ratingBtnUp: {
      borderColor: C.accent,
      backgroundColor: C.accentSurface,
    },
    ratingBtnDown: {
      borderColor: C.danger,
      backgroundColor: C.dangerSurface,
    },
    ratingBtnText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: C.textSecondary,
    },
    ratingBtnTextUp: {
      color: C.accent,
    },
    ratingBtnTextDown: {
      color: C.danger,
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    tag: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.background,
    },
    tagSelected: {
      borderColor: C.accent,
      backgroundColor: C.accentSurface,
    },
    tagText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: C.textSecondary,
    },
    tagTextSelected: {
      color: C.accent,
    },
    textInput: {
      backgroundColor: C.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.border,
      padding: 12,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: C.text,
      minHeight: 72,
      textAlignVertical: "top",
    },
    submitBtn: {
      backgroundColor: C.accent,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitBtnText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
    thankYou: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 4,
    },
    thankYouText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
    },
  });
}
