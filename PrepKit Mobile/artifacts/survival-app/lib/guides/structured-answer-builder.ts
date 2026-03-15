import { buildGuideGroundingContext } from "./grounding-context";
import { getTemplateTypeForMode, getTemplateForMode } from "./response-policy";
import type { GroundingContext } from "./query-types";
import type { StructuredAnswer, StructuredAnswerSection, StructuredAnswerSource } from "./response-types";
import type { Guide } from "./types";

const RED_FLAG_KEYWORDS = [
  "seek", "evacuate", "evacuation", "911", "emergency services",
  "hospital", "medical help", "professional", "life-threatening",
  "advancing", "spread", "fatal", "emergency",
];

const NOT_TO_DO_KEYWORDS = [
  "do not", "don't", "never", "avoid",
];

const INVASIVE_KEYWORDS = [
  "stitch", "suture", "sew my", "sew the", "close wound", "close the wound",
  "drain", "lance", "pop the", "set bone", "realign", "reduce fracture",
  "remove embedded", "extract the",
];

function isInvasiveQuery(query: string): boolean {
  const q = query.toLowerCase();
  return INVASIVE_KEYWORDS.some((kw) => q.includes(kw));
}

function extractRedFlags(warnings: string[], steps: string[]): string[] {
  const flagSet = new Set<string>();
  for (const w of warnings) {
    if (RED_FLAG_KEYWORDS.some((kw) => w.toLowerCase().includes(kw))) flagSet.add(w);
  }
  for (const s of steps) {
    if (RED_FLAG_KEYWORDS.some((kw) => s.toLowerCase().includes(kw))) flagSet.add(s);
  }
  return Array.from(flagSet);
}

function extractNotToDo(warnings: string[], invasive: boolean): string[] {
  const list: string[] = [];
  if (invasive) {
    list.push(
      "Do not attempt to stitch, suture, or otherwise close a wound in field conditions. This requires sterile instruments, proper training, and local anaesthesia."
    );
  }
  for (const w of warnings) {
    if (NOT_TO_DO_KEYWORDS.some((kw) => w.toLowerCase().startsWith(kw) || w.toLowerCase().includes(` ${kw} `))) {
      if (!list.includes(w)) list.push(w);
    }
  }
  return list;
}

function buildSources(topGuides: GroundingContext["topGuides"]): StructuredAnswerSource[] {
  return topGuides.map((m) => ({
    guideId: m.guide.id,
    guideTitle: m.guide.title,
    sectionHints: m.matchReasons.slice(0, 2),
  }));
}

function truncateSummary(summary: string, maxWords = 40): string {
  const words = summary.split(" ");
  if (words.length <= maxWords) return summary;
  return words.slice(0, maxWords).join(" ") + "…";
}

function buildPracticalAnswer(ctx: GroundingContext, primary: Guide): StructuredAnswer {
  const sections: StructuredAnswerSection[] = [];

  if (primary.summary) {
    sections.push({
      id: "quick-answer",
      label: "Quick Answer",
      content: truncateSummary(primary.summary, 50),
      emphasis: "normal",
    });
  }

  if (primary.preferredOption) {
    sections.push({
      id: "preferred-method",
      label: "Preferred Method",
      content: primary.preferredOption,
      emphasis: "important",
    });
  }

  if (primary.fallbackOption) {
    sections.push({
      id: "backup-method",
      label: "Backup Option",
      content: primary.fallbackOption,
      emphasis: "normal",
    });
  }

  if (primary.steps.length > 0) {
    const stepLimit = ctx.interpretation.primaryIntent === "emergency_urgent" ? 5 : primary.steps.length;
    sections.push({
      id: "steps",
      label: "Steps",
      content: primary.steps.slice(0, stepLimit),
      emphasis: "normal",
    });
  }

  const allWarnings = [
    ...primary.warnings,
    ...primary.limitations.map((l) => `Note: ${l}`),
  ].filter(Boolean);
  if (allWarnings.length > 0) {
    sections.push({
      id: "warnings",
      label: "Warnings",
      content: allWarnings,
      emphasis: "warning",
    });
  }

  return {
    query: ctx.query,
    mode: ctx.interpretation.primaryIntent,
    templateType: "practical",
    title: primary.title,
    sections,
    warnings: ctx.warnings,
    sources: buildSources(ctx.topGuides),
    confidence: ctx.interpretation.confidence,
    strictSafetyMode: ctx.interpretation.shouldUseStrictSafetyMode,
  };
}

