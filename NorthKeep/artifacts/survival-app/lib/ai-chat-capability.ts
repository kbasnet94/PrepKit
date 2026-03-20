export type AIChatCapability = "compatible" | "incompatible" | "unknown";

/**
 * Check whether the device can run on-device AI chat.
 * Returns "unknown" until we finalize the AI framework choice.
 * Will be updated to check chip/RAM/iOS version when ready.
 */
export function getAIChatCapability(): AIChatCapability {
  return "unknown";
}
