import { interpretQuery } from "./query-interpreter";
import { getPolicy } from "./retrieval-policy";
import { interpretAndMatchGuides, interpretAndMatchGuidesContextual, selectRelatedGuides } from "./guide-matching";
import { getGuidesStore } from "./guide-store";
import type { QueryInterpretation, GuideMatchResult, GuideSnippet, GroundingContext } from "./query-types";
import type { Guide } from "./types";
import type { ConversationContext, FollowUpAnalysis } from "@/lib/chat/conversation-context";
import { buildContextualQuery } from "@/lib/chat/conversation-context";

function extractSnippets(guide: Guide, intent: QueryInterpretation): GuideSnippet[] {
  const snippets: GuideSnippet[] = [];
  const mode = intent.primaryIntent;

  if (guide.summary) {
    snippets.push({
      guideId: guide.id,
      guideTitle: guide.title,
      section: "summary",
      content: guide.summary,
    });
  }

  if (guide.whenToUse && (mode === "emergency_urgent" || mode === "practical_how_to" || mode === "medical_safety")) {
    snippets.push({
      guideId: guide.id,
      guideTitle: guide.title,
      section: "whenToUse",
      content: guide.whenToUse,
    });
  }

  if (guide.preferredOption && mode !== "educational_background") {
    snippets.push({
      guideId: guide.id,
      guideTitle: guide.title,
      section: "preferredOption",
      content: guide.preferredOption,
    });
  }

  if (guide.fallbackOption && (mode === "emergency_urgent" || mode === "practical_how_to")) {
    snippets.push({
      guideId: guide.id,
      guideTitle: guide.title,
      section: "fallbackOption",
      content: guide.fallbackOption,
    });
  }

  if (guide.steps.length > 0 && mode !== "educational_background" && mode !== "preparedness_planning") {
    const stepCount = mode === "emergency_urgent" ? 4 : 3;
    snippets.push({
      guideId: guide.id,
      guideTitle: guide.title,
      section: "steps",
      content: guide.steps.slice(0, stepCount).map((s, i) => `${i + 1}. ${s}`).join("\n"),
    });
  }

  if (guide.warnings.length > 0 && (intent.riskLevel === "high" || intent.shouldUseStrictSafetyMode)) {
    snippets.push({
      guideId: guide.id,
      guideTitle: guide.title,
      section: "warnings",
      content: guide.warnings.join("\n"),
    });
  }

  return snippets;
}

function buildWarnings(
  intent: QueryInterpretation,
  matches: GuideMatchResult[]
): string[] {
  const warnings: string[] = [];

  if (intent.confidence === "low") {
    warnings.push("Low confidence in query interpretation — results may not be precisely relevant.");
  }

  if (intent.primaryIntent === "unclear_or_unknown") {
    warnings.push("Query intent could not be clearly determined. Showing broadly matched results.");
  }

  if (intent.shouldUseStrictSafetyMode) {
    warnings.push(
      "Medical or safety-critical query detected. This guidance is for emergency field use only. Seek professional medical help as soon as possible."
    );
  }

  if (matches.length === 0) {
    warnings.push("No guides matched this query with sufficient confidence.");
  }

  if (intent.primaryIntent === "medical_safety" && matches.some((m) => m.guide.category !== "medical_safety")) {
    warnings.push(
      "Some results are outside the Medical safety category — treat with additional caution."
    );
  }

  return warnings;
}

export function buildGuideGroundingContext(query: string): GroundingContext {
  const { interpretation, matches, policy } = interpretAndMatchGuides(query);

  const allSnippets: GuideSnippet[] = [];
  for (const match of matches) {
    allSnippets.push(...extractSnippets(match.guide, interpretation));
  }

  const warnings = buildWarnings(interpretation, matches);

  return {
    query,
    interpretation,
    policy,
    topGuides: matches,
    snippets: allSnippets,
    warnings,
    timestamp: Date.now(),
  };
}

export function buildContextualGroundingContext(
  rawQuery: string,
  context: ConversationContext,
  analysis: FollowUpAnalysis
): { ctx: GroundingContext; allScoredGuides: GuideMatchResult[] } {
  const augmentedQuery = buildContextualQuery(rawQuery, context, analysis);

  const overrideMode =
    context.previousConfidence !== "low" && analysis.isFollowUp
      ? context.previousQueryMode
      : undefined;

  const { interpretation, matches, allScores } = interpretAndMatchGuidesContextual(
    augmentedQuery,
    {
      boostParentTopic: context.previousParentTopic,
      demoteGuideId: analysis.hasConstraint ? context.previousTopGuideId : undefined,
      overrideMode,
      relaxMinScore: analysis.isFollowUp,
      constraintTags: analysis.normalizedConstraintTags,
      previousGuideSlug: context.previousTopGuideSlug,
    }
  );

  const allSnippets: GuideSnippet[] = [];
  for (const match of matches) {
    allSnippets.push(...extractSnippets(match.guide, interpretation));
  }

  const baseWarnings = buildWarnings(interpretation, matches);
  const filteredWarnings = baseWarnings.filter((w) => {
    if (
      analysis.isFollowUp &&
      matches.length > 0 &&
      (w.includes("Query intent could not be clearly determined") ||
        w.includes("Low confidence in query interpretation"))
    ) {
      return false;
    }
    return true;
  });

  const ctx: GroundingContext = {
    query: augmentedQuery,
    interpretation,
    policy: getPolicy(interpretation.primaryIntent),
    topGuides: matches,
    snippets: allSnippets,
    warnings: filteredWarnings,
    timestamp: Date.now(),
  };

  return { ctx, allScoredGuides: allScores };
}

export function buildContextualRelatedGuides(
  primaryGuide: Guide | undefined,
  allScoredGuides: GuideMatchResult[]
): GuideMatchResult[] {
  if (!primaryGuide) return allScoredGuides.slice(1, 5);
  return selectRelatedGuides(primaryGuide, allScoredGuides, getGuidesStore(), 4);
}

export function formatGroundingContextAsText(ctx: GroundingContext): string {
  const lines: string[] = [];

  lines.push(`=== GROUNDING CONTEXT ===`);
  lines.push(`Query: "${ctx.query}"`);
  lines.push(`Mode: ${ctx.interpretation.primaryIntent}`);
  lines.push(`Risk: ${ctx.interpretation.riskLevel} | Urgency: ${ctx.interpretation.urgencyLevel} | Confidence: ${ctx.interpretation.confidence}`);
  lines.push(`Strict safety mode: ${ctx.interpretation.shouldUseStrictSafetyMode}`);
  lines.push(``);

  if (ctx.warnings.length > 0) {
    lines.push(`=== WARNINGS ===`);
    ctx.warnings.forEach((w) => lines.push(`⚠ ${w}`));
    lines.push(``);
  }

  if (ctx.topGuides.length > 0) {
    lines.push(`=== MATCHED GUIDES ===`);
    ctx.topGuides.forEach((m, i) => {
      lines.push(`${i + 1}. [score: ${m.score}] ${m.guide.title}`);
    });
    lines.push(``);
  }

  if (ctx.snippets.length > 0) {
    lines.push(`=== GUIDE CONTENT ===`);
    let currentGuide = "";
    for (const snippet of ctx.snippets) {
      if (snippet.guideTitle !== currentGuide) {
        currentGuide = snippet.guideTitle;
        lines.push(`\n--- ${snippet.guideTitle} ---`);
      }
      lines.push(`[${snippet.section.toUpperCase()}]`);
      lines.push(snippet.content);
    }
  }

  return lines.join("\n");
}
