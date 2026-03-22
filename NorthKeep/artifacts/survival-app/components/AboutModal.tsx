import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AboutModal({ visible, onClose }: Props) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View />
      </Pressable>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>About NorthKeep</Text>
          <Pressable onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color={C.textSecondary} />
          </Pressable>
        </View>
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.paragraph}>
            I built NorthKeep because I wanted one place where I could find clear, trusted survival
            guidance — even with no signal, no Wi-Fi, nothing.
          </Text>
          <Text style={styles.paragraph}>
            No ads, no subscriptions, no data collection. Just the knowledge you need, when you need
            it most.
          </Text>
          <Text style={styles.paragraph}>
            I hope it helps you and the people you care about stay safe.
          </Text>
          <Text style={styles.signature}>— Karan</Text>
          <Text style={styles.version}>Version 1.0.0 Beta</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
      backgroundColor: C.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 40,
      maxHeight: "60%",
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.borderLight,
      alignSelf: "center",
      marginTop: 10,
      marginBottom: 8,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    title: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
    },
    body: {
      paddingHorizontal: 20,
    },
    paragraph: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
      lineHeight: 24,
      marginBottom: 16,
    },
    signature: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
      marginBottom: 20,
    },
    version: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textTertiary,
      textAlign: "center",
      marginTop: 8,
    },
  });
}
