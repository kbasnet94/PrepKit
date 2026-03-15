import type { Guide } from "./types";

export type QueryMode =
  | "practical_how_to"
  | "emergency_urgent"
  | "educational_background"
  | "preparedness_planning"
  | "medical_safety"
  | "unclear_or_unknown";

export type AnswerStyle =
  | "step_by_step"
  | "immediate_action"
  | "explanation"
  | "checklist"
  | "medical_conservative"
  | "broad_cautious";

export interface QueryInterpretation {
  normalizedQuery: string;
  primaryIntent: QueryMode;
  secondaryIntents: QueryMode[];
  riskLevel: "low" | "medium" | "high";
  urgencyLevel: "low" | "medium" | "high";
  answerStyle: AnswerStyle;
  shouldUseStrictSafetyMode: boolean;
  confidence: "high" | "medium" | "low";
  detectedKeywords: string[];
}

export interface GuideMatchResult {
  guide: Guide;
  score: number;
  matchReasons: string[];
}

export interface GuideSnippet {
  guideId: string;
  guideTitle: string;
  section: "summary" | "whenToUse" | "preferredOption" | "fallbackOption" | "steps" | "warnings";
  content: string;
}

export interface RetrievalPolicy {
  mode: QueryMode;
  maxResults: number;
  minScore: number;
  strictMode: boolean;
  preferredCategories: string[];
  preferredCardTypes: string[];
  description: string;
}

export interface GroundingContext {
  query: string;
  interpretation: QueryInterpretation;
  policy: RetrievalPolicy;
  topGuides: GuideMatchResult[];
  snippets: GuideSnippet[];
  warnings: string[];
  timestamp: number;
}
