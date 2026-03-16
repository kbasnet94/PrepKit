import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { submitRequest } from "@/lib/guide-requests";

interface Props {
  initialTopic?: string;
  onSuccess: () => void;
}

export function GuideRequestForm({ initialTopic = "", onSuccess }: Props) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [topic, setTopic] = useState(initialTopic);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!topic.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitRequest(topic.trim(), description.trim() || undefined);
      setSubmitted(true);
      setTimeout(onSuccess, 1200);
    } catch {
      setError("Couldn't submit. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={28} color={C.accent} />
        </View>
        <Text style={styles.successTitle}>Request submitted!</Text>
        <Text style={styles.successSub}>
          The team will review it. Others can upvote to help prioritize.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.body}>
        <View style={styles.field}>
          <Text style={styles.label}>Topic *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. How to treat a snake bite"
            placeholderTextColor={C.textTertiary}
            value={topic}
            onChangeText={setTopic}
            returnKeyType="next"
            maxLength={120}
          />
          <Text style={styles.charCount}>{topic.length}/120</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>More detail (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What situation is this for? Any specific scenario?"
            placeholderTextColor={C.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={300}
            textAlignVertical="top"
          />
        </View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={!topic.trim() || submitting}
          style={({ pressed }) => [
            styles.submitBtn,
            (!topic.trim() || submitting) && styles.submitBtnDisabled,
            pressed && topic.trim() && !submitting && { opacity: 0.8 },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Request</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    centered: {
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingHorizontal: 32,
    },
    body: {
      flex: 1,
      padding: 20,
      gap: 20,
    },
    field: {
      gap: 6,
    },
    label: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: C.textSecondary,
      letterSpacing: 0.2,
    },
    input: {
      backgroundColor: C.surface,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: C.text,
      borderWidth: 1,
      borderColor: C.border,
    },
    textArea: {
      minHeight: 80,
      paddingTop: 10,
    },
    charCount: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: C.textTertiary,
      textAlign: "right",
    },
    errorText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.danger,
    },
    submitBtn: {
      backgroundColor: C.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    submitBtnDisabled: {
      opacity: 0.4,
    },
    submitBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
    successIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: C.accentSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    successTitle: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: C.text,
    },
    successSub: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
  });
}
