import { Redirect } from "expo-router";
import { useUserProfile } from "@/contexts/UserProfileContext";

export default function Index() {
  const { onboardingCompleted } = useUserProfile();

  // Still loading — render nothing
  if (onboardingCompleted === null) return null;

  // Redirect to onboarding if not completed
  if (!onboardingCompleted) return <Redirect href="/onboarding" />;

  return <Redirect href="/knowledge" />;
}
