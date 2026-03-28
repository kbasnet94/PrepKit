import React, { useState } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

export function AffiliateDisclosure() {
  const { colors: C } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.trigger}
      >
        <Ionicons
          name="information-circle-outline"
          size={14}
          color={C.textTertiary}
        />
        <Text style={[styles.label, { color: C.textTertiary }]}>
          Affiliate link
        </Text>
      </Pressable>
      {expanded ? (
        <View style={[styles.tooltip, { backgroundColor: C.surfaceSecondary, borderColor: C.border }]}>
          <Text style={[styles.tooltipText, { color: C.textSecondary }]}>
            NorthKeep earns a small commission on purchases made through this
            link — at no extra cost to you. Recommendations come from our
            guides, not paid placements.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 6,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  tooltip: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tooltipText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
