import type { QueryMode } from "@/lib/guides/query-types";
import { normalizeConstraintTags } from "./constraint-normalizer";

export interface ConversationContext {
  previousTopGuideId: string;
  previousTopGuideSlug: string;
  previousTopGuideTitle: string;
  previousParentTopic?: string;
  previousCategory: string;
  previousQueryMode: QueryMode;
  previousConfidence: "high" | "medium" | "low";
}

const CONSTRAINT_PATTERNS = [
  "i don't have",
  "i dont have",
  "i do not have",
  "i can't",
  "i cant",
  "i cannot",
  "without",
  "no bleach",
  "no fire",
  "no signal",
  "no shelter",
  "no power",
  "no clean water",
  "no access",
  "no water",
  "no food",
  "not available",
  "not possible",
  "can't do that",
  "cant do that",
  "don't have that",
  "dont have that",
  "there's no",
  "there is no",
  "i'm alone",
  "im alone",
  "i am alone",
  "i'm in a car",
  "im in a car",
  "i'm stuck",
  "it's dark",
  "its dark",
  "it is dark",
  "i'm also vomiting",
  "i can't move",
  "cant move",
  "can't boil",
  "cant boil",
  "i'm pregnant",
  "i am pregnant",
  "out of reach",
];

const FOLLOWUP_PATTERNS = [
  "what if",
  "what about",
  "and if",
  "but what",
  "but if",
  "but i",
  "but my",
  "but there",
  "but we",
  "what else",
  "what now",
  "then what",
  "how about",
  "still",
  "also",
  "as well",
  "same situation",
  "in that case",
  "instead",
  "alternatively",
];

const ESCALATION_PATTERNS = [
  "vomiting",
  "throwing up",
  "passing out",
  "very dizzy",
  "much worse",
  "getting worse",
  "shaking",
  "not responding",
  "unconscious",
  "not breathing",
  "turning blue",
  "severe",
  "worsening",
  "sweating heavily",
  "no longer",
  "i can't feel",
  "cant feel",
  "collapsing",
];

function wordCount(msg: string): number {
  return msg.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

export interface FollowUpAnalysis {
  isFollowUp: boolean;
  hasConstraint: boolean;
  hasEscalation: boolean;
  isShort: boolean;
  constraintTerms: string[];
  normalizedConstraintTags: string[];
}

export function analyzeFollowUp(
  message: string,
  context: ConversationContext | null
): FollowUpAnalysis {
  if (!context) {
    return {
      isFollowUp: false,
      hasConstraint: false,
      hasEscalation: false,
      isShort: false,
      constraintTerms: [],
      normalizedConstraintTags: [],
    };
  }

  const q = message.toLowerCase().trim();
  const wc = wordCount(message);
  const isShort = wc <= 10;

  const hasConstraint = CONSTRAINT_PATTERNS.some((p) => q.includes(p));
  const hasFollowUpPhrase = FOLLOWUP_PATTERNS.some((p) => q.includes(p));
  const hasEscalation = ESCALATION_PATTERNS.some((p) => q.includes(p));

  const isFollowUp = isShort || hasConstraint || hasFollowUpPhrase || hasEscalation;

  const constraintTerms: string[] = [];
  if (hasConstraint) {
    const patterns = [
      /i (?:don't|dont|do not|can't|cant|cannot) (?:have|do|use|access|find|get|boil|move|make|build) (.+?)(?:\.|,|$)/i,
      /(?:no|without) (?:a |an |any )?(\w[\w\s]{0,30})(?:\.|,|$)/i,
      /there(?:'s| is) no (.+?)(?:\.|,|$)/i,
    ];
    for (const re of patterns) {
      const m = q.match(re);
      if (m) {
        const words = m[1]
          .trim()
          .split(/\s+/)
          .filter((w) => w.length > 2);
        constraintTerms.push(...words);
      }
    }
  }

  const normalizedConstraintTags = normalizeConstraintTags(message);

  return { isFollowUp, hasConstraint, hasEscalation, isShort, constraintTerms, normalizedConstraintTags };
}

export function buildContextualQuery(
  rawMessage: string,
  context: ConversationContext,
  analysis: FollowUpAnalysis
): string {
  const parts: string[] = [rawMessage];

  if (context.previousParentTopic) {
    parts.push(context.previousParentTopic);
  }

  const titleWords = context.previousTopGuideTitle
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  parts.push(...titleWords.slice(0, 4));

  if (analysis.hasEscalation) {
    parts.push(context.previousCategory);
    parts.push("urgent emergency");
  }

  return parts.join(" ");
}
