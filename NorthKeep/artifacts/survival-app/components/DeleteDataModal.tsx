import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { getDeviceId } from "@/lib/device-id";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function DeleteDataModal({ visible, onClose }: Props) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const handleConfirm = async () => {
    const deviceId = await getDeviceId();
    const subject = encodeURIComponent("Data Deletion Request");
    const body = encodeURIComponent(
      `Hi NorthKeep Support,\n\nI would like to request deletion of any data associated with my device.\n\nDevice ID: ${deviceId}\n\nThank you.`
    );
    Linking.openURL(
      `mailto:kb@support.northkeep.app?subject=${subject}&body=${body}`
    );
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View />
      </Pressable>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Delete My Data</Text>
          <Pressable onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color={C.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.body}>
          <Text style={styles.paragraph}>
            This will send a request to delete any data associated with your device from our servers.
          </Text>
          <Text style={styles.paragraph}>
            Local data on your device (saved guides, inventory, preferences) will not be affected.
          </Text>
          <Text style={styles.hint}>
            An email will be prepared for you to review and send.
          </Text>
          <View style={styles.buttons}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Continue</Text>
            </Pressable>
          </View>
        </View>
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
      marginBottom: 12,
    },
    hint: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textTertiary,
      lineHeight: 20,
      marginBottom: 24,
    },
    buttons: {
      flexDirection: "row",
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: C.surface,
      alignItems: "center",
      borderWidth: 1,
      borderColor: C.border,
    },
    cancelText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
    },
    confirmButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: C.danger,
      alignItems: "center",
    },
    confirmText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
  });
}
