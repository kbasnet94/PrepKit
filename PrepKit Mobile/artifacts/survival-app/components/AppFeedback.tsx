import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { submitAppFeedback } from "@/lib/feedback";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AppFeedback({ visible, onClose }: Props) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [starRating, setStarRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleClose() {
    setStarRating(0);
    setComment("");
    setSubmitted(false);
    onClose();
  }

  async function handleSubmit() {
    if (starRating === 0) return;
    setSubmitting(true);
    await submitAppFeedback({ starRating, comment: comment.trim() || undefined });
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(handleClose, 1500);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Rate PrepKit</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={C.textTertiary} />
            </Pressable>
          </View>

          {submitted ? (
            <View style={styles.thankYou}>
              <Ionicons name="checkmark-circle" size={44} color={C.accent} />
              <Text style={styles.thankYouText}>Thanks for your feedback!</Text>
            </View>
          ) : (
            <>
              <Text style={styles.subtitle}>How are you finding PrepKit?</Text>

              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => setStarRating(n)} hitSlop={6}>
                    <Ionicons
                      name={n <= starRating ? "star" : "star-outline"}
                      size={36}
                      color={n <= starRating ? "#D4A017" : C.textTertiary}
                    />
                  </Pressable>
                ))}
              </View>

              <TextInput
                style={styles.textInput}
                placeholder="Anything else you'd like to share? (optional)"
                placeholderTextColor={C.textTertiary}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
              />

              <Pressable
                style={[
                  styles.submitBtn,
                  (starRating === 0 || submitting) && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={starRating === 0 || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
      backgroundColor: C.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 44,
      gap: 16,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.border,
      alignSelf: "center",
      marginBottom: 4,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: C.text,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
    },
    stars: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 12,
      paddingVertical: 8,
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
      minHeight: 80,
      textAlignVertical: "top",
    },
    submitBtn: {
      backgroundColor: C.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
    },
    submitBtnDisabled: {
      opacity: 0.4,
    },
    submitBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
    thankYou: {
      alignItems: "center",
      gap: 12,
      paddingVertical: 24,
    },
    thankYouText: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
    },
  });
}