function buildMedicalAnswer(ctx: GroundingContext, primary: Guide): StructuredAnswer {
  const sections: StructuredAnswerSection[] = [];
  const invasive = isInvasiveQuery(ctx.query);

  const redFlags = extractRedFlags(primary.warnings, primary.steps);
  const notToDo = extractNotToDo(primary.warnings, invasive);
  const safeSteps = primary.steps.filter(
    (s) => !NOT_TO_DO_KEYWORDS.some((kw) => s.toLowerCase().includes(kw))
  );

  if (primary.preferredOption) {
    sections.push({
      id: "immediate-priority",
      label: "Immediate Priority",
      content: primary.preferredOption,
      emphasis: "important",
    });
  }

  if (redFlags.length > 0) {
    sections.push({
      id: "red-flags",
      label: "Red Flags — When to Seek Urgent Help",
      content: redFlags,
      emphasis: "warning",
    });
  } else {
    sections.push({
      id: "red-flags",
      label: "Red Flags — When to Seek Urgent Help",
      content: [
        "Any situation that is worsening despite basic first aid.",
        "Confusion, unconsciousness, or inability to respond.",
        "Seek professional medical help as soon as it is accessible.",
      ],
      emphasis: "warning",
    });
  }

  if (safeSteps.length > 0) {
    sections.push({
      id: "what-you-can-do",
      label: "What You Can Do Right Now",
      content: safeSteps.slice(0, 5),
      emphasis: "normal",
    });
  }

  if (notToDo.length > 0) {
    sections.push({
      id: "what-not-to-do",
      label: "What Not To Do",
      content: notToDo,
      emphasis: "warning",
    });
  } else if (primary.limitations.length > 0) {
    sections.push({
      id: "what-not-to-do",
      label: "What Not To Do",
      content: primary.limitations,
      emphasis: "warning",
    });
  }

  const globalWarnings = [
    "This guidance is for emergency field use only. Seek professional medical help as soon as possible.",
    ...ctx.warnings.filter((w) => !w.includes("Low confidence") && !w.includes("Query intent")),
  ];

  return {
    query: ctx.query,
    mode: ctx.interpretation.primaryIntent,
    templateType: "medical",
    title: primary.title,
    sections,
    warnings: globalWarnings,
    sources: buildSources(ctx.topGuides),
    confidence: ctx.interpretation.confidence,
    strictSafetyMode: true,
  };
}

function buildPreparednessAnswer(ctx: GroundingContext, primary: Guide): StructuredAnswer {
  const sections: StructuredAnswerSection[] = [];

  if (primary.summary) {
    sections.push({
      id: "goal",
      label: "Goal",
      content: primary.summary,
      emphasis: "normal",
    });
  }

  if (primary.steps.length >= 3) {
    sections.push({
      id: "priorities",
      label: "Recommended Priorities",
      content: primary.steps.slice(0, 4),
      emphasis: "important",
    });
    if (primary.steps.length > 4) {
      sections.push({
        id: "checklist",
        label: "Full Checklist",
        content: primary.steps,
        emphasis: "normal",
      });
    }
  } else if (primary.steps.length > 0) {
    sections.push({
      id: "checklist",
      label: "Checklist",
      content: primary.steps,
      emphasis: "normal",
    });
  }

  const gaps = [...primary.warnings, ...primary.limitations].filter(Boolean);
  if (gaps.length > 0) {
    sections.push({
      id: "gaps",
      label: "Warnings and Gaps",
      content: gaps,
      emphasis: "warning",
    });
  }

  return {
    query: ctx.query,
    mode: ctx.interpretation.primaryIntent,
    templateType: "preparedness",
    title: primary.title,
    sections,
    warnings: ctx.warnings,
    sources: buildSources(ctx.topGuides),
    confidence: ctx.interpretation.confidence,
    strictSafetyMode: ctx.interpretation.shouldUseStrictSafetyMode,
  };
}

