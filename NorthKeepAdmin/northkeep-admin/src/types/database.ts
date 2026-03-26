export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Layer = "action" | "scenario" | "preparedness" | "reference";
export type GuideType = "action_card" | "scenario_guide" | "preparedness_guide" | "reference_guide";
export type SourceQuality = "strong" | "mixed" | "weak";
export type ReviewStatus = "draft" | "in_review" | "needs_images" | "approved" | "published" | "archived";
export type ReleaseStatus = "draft" | "published" | "deprecated";
export type ResponseRole = "primary" | "backup" | "supporting" | "reference";

export interface GuideCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GuideParentTopic {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Guide {
  id: string;
  legacy_id: string | null;
  slug: string;
  title: string;
  category_id: string;
  parent_topic_id: string;
  current_published_version_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SourceReference {
  title: string;
  organization?: string;
  url?: string;
  whyUseful?: string;
}

export interface GuideImage {
  /** Unique within the guide — used as the storage filename (no extension) */
  key: string;
  /** AI-authored sourcing brief shown only to admins, never to mobile users */
  description: string;
  /** Short label displayed under the image on mobile */
  caption: string;
  /** Accessibility alt text */
  altText: string;
  /** null = gallery section at top; 0-based index = renders next to that step */
  associatedStepIndex: number | null;
  /** null until admin uploads; populated by the image upload API */
  storageUrl: string | null;
}

export interface GuideTool {
  name: string;
  category: string;
  optional: boolean;
  context: string;
}

/** Canonical tool definition (normalized tools table) */
export interface Tool {
  id: string;
  name: string;
  category: string;
  description: string;
  amazon_search_keywords: string | null;
  amazon_enabled: boolean;
  icon: string | null;
  use_cases: string[];
  created_at: string;
  updated_at: string;
}

/** Join row linking a guide version to a canonical tool */
export interface GuideVersionTool {
  id: string;
  guide_version_id: string;
  tool_id: string;
  optional: boolean;
  context: string | null;
  sort_order: number;
  created_at: string;
}

export interface ContentGap {
  /** Suggested slug for the missing companion guide */
  slug: string;
  /** What this guide should cover */
  description: string;
}

export interface GuideVersion {
  id: string;
  guide_id: string;
  version_number: number;
  title: string;
  category_id: string;
  parent_topic_id: string;
  layer: Layer;
  guide_type: GuideType;
  summary: string | null;
  quick_answer: string | null;
  when_to_use: string[];
  preferred_action: string | null;
  backup_action: string | null;
  step_by_step_actions: string[];
  warnings: string[];
  what_not_to_do: string[];
  red_flags: string[];
  preparedness_tips: string[];
  source_quality: SourceQuality | null;
  content_status: string | null;
  integration_decision: string | null;
  upgrades_guide: string | null;
  related_guides: string[];
  source_references: SourceReference[];
  app_tags: string[];
  notes: string | null;
  response_role: ResponseRole | null;
  constraint_tags: string[];
  blocked_by_constraints: string[];
  alternative_to_guide_slugs: string[];
  content_gaps: ContentGap[];
  images: GuideImage[];
  tools: GuideTool[];
  review_status: ReviewStatus;
  change_summary: string | null;
  created_by: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewComment {
  id: string;
  guide_version_id: string;
  author_id: string | null;
  body: string;
  is_resolved: boolean;
  created_at: string;
  resolved_at: string | null;
}

export interface GuideRelease {
  id: string;
  release_name: string;
  semantic_version: string;
  status: ReleaseStatus;
  release_notes: string | null;
  manifest_path: string | null;
  bundle_path: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuideReleaseItem {
  id: string;
  release_id: string;
  guide_id: string;
  guide_version_id: string;
  created_at: string;
}

export interface GuideFeedback {
  id: string;
  guide_id: string | null;
  guide_slug: string;
  guide_version_id: string | null;
  rating: "thumbs_up" | "thumbs_down";
  tags: string[];
  comment: string | null;
  device_id: string | null;
  created_at: string;
}

export interface AppFeedback {
  id: string;
  star_rating: number;
  comment: string | null;
  device_id: string | null;
  created_at: string;
}

export type RequestStatus = "pending" | "planned" | "completed";

export interface GuideRequest {
  id: string;
  topic: string;
  description: string | null;
  upvote_count: number;
  device_id: string | null;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
}

export interface RequestUpvote {
  id: string;
  request_id: string;
  device_id: string | null;
  created_at: string;
}
