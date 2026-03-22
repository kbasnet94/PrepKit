import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState, useEffect } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import {
  useInventory,
  CATEGORIES,
  CONDITIONS,
  ItemCategory,
  ItemCondition,
  ItemStatus,
} from "@/contexts/InventoryContext";

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, kits, updateItem, deleteItem, markAsPurchased } = useInventory();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const item = items.find((i) => i.id === id);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<ItemCategory>("Tools");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [condition, setCondition] = useState<ItemCondition>("Good");
  const [expiryDate, setExpiryDate] = useState("");
  const [kitId, setKitId] = useState<string | null>(null);
  const [status, setStatus] = useState<ItemStatus>("owned");

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategory(item.category);
      setQuantity(item.quantity.toString());
      setUnit(item.unit || "");
      setNotes(item.notes || "");
      setCondition(item.condition);
      setExpiryDate(item.expiryDate ? new Date(item.expiryDate).toISOString().split("T")[0] : "");
      setKitId(item.kitId);
      setStatus(item.status || "owned");
    }
  }, [item]);

  if (!item) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.cancelText}>Close</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Not Found</Text>
          <View style={{ width: 50 }} />
        </View>
      </View>
    );
  }

  const handleSave = async () => {
    if (!name.trim()) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    let expiry: number | null = null;
    if (expiryDate.trim()) {
      const parsed = Date.parse(expiryDate.trim());
      if (!isNaN(parsed)) expiry = parsed;
    }

    await updateItem(id!, {
      name: name.trim(),
      category,
      quantity: parseFloat(quantity) || 1,
      unit: unit.trim() || null,
      notes: notes.trim() || null,
      condition,
      expiryDate: expiry,
      kitId,
      status,
    });
    router.back();
  };

  const handleDelete = () => {
    if (Platform.OS === "web") {
      deleteItem(id!);
      router.back();
      return;
    }
    Alert.alert("Delete Item", `Remove "${item.name}" from inventory?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          await deleteItem(id!);
          router.back();
        },
      },
    ]);
  };

  const conditionColor = (c: ItemCondition) => {
    switch (c) {
      case "Good": return C.statusGood;
      case "Fair": return C.statusFair;
      case "Poor": return C.statusPoor;
      case "Expired": return C.statusExpired;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Edit Item</Text>
        <Pressable
          onPress={handleSave}
          disabled={!name.trim()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.saveText, !name.trim() && styles.saveTextDisabled]}>Save</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {status === "need_to_buy" ? (
          <Pressable
            onPress={async () => {
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await markAsPurchased(id!);
              router.back();
            }}
            style={({ pressed }) => [styles.markPurchasedButton, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.markPurchasedText}>Mark as Purchased</Text>
          </Pressable>
        ) : null}

        <Text style={styles.label}>NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="Item name"
          placeholderTextColor={C.textTertiary}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>STATUS</Text>
        <View style={styles.chipRow}>
          <Pressable
            onPress={() => setStatus("owned")}
            style={[styles.chip, status === "owned" && { backgroundColor: C.statusGood, borderColor: C.statusGood }]}
          >
            <Text style={[styles.chipText, status === "owned" && { color: "#fff" }]}>
              I Have This
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setStatus("need_to_buy")}
            style={[styles.chip, status === "need_to_buy" && { backgroundColor: C.warning, borderColor: C.warning }]}
          >
            <Text style={[styles.chipText, status === "need_to_buy" && { color: "#fff" }]}>
              Need to Buy
            </Text>
          </Pressable>
        </View>

        <Text style={styles.label}>CATEGORY</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setCategory(cat)}
              style={[styles.chip, category === cat && styles.chipSelected]}
            >
              <Text style={[styles.chipText, category === cat && styles.chipTextSelected]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>QUANTITY</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>UNIT</Text>
            <TextInput
              style={styles.input}
              placeholder="pcs, lbs..."
              placeholderTextColor={C.textTertiary}
              value={unit}
              onChangeText={setUnit}
            />
          </View>
        </View>

        <Text style={styles.label}>CONDITION</Text>
        <View style={styles.chipRow}>
          {CONDITIONS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCondition(c)}
              style={[
                styles.chip,
                condition === c && { backgroundColor: conditionColor(c), borderColor: conditionColor(c) },
              ]}
            >
              <Text style={[styles.chipText, condition === c && { color: "#fff" }]}>
                {c}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>EXPIRY DATE (optional)</Text>
        {Platform.OS === "web" ? (
          <input
            type="date"
            style={{
              backgroundColor: C.surface,
              borderRadius: 12,
              paddingLeft: 16,
              paddingRight: 16,
              paddingTop: 12,
              paddingBottom: 12,
              fontSize: 15,
              fontFamily: "Inter_400Regular",
              color: C.text,
              border: "none",
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
            }}
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        ) : (
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={C.textTertiary}
            value={expiryDate}
            onChangeText={setExpiryDate}
          />
        )}

        {kits.length > 0 ? (
          <>
            <Text style={styles.label}>KIT (optional)</Text>
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => setKitId(null)}
                style={[styles.chip, kitId === null && styles.chipSelected]}
              >
                <Text style={[styles.chipText, kitId === null && styles.chipTextSelected]}>None</Text>
              </Pressable>
              {kits.map((kit) => (
                <Pressable
                  key={kit.id}
                  onPress={() => setKitId(kit.id)}
                  style={[styles.chip, kitId === kit.id && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, kitId === kit.id && styles.chipTextSelected]}>
                    {kit.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.label}>NOTES (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Additional notes..."
          placeholderTextColor={C.textTertiary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="trash-outline" size={18} color={C.danger} />
          <Text style={styles.deleteText}>Delete Item</Text>
        </Pressable>
      </ScrollView>
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
      paddingBottom: 12,
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
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
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
    notesInput: {
      minHeight: 80,
      textAlignVertical: "top",
    },
    row: {
      flexDirection: "row",
      gap: 12,
    },
    halfField: {
      flex: 1,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.borderLight,
    },
    chipSelected: {
      backgroundColor: C.accent,
      borderColor: C.accent,
    },
    chipText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: C.textSecondary,
    },
    chipTextSelected: {
      color: "#fff",
    },
    markPurchasedButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: C.statusGood,
    },
    markPurchasedText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
    deleteButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 32,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: C.dangerSurface,
    },
    deleteText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: C.danger,
    },
  });
}
