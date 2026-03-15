import { buildAIEnhancedAnswer, buildAIEnhancedAnswerFromContext } from "@/lib/ai/ai-answer-builder";
import { buildGuideGroundingContext, buildContextualGroundingContext, buildContextualRelatedGuides } from "@/lib/guides/grounding-context";
import { getGuideMatchScores, selectRelatedGuides } from "@/lib/guides/guide-matching";
import { getGuidesStore } from "@/lib/guides/guide-store";
import { analyzeFollowUp } from "./conversation-context";
import type { AIRewriteMode } from "@/lib/ai/types";
import type { GroundedChatMeta, GroundedGuideRef } from "./types";
import type { ConversationContext } from "./conversation-context";
import type { Guide } from "@/lib/guides/types";

export type { ConversationContext };

export interface GroundedChatResponse {
  text: string;
  meta: GroundedChatMeta;
}

function toGuideRef(match: {
  guide: Guide;
  score: number;
}): GroundedGuideRef {
  return {
    guideId: match.guide.id,
    guideSlug: match.guide.slug,
    guideTitle: match.guide.title,
    category: match.guide.category,
    parentTopic: match.guide.parentTopic,
    score: match.score,
  };
}

function overrideConfidenceForFollowUp(
  current: "high" | "medium" | "low",
  previous: "high" | "medium" | "low",
  hasValidMatches: boolean
): "high" | "medium" | "low" {
  if (current !== "low") return current;
  if (!hasValidMatches) return "low";
  if (previous === "high") return "medium";
  if (previous === "medium") return "medium";
  return "low";
}

export async function getGroundedChatResponse(
  query: string,
  aiMode: AIRewriteMode,
  conversationContext: ConversationContext | null = null
): Promise<GroundedChatResponse> {
  const analysis = analyzeFollowUp(query, conversationContext);

  const isDev = __DEV__;

  if (isDev) {
    console.log("[GroundedChat] analysis:", {
      query,
      isFollowUp: analysis.isFollowUp,
      hasConstraint: analysis.hasConstraint,
      hasEscalation: analysis.hasEscalation,
      isShort: analysis.isShort,
      constraintTerms: analysis.constraintTerms,
      normalizedConstraintTags: analysis.normalizedConstraintTags,
      previousGuide: conversationContext?.previousTopGuideTitle,
      previousGuideSlug: conversationContext?.previousTopGuideSlug,
      previousParentTopic: conversationContext?.previousParentTopic,
      previousMode: conversationContext?.previousQueryMode,
      previousConfidence: conversationContext?.previousConfidence,
    });
  }

  let matchedGuides: GroundedGuideRef[];
  let relatedGuides: GroundedGuideRef[];
  let enhanced: Awaited<ReturnType<typeof buildAIEnhancedAnswer>>;
  let hasSourceReviewNotice: boolean;
  let answerPath: "standard" | "contextual_followup" | "contextual_constraint" | "contextual_escalation";

  if (analysis.isFollowUp && conversationContext) {
    const { ctx, allScoredGuides } = buildContextualGroundingContext(query, conversationContext, analysis);

    enhanced = await buildAIEnhancedAnswerFromContext(ctx, aiMode);

    const primary = ctx.topGuides[0];
    const allMatches = ctx.topGuides;

    matchedGuides = primary ? [toGuideRef(primary)] : [];

    const relatedMatches = primary
      ? selectRelatedGuides(primary.guide, allScoredGuides, getGuidesStore(), 4)
      : allScoredGuides.slice(1, 5);

    relatedGuides = relatedMatches
      .filter((m) => m.guide.id !== primary?.guide.id)
      .slice(0, 4)
      .map(toGuideRef);

    hasSourceReviewNotice = allMatches.some(
      (m) => m.guide.contentStatus === "needs_source_review"
    );

    const effectiveConfidence = overrideConfidenceForFollowUp(
      enhanced.structuredAnswer.confidence,
      conversationContext.previousConfidence,
      allMatches.length > 0
    );

    if (analysis.hasConstraint) {
      answerPath = "contextual_constraint";
    } else if (analysis.hasEscalation) {
      answerPath = "contextual_escalation";
    } else {
      answerPath = "contextual_followup";
    }

    if (isDev) {
      console.log("[GroundedChat] contextual result:", {
        answerPath,
        primaryGuide: primary?.guide.title,
        primaryScore: primary?.score,
        top5: allScoredGuides.slice(0, 5).map((m) => `${m.guide.title} (${m.score})`),
        relatedGuides: relatedGuides.map((g) => g.guideTitle),
        originalConfidence: enhanced.structuredAnswer.confidence,
        effectiveConfidence,
        mode: enhanced.structuredAnswer.mode,
      });
    }

    const meta: GroundedChatMeta = {
      version: 2,
      matchedGuides,
      relatedGuides,
      warnings: enhanced.structuredAnswer.warnings,
      confidence: effectiveConfidence,
      queryMode: enhanced.structuredAnswer.mode,
      strictSafetyMode: enhanced.strictSafetyMode,
      hasSourceReviewNotice,
      usedAIRewrite: enhanced.usedAI,
    };

    return { text: enhanced.rewrittenText, meta };
  }

  answerPath = "standard";

  const ctx = buildGuideGroundingContext(query);
  enhanced = await buildAIEnhancedAnswer(query, aiMode);

  const allMatches = ctx.topGuides;
  const primary = allMatches[0];

  const allScoredGuides = getGuideMatchScores(query);

  matchedGuides = primary ? [toGuideRef(primary)] : [];

  const relatedMatches = primary
    ? selectRelatedGuides(primary.guide, allScoredGuides, getGuidesStore(), 4)
    : allScoredGuides.slice(1, 5);

  relatedGuides = relatedMatches
    .filter((m) => m.guide.id !== primary?.guide.id)
    .slice(0, 4)
    .map(toGuideRef);

  hasSourceReviewNotice =
    allMatches.length > 0 &&
    allMatches.some((m) => m.guide.contentStatus === "needs_source_review");

  if (isDev) {
    console.log("[GroundedChat] standard result:", {
      answerPath,
      query,
      mode: enhanced.structuredAnswer.mode,
      confidence: enhanced.structuredAnswer.confidence,
      primaryGuide: primary?.guide.title,
      top5: allScoredGuides.slice(0, 5).map((m) => `${m.guide.title} (${m.score})`),
      relatedGuides: relatedGuides.map((g) => g.guideTitle),
      strictSafetyMode: enhanced.strictSafetyMode,
      usedAIRewrite: enhanced.usedAI,
      fallbackReason: enhanced.fallbackReason,
    });
  }

  const meta: GroundedChatMeta = {
    version: 2,
    matchedGuides,
    relatedGuides,
    warnings: enhanced.structuredAnswer.warnings,
    confidence: enhanced.structuredAnswer.confidence,
    queryMode: enhanced.structuredAnswer.mode,
    strictSafetyMode: enhanced.strictSafetyMode,
    hasSourceReviewNotice,
    usedAIRewrite: enhanced.usedAI,
  };

  return { text: enhanced.rewrittenText, meta };
}