function buildEducationalAnswer(ctx: GroundingContext, primary: Guide, secondary?: Guide): StructuredAnswer {
  const sections: StructuredAnswerSection[] = [];

  sections.push({
    id: "short-explanation",
    label: "Short Explanation",
    content: primary.summary || "No summary available for this topic.",
    emphasis: "normal",
  });

  const conceptContent = primary.whenToUse
    ? primary.whenToUse
    : primary.steps.length > 0
    ? primary.steps.slice(0, 3)
    : "Refer to the full guide for detailed information.";

  sections.push({
    id: "key-concepts",
    label: "Key Concepts",
    content: conceptContent,
    emphasis: "normal",
  });

  const practicalContent = primary.preferredOption
    ? primary.preferredOption
    : secondary
    ? `Related guide: ${secondary.title} — ${truncateSummary(secondary.summary, 25)}`
    : `See the full "${primary.title}" guide for practical field application.`;

  sections.push({
    id: "practical-relevance",
    label: "Practical Relevance",
    content: practicalContent,
    emphasis: "important",
  });

  return {
    query: ctx.query,
    mode: ctx.interpretation.primaryIntent,
    templateType: "educational",
    title: primary.title,
    sections,
    warnings: ctx.warnings,
    sources: buildSources(ctx.topGuides),
    confidence: ctx.interpretation.confidence,
    strictSafetyMode: false,
  };
}

function buildCautiousAnswer(ctx: GroundingContext, primary?: Guide): StructuredAnswer {
  const sections: StructuredAnswerSection[] = [];

  sections.push({
    id: "best-understanding",
    label: "Best Understanding of Your Question",
    content: primary
      ? `Based on your question, the most relevant guide I found is "${primary.title}".`
      : "I wasn't able to confidently identify a specific guide for your question.",
    emphasis: "normal",
  });

  sections.push({
    id: "what-we-can-say",
    label: "What We Can Say Safely",
    content: primary
      ? truncateSummary(primary.summary, 50)
      : "Try browsing the Knowledge section directly to find relevant guides.",
    emphasis: "normal",
  });

  sections.push({
    id: "what-may-be-missing",
    label: "What May Be Missing",
    content:
      "The query could not be confidently matched. The answer above may not fully address your situation. Browse the Knowledge guides directly or rephrase your question.",
    emphasis: "warning",
  });

  return {
    query: ctx.query,
    mode: "unclear_or_unknown",
    templateType: "cautious",
    title: primary ? primary.title : "Unclear Query",
    sections,
    warnings: [
      "Low confidence — query intent could not be determined accurately.",
      ...ctx.warnings,
    ],
    sources: buildSources(ctx.topGuides),
    confidence: "low",
    strictSafetyMode: false,
  };
}

export function buildStructuredAnswer(query: string): StructuredAnswer {
  const ctx = buildGuideGroundingContext(query);
  const { primaryIntent } = ctx.interpretation;
  const templateType = getTemplateTypeForMode(primaryIntent);
  const primary = ctx.topGuides[0]?.guide;
  const secondary = ctx.topGuides[1]?.guide;

  if (!primary) return buildCautiousAnswer(ctx, undefined);

  switch (templateType) {
    case "practical":
      return buildPracticalAnswer(ctx, primary);
    case "medical":
      return buildMedicalAnswer(ctx, primary);
    case "preparedness":
      return buildPreparednessAnswer(ctx, primary);
    case "educational":
      return buildEducationalAnswer(ctx, primary, secondary);
    case "cautious":
    default:
      return buildCautiousAnswer(ctx, primary);
  }
}

export function buildStructuredAnswerFromContext(ctx: GroundingContext): StructuredAnswer {
  const { primaryIntent } = ctx.interpretation;
  const templateType = getTemplateTypeForMode(primaryIntent);
  const primary = ctx.topGuides[0]?.guide;
  const secondary = ctx.topGuides[1]?.guide;

  if (!primary) return buildCautiousAnswer(ctx, undefined);

  switch (templateType) {
    case "practical":
      return buildPracticalAnswer(ctx, primary);
    case "medical":
      return buildMedicalAnswer(ctx, primary);
    case "preparedness":
      return buildPreparednessAnswer(ctx, primary);
    case "educational":
      return buildEducationalAnswer(ctx, primary, secondary);
    case "cautious":
    default:
      return buildCautiousAnswer(ctx, primary);
  }
}
