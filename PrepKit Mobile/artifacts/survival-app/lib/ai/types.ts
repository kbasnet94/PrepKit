import type { StructuredAnswer, StructuredAnswerSource } from "../guides/response-types";

export type AIRewriteMode = "off" | "assistive";

export type AIAvailabilityState = "available" | "unavailable" | "unknown";

export interface AIRewriteInput {
  query: string;
  structuredAnswer: StructuredAnswer;
  groundingContextText: string;
  rewriteInstruction: string;
  strictSafetyMode: boolean;
}

export interface AIEnhancedAnswer {
  query: string;
  rewrittenText: string;
  structuredAnswer: StructuredAnswer;
  usedAI: boolean;
  aiAvailability: AIAvailabilityState;
  fallbackReason?: string;
  sources: StructuredAnswerSource[];
  strictSafetyMode: boolean;
}
