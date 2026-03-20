import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { useUserProfile } from "@/contexts/UserProfileContext";

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const { completeOnboarding } = useUserProfile();

  const styles = makeStyles(C, insets);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>NorthKeep</Text>
        <Text style={styles.subtitle}>Your offline emergency survival guide</Text>
      </View>
      <View style={styles.footer}>
        <Pressable style={styles.primaryButton} onPress={() => router.push("/onboarding/profile")}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </Pressable>
        <Pressable
          style={styles.skipButton}
          onPress={async () => {
            await completeOnboarding();
            router.replace("/knowledge");
          }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(C: any, insets: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
      paddingTop: insets.top,
      paddingBottom: insets.bottom + 16,
      paddingHorizontal: 24,
    },
    content: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      fontSize: 36,
      fontWeight: "700",
      color: C.text,
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 18,
      color: C.textSecondary,
      textAlign: "center",
    },
    footer: {
      gap: 12,
    },
    primaryButton: {
      backgroundColor: C.accent,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
    },
    primaryButtonText: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "600",
    },
    skipButton: {
      paddingVertical: 12,
      alignItems: "center",
    },
    skipText: {
      color: C.textSecondary,
      fontSize: 16,
    },
  });
}
