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
}

export interface NormalizedExport {
  exportedAt: string;
  totalGuides: number;
  normalizedAt: string;
  guides: NormalizedGuide[];
}
