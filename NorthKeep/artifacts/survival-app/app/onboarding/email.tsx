import { View, Text, TextInput, StyleSheet, Pressable, Keyboard } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { isValidEmail } from "@/lib/user-profile";

export default function EmailScreen() {
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const { profile, updateProfile, completeOnboarding } = useUserProfile();

  const [email, setEmail] = useState(profile.email ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    const trimmed = email.trim();
    if (trimmed && !isValidEmail(trimmed)) {
      setError("Please enter a valid email address");
      return;
    }
    if (trimmed) {
      await updateProfile({ email: trimmed });
    }
    await completeOnboarding();
  };

  const handleSkip = async () => {
    await completeOnboarding();
  };

  const styles = makeStyles(C, insets);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>Stay in the loop</Text>
        <Text style={styles.description}>
          Get notified about new guides, features, and emergency preparedness tips. We'll never
          spam you.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor={C.textSecondary}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (error) setError(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
        />

        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.primaryButton} onPress={handleSubmit}>
          <Text style={styles.primaryButtonText}>
            {email.trim() ? "Continue" : "Continue without email"}
          </Text>
        </Pressable>
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Maybe Later</Text>
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
      paddingTop: insets.top + 16,
      paddingBottom: insets.bottom + 16,
      paddingHorizontal: 24,
    },
    content: {
      flex: 1,
      justifyContent: "center",
    },
    heading: {
      fontSize: 28,
      fontWeight: "700",
      color: C.text,
      marginBottom: 12,
    },
    description: {
      fontSize: 16,
      color: C.textSecondary,
      lineHeight: 24,
      marginBottom: 24,
    },
    input: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: C.text,
      backgroundColor: C.surface,
    },
    error: {
      color: "#e53e3e",
      fontSize: 14,
      marginTop: 8,
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
