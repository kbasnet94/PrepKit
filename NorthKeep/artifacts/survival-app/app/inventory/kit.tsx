import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useInventory } from "@/contexts/InventoryContext";

export default function KitScreen() {
  const { addKit } = useInventory();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = async () => {
    if (!name.trim()) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addKit(name.trim(), description.trim() || undefined);
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New Kit</Text>
        <Pressable
          onPress={handleSave}
          disabled={!name.trim()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.saveText, !name.trim() && styles.saveTextDisabled]}>Save</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
      <View style={styles.content}>
        <Text style={styles.label}>KIT NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Bug Out Bag"
          placeholderTextColor={C.textTertiary}
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <Text style={styles.label}>DESCRIPTION (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="What is this kit for?"
          placeholderTextColor={C.textTertiary}
          value={description}
          onChangeText={setDescription}
        />
      </View>
      </KeyboardAvoidingView>
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
      paddingBottom: 16,
      zIndex: 1,
    },
    headerButton: {
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    cancelText: {
      fontSize: 16,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
    },
    headerTitle: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
    },
    saveText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: C.accent,
    },
    saveTextDisabled: {
      color: C.textTertiary,
    },
    content: {
      padding: 20,
    },
    label: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: C.textTertiary,
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 16,
    },
    input: {
      backgroundColor: C.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: C.text,
    },
  });
}
