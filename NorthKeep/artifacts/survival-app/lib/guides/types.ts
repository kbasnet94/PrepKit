export type RiskLevel = "low" | "medium" | "high";

export type GuideResponseRole = "primary" | "backup" | "supporting" | "reference";

export type GuideLayer = "action_card" | "scenario_guide" | "reference_guide" | "preparedness";

export type GuideSourceQuality =
  | "high"
  | "medium"
  | "low"
  | "needs_review"
  | "planned"
  | "supporting_only";

export type GuideContentStatus =
  | "ready"
  | "needs_source_review"
  | "metadata_only"
  | "reference_summary";

export type GuideCategory =
  | "natural_disasters"
  | "water_food"
  | "communication"
  | "preparedness"
  | "medical_safety"
  | "navigation"
  | "core_skills"
  | "weather_environment"
  | string;

export type CardType =
  | "practical"
  | "medical_safety"
  | "checklist"
  | "reference_summary"
  | "Action card"
  | "Decision guide"
  | "Quick guide"
  | "Reference card"
  | "Response card"
  | "Medical-safety card"
  | "Checklist"
  | string;

export interface GuideImage {
  /** Unique within the guide */
  key: string;
  /** Short label displayed under the image */
  caption: string;
  /** Accessibility alt text */
  altText: string;
  /** null = gallery section; 0-based index = renders next to that step */
  associatedStepIndex: number | null;
  /** Public URL from Supabase Storage; null if image not yet uploaded */
  storageUrl: string | null;
  // Note: description field is intentionally excluded — it's admin-facing only
}

export interface GuideSourceRef {
  title: string;
  organization: string;
  url: string;
  whyUseful: string;
  quality: string;
  reviewStatus: string;
}

/** A product variant/subtype of a tool */
export interface ToolVariant {
  label: string;
  description: string;
  amazonSearchKeywords: string;
}

export interface GuideTool {
  id: string;
  name: string;
  category: string;
  description: string;
  optional: boolean;
  context: string | null;
  // Display + Amazon fields (from canonical tools table)
  icon?: string;
  useCases?: string[];
  amazonSearchKeywords?: string | null;
  amazonEnabled?: boolean;
  variants?: ToolVariant[];
}

export interface Guide {
  id: string;
  slug: string;
  title: string;
  layer: GuideLayer;
  category: GuideCategory;
  riskLevel: RiskLevel;
  cardType: CardType;
  sourceQuality: GuideSourceQuality;
  contentStatus: GuideContentStatus;
  parentTopic?: string;
  summary: string;
  whenToUse: string;
  preferredOption: string | null;
  fallbackOption: string | null;
  steps: string[];
  warnings: string[];
  whatNotToDo: string[];
  redFlags: string[];
  preparednessTips: string[];
  limitations: string[];
  tags: string[];
  sourceReferences: GuideSourceRef[];
  derivedFrom: string[];
  primarySourceDirection?: string;
  sourceReferenceIds?: string[];
  responseRole?: GuideResponseRole;
  constraintTags?: string[];
  blockedByConstraints?: string[];
  alternativeToGuideSlugs?: string[];
  images?: GuideImage[];
  tools?: GuideTool[];
}

export interface GuideSourceReference {
  id: string;
  title: string;
  provider: string;
  topic: string;
  url: string;
}

export interface SourceFamily {
  id: string;
  name: string;
  recommendedProviders: string[];
  bestFor: string;
}
