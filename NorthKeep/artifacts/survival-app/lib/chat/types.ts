import type { QueryMode } from "@/lib/guides/query-types";

export interface GroundedGuideRef {
  guideId: string;
  guideSlug: string;
  guideTitle: string;
  category: string;
  parentTopic?: string;
  score?: number;
}

export interface GroundedChatMeta {
  version: 2;
  matchedGuides: GroundedGuideRef[];
  relatedGuides: GroundedGuideRef[];
  warnings: string[];
  confidence: "high" | "medium" | "low";
  queryMode: QueryMode;
  strictSafetyMode: boolean;
  hasSourceReviewNotice: boolean;
  usedAIRewrite: boolean;
}
