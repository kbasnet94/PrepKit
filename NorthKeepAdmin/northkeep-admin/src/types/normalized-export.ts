export interface NormalizedGuideImage {
  /** Unique within the guide — used as the storage filename (no extension) */
  key: string;
  /** AI-authored sourcing brief shown only to admins, never to mobile users */
  description: string;
  /** Short label displayed under the image on mobile */
  caption: string;
  /** Accessibility alt text */
  altText: string;
  /** null = gallery section; 0-based index = renders next to that step */
  associatedStepIndex: number | null;
  /** null until admin uploads; leave null in pipeline output */
  storageUrl: string | null;
}

export interface NormalizedSourceReference {
  title: string;
  organization?: string;
  url?: string;
  whyUseful?: string;
}

export interface NormalizedGuide {
  id: string;
  slug: string;
  title: string;
  category: string;
  parentTopic: string;
  layer: string;
  guideType: string;
  summary: string | null;
  quickAnswer: string | null;
  whenToUse: string[];
  preferredAction: string | null;
  backupAction: string | null;
  stepByStepActions: string[];
  warnings: string[];
  whatNotToDo: string[];
  redFlags: string[];
  preparednessTips: string[];
  riskLevel?: string;
  sourceQuality: string | null;
  contentStatus: string | null;
  integrationDecision: string | null;
  upgradesGuide: string | null;
  relatedGuides: string[];
  sourceReferences: NormalizedSourceReference[];
  appTags: string[];
  notes: string | null;
  /** Role of this guide within its parentTopic cluster */
  responseRole?: "primary" | "backup" | "supporting" | "reference";
  /** Constraints where this guide should be boosted */
  constraintTags?: string[];
  /** Constraints that should demote this guide */
  blockedByConstraints?: string[];
  /** Direct alternatives when another guide's method is unavailable */
  alternativeToGuideSlugs?: string[];
  /**
   * AI-recommended images for this guide. Written by the Writing skill with storageUrl: null.
   * Admin uploads images via the admin UI, which populates storageUrl.
   * Pipeline should always include this field (default to empty array).
   */
  images?: NormalizedGuideImage[];
}

export interface NormalizedExport {
  exportedAt: string;
  totalGuides: number;
  normalizedAt: string;
  guides: NormalizedGuide[];
}
