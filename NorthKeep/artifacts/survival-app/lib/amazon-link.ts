import { Linking, Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Amazon affiliate tag — read from app.json extra config.
 * Falls back to placeholder if not configured.
 */
const AFFILIATE_TAG =
  (Constants.expoConfig?.extra as Record<string, string> | undefined)
    ?.amazonAffiliateTag ?? "northkeep-20";

/**
 * Build a standard Amazon search URL with the affiliate tag.
 */
export function buildAmazonUrl(keywords: string): string {
  const encoded = encodeURIComponent(keywords.trim());
  return `https://www.amazon.com/s?k=${encoded}&tag=${AFFILIATE_TAG}`;
}

/**
 * Open an Amazon search for the given keywords.
 * On iOS/Android, tries the Amazon app deep link first;
 * falls back to browser if the app isn't installed.
 */
export async function openAmazonLink(keywords: string): Promise<void> {
  const webUrl = buildAmazonUrl(keywords);
  const searchPath = `/s?k=${encodeURIComponent(keywords.trim())}&tag=${AFFILIATE_TAG}`;

  if (Platform.OS === "ios") {
    // Amazon iOS app deep link
    const appUrl = `com.amazon.mobile.shopping://www.amazon.com${searchPath}`;
    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) {
        await Linking.openURL(appUrl);
        return;
      }
    } catch {
      // App not installed, fall through to browser
    }
  } else if (Platform.OS === "android") {
    // Android intent-based deep link
    const intentUrl = `intent://www.amazon.com${searchPath}#Intent;package=com.amazon.mShop.android.shopping;scheme=https;end`;
    try {
      await Linking.openURL(intentUrl);
      return;
    } catch {
      // Intent failed, fall through to browser
    }
  }

  // Fallback: open in browser
  await Linking.openURL(webUrl);
}
