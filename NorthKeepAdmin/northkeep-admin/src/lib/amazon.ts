/**
 * Amazon affiliate URL helpers.
 * Affiliate tag is stored here as a constant for admin preview;
 * the mobile app reads it from app.json → Constants.expoConfig.extra.
 */

const DEFAULT_TAG = "northkeep-20";

export function buildAmazonSearchUrl(
  keywords: string,
  tag: string = DEFAULT_TAG
): string {
  const encoded = encodeURIComponent(keywords.trim());
  return `https://www.amazon.com/s?k=${encoded}&tag=${tag}`;
}
