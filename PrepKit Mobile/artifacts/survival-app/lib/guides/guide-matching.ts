import { getGuidesStore } from "./guide-store";
import { interpretQuery } from "./query-interpreter";
import { getPolicy } from "./retrieval-policy";
import type { QueryMode } from "./query-types";
import type { GuideMatchResult } from "./query-types";
import type { Guide } from "./types";

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "do", "does", "did",
  "i", "my", "me", "we", "our", "you", "your", "it", "its", "to", "for",
  "in", "on", "at", "of", "and", "or", "but", "with", "from", "by",
  "up", "about", "into", "through", "before", "after", "so", "if",
  "this", "that", "these", "those", "be", "been", "being", "have",
  "has", "had", "will", "would", "could", "should", "may", "might",
  "can", "not", "no", "nor", "when", "where",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function tokensOverlap(queryTokens: string[], fieldTokens: string[]): { count: number; matched: string[] } {
  const matched: string[] = [];
  for (const qt of queryTokens) {
    for (const ft of fieldTokens) {
      if (ft === qt || ft.startsWith(qt) || qt.startsWith(ft)) {
        if (!matched.includes(qt)) matched.push(qt);
        break;
      }
    }
  }
  return { count: matched.length, matched };
}

const CATEGORY_BOOSTS: Partial<Record<QueryMode, Record<string, number>>> = {
  emergency_urgent: {
    natural_disasters: 10,
    weather_environment: 8,
    medical_safety: 8,
    communication: 4,
  },
  medical_safety: {
    medical_safety: 15,
  },
  practical_how_to: {
    core_skills: 8,
    water_food: 8,
    navigation: 8,
    communication: 6,
    natural_disasters: 4,
  },
  preparedness_planning: {
    preparedness: 15,
    natural_disasters: 4,
  },
  educational_background: {},
  unclear_or_unknown: {},
};

const LAYER_BOOSTS: Partial<Record<QueryMode, Record<string, number>>> = {
  emergency_urgent: { action_card: 12, scenario_guide: 6, reference_guide: 0 },
  medical_safety: { action_card: 10, scenario_guide: 5, reference_guide: 0 },
  practical_how_to: { action_card: 8, scenario_guide: 5, reference_guide: 0 },
  preparedness_planning: { action_card: 3, scenario_guide: 6, reference_guide: 2 },
  educational_background: { action_card: 0, scenario_guide: 2, reference_guide: 8 },
  unclear_or_unknown: { action_card: 2, scenario_guide: 2, reference_guide: 0 },
};

const CARDTYPE_BOOSTS: Partial<Record<QueryMode, Record<string, number>>> = {
  emergency_urgent: { medical_safety: 6, practical: 4 },
  medical_safety: { medical_safety: 10 },
  practical_how_to: { practical: 5, checklist: 4 },
  preparedness_planning: { checklist: 8 },
};

const CONTENT_STATUS_PENALTIES: Record<string, number> = {
  needs_source_review: -15,
  metadata_only: -30,
  reference_summary: -2,
  ready: 5,
};

function scoreGuide(guide: Guide, queryTokens: string[], mode: QueryMode): GuideMatchResult {
  let score = 0;
  const matchReasons: string[] = [];

  const titleTokens = tokenize(guide.title);
  const titleOverlap = tokensOverlap(queryTokens, titleTokens);
  if (titleOverlap.count > 0) {
    const pts = titleOverlap.count * 10;
    score += pts;
    matchReasons.push(`title (${titleOverlap.matched.join(", ")})`);
  }

  const summaryTokens = tokenize(guide.summary);
  const summaryOverlap = tokensOverlap(queryTokens, summaryTokens);
  if (summaryOverlap.count > 0) {
    score += summaryOverlap.count * 3;
    matchReasons.push(`summary (${summaryOverlap.count} words)`);
  }

  const tagOverlaps: string[] = [];
  for (const tag of guide.tags) {
    const tagWords = tag.split(/[-_]/);
    const tagOverlap = tokensOverlap(queryTokens, tagWords);
    if (tagOverlap.count > 0) {
      score += 5;
      tagOverlaps.push(tag);
    }
  }
  if (tagOverlaps.length > 0) {
    matchReasons.push(`tags (${tagOverlaps.slice(0, 3).join(", ")})`);
  }

  if (guide.whenToUse) {
    const wtuTokens = tokenize(guide.whenToUse);
    const wtuOverlap = tokensOverlap(queryTokens, wtuTokens);
    if (wtuOverlap.count > 0) {
      score += wtuOverlap.count * 4;
      matchReasons.push(`when-to-use (${wtuOverlap.count} words)`);
    }
  }

  const catBoostMap = CATEGORY_BOOSTS[mode] ?? {};
  const catBoost = catBoostMap[guide.category] ?? 0;
  if (catBoost > 0) {
    score += catBoost;
    matchReasons.push(`category: ${guide.category}`);
  }

  if (mode === "medical_safety" && guide.category !== "medical_safety") {
    score -= 8;
  }

  const ctBoostMap = CARDTYPE_BOOSTS[mode] ?? {};
  const ctBoost = ctBoostMap[guide.cardType] ?? 0;
  if (ctBoost > 0) {
    score += ctBoost;
    matchReasons.push(`card type: ${guide.cardType}`);
  }

  const layerBoostMap = LAYER_BOOSTS[mode] ?? {};
  const layerBoost = layerBoostMap[guide.layer] ?? 0;
  if (layerBoost > 0) {
    score += layerBoost;
    matchReasons.push(`layer: ${guide.layer}`);
  }

  const statusPenalty = CONTENT_STATUS_PENALTIES[guide.contentStatus] ?? 0;
  if (statusPenalty < 0) {
    score += statusPenalty;
    matchReasons.push(`status penalty (${guide.contentStatus})`);
  }

  if (mode === "unclear_or_unknown" && score > 25) {
    score = 25;
  }

  return { guide, score: Math.max(score, 0), matchReasons };
}

export function getGuideMatchScores(query: string): GuideMatchResult[] {
  const interpretation = interpretQuery(query);
  const mode = interpretation.primaryIntent;
  const queryTokens = tokenize(interpretation.normalizedQuery);

  return getGuidesStore().map((guide) => scoreGuide(guide, queryTokens, mode))
    .sort((a, b) => b.score - a.score);
}

export function getBestGuidesForQuery(query: string): GuideMatchResult[] {
  const interpretation = interpretQuery(query);
  const policy = getPolicy(interpretation.primaryIntent);
  const allScores = getGuideMatchScores(query);

  return allScores
    .filter((r) => r.score >= policy.minScore)
    .slice(0, policy.maxResults);
}

export function interpretAndMatchGuides(query: string): {
  interpretation: ReturnType<typeof interpretQuery>;
  matches: GuideMatchResult[];
  policy: ReturnType<typeof getPolicy>;
} {
  const interpretation = interpretQuery(query);
  const policy = getPolicy(interpretation.primaryIntent);
  const allScores = getGuideMatchScores(query);

  const matches = allScores
    .filter((r) => r.score >= policy.minScore)
    .slice(0, policy.maxResults);

  return { interpretation, matches, policy };
}

const RESPONSE_ROLE_ADJUST: Record<string, number> = {
  primary: 3,
  backup: 0,
  supporting: -3,
  reference: -8,
};

export interface ContextualMatchOptions {
  boostParentTopic?: string;
  demoteGuideId?: string;
  overrideMode?: QueryMode;
  relaxMinScore?: boolean;
  constraintTags?: string[];
  previousGuideSlug?: string;
}

export function interpretAndMatchGuidesContextual(
  query: string,
  options: ContextualMatchOptions
): {
  interpretation: ReturnType<typeof interpretQuery>;
  matches: GuideMatchResult[];
  allScores: GuideMatchResult[];
  policy: ReturnType<typeof getPolicy>;
} {
  const interpretation = interpretQuery(query);
  const effectiveMode = options.overrideMode ?? interpretation.primaryIntent;
  const policy = getPolicy(effectiveMode);
  const allScores = getGuideMatchScores(query);
  const activeConstraints = options.constraintTags ?? [];

  const contextualScores = allScores.map((result) => {
    let adjustedScore = result.score;
    const reasons = [...result.matchReasons];

    // parentTopic boost (existing)
    if (options.boostParentTopic && result.guide.parentTopic === options.boostParentTopic) {
      adjustedScore += 20;
      reasons.push(`parentTopic boost: ${options.boostParentTopic}`);
    }

    // demote previously matched guide (existing)
    if (options.demoteGuideId && result.guide.id === options.demoteGuideId) {
      adjustedScore = Math.max(adjustedScore - 30, 0);
      reasons.push("demoted: previously matched guide");
    }

    // constraint tag boost: guide is useful under these conditions
    if (activeConstraints.length > 0 && result.guide.constraintTags?.length) {
      const overlap = activeConstraints.filter((t) =>
        result.guide.constraintTags!.includes(t)
      );
      if (overlap.length > 0) {
        const boost = Math.min(overlap.length * 15, 30);
        adjustedScore += boost;
        reasons.push(`constraintTag match: ${overlap.join(", ")} (+${boost})`);
      }
    }

    // blocked-by-constraint demotion: guide is not useful under these conditions
    if (activeConstraints.length > 0 && result.guide.blockedByConstraints?.length) {
      const blocked = activeConstraints.filter((t) =>
        result.guide.blockedByConstraints!.includes(t)
      );
      if (blocked.length > 0) {
        adjustedScore = Math.max(adjustedScore - 25, 0);
        reasons.push(`blocked by constraint: ${blocked.join(", ")} (-25)`);
      }
    }

    // alternative-to boost: direct alternative to the guide the user just saw
    if (
      options.previousGuideSlug &&
      result.guide.alternativeToGuideSlugs?.includes(options.previousGuideSlug)
    ) {
      adjustedScore += 10;
      reasons.push(`alternative to: ${options.previousGuideSlug} (+10)`);
    }

    // responseRole tiebreaker (only when no active constraints to avoid fighting constraint boosts)
    if (!activeConstraints.length && result.guide.responseRole) {
      const adj = RESPONSE_ROLE_ADJUST[result.guide.responseRole] ?? 0;
      if (adj !== 0) {
        adjustedScore += adj;
        reasons.push(`role(${result.guide.responseRole}): ${adj > 0 ? "+" : ""}${adj}`);
      }
    }

    return { ...result, score: Math.max(adjustedScore, 0), matchReasons: reasons };
  });

  contextualScores.sort((a, b) => b.score - a.score);

  if (__DEV__ && activeConstraints.length > 0) {
    const winner = contextualScores[0];
    console.log(
      "[guide-matching] constraint ranking\n" +
        `  constraints: [${activeConstraints.join(", ")}]\n` +
        `  winner: "${winner?.guide.title}" (score=${winner?.score})\n` +
        `  reasons: ${winner?.matchReasons.slice(-3).join(" | ")}\n` +
        contextualScores
          .slice(0, 5)
          .map((r) => `  - ${r.guide.slug} score=${r.score} role=${r.guide.responseRole ?? "none"}`)
          .join("\n")
    );
  }

  const minScore = options.relaxMinScore
    ? Math.max(policy.minScore - 6, 4)
    : policy.minScore;

  const matches = contextualScores
    .filter((r) => r.score >= minScore)
    .slice(0, policy.maxResults);

  return {
    interpretation: { ...interpretation, primaryIntent: effectiveMode },
    matches,
    allScores: contextualScores,
    policy,
  };
}

const RELATED_ROLE_RANK: Record<string, number> = {
  backup: 4,
  supporting: 3,
  primary: 2,
  reference: 1,
};

export function getParentTopicSiblings(
  guide: Guide,
  excludeId: string,
  allGuides: Guide[]
): Guide[] {
  if (!guide.parentTopic) return [];
  return allGuides
    .filter(
      (g) =>
        g.parentTopic === guide.parentTopic &&
        g.id !== excludeId &&
        g.contentStatus !== "metadata_only"
    )
    .sort((a, b) => {
      // When the primary guide has responseRole "primary", prefer backup and supporting first
      const roleRank = (g: Guide) => RELATED_ROLE_RANK[g.responseRole ?? ""] ?? 0;
      const roleDiff = roleRank(b) - roleRank(a);
      if (roleDiff !== 0) return roleDiff;
      const statusRank = (s: string) =>
        s === "ready" ? 3 : s === "reference_summary" ? 2 : s === "needs_source_review" ? 1 : 0;
      return statusRank(b.contentStatus) - statusRank(a.contentStatus);
    });
}

export function selectRelatedGuides(
  primaryGuide: Guide,
  allScoredGuides: GuideMatchResult[],
  allGuides: Guide[],
  maxRelated = 4
): GuideMatchResult[] {
  const result: GuideMatchResult[] = [];
  const seenIds = new Set<string>([primaryGuide.id]);

  // Boost direct alternatives first (they are the most useful follow-up cards)
  if (primaryGuide.alternativeToGuideSlugs?.length) {
    for (const altSlug of primaryGuide.alternativeToGuideSlugs) {
      const alt = allGuides.find((g) => g.slug === altSlug);
      if (alt && !seenIds.has(alt.id)) {
        seenIds.add(alt.id);
        const scored = allScoredGuides.find((m) => m.guide.id === alt.id);
        result.push(scored ?? { guide: alt, score: 8, matchReasons: ["alternativeTo"] });
      }
    }
  }

  // Guides that list this primary as an alternative (reverse lookup)
  for (const g of allGuides) {
    if (result.length >= maxRelated) break;
    if (seenIds.has(g.id)) continue;
    if (g.alternativeToGuideSlugs?.includes(primaryGuide.slug)) {
      seenIds.add(g.id);
      const scored = allScoredGuides.find((m) => m.guide.id === g.id);
      result.push(scored ?? { guide: g, score: 7, matchReasons: ["reverseAlternative"] });
    }
  }

  // Siblings ranked by responseRole then contentStatus
  const siblings = getParentTopicSiblings(primaryGuide, primaryGuide.id, allGuides);
  for (const g of siblings.slice(0, 3)) {
    if (result.length >= maxRelated) break;
    if (seenIds.has(g.id)) continue;
    seenIds.add(g.id);
    const scored = allScoredGuides.find((m) => m.guide.id === g.id);
    result.push(scored ?? { guide: g, score: 5, matchReasons: ["sibling"] });
  }

  // Fill remaining from scored guides
  for (const m of allScoredGuides) {
    if (result.length >= maxRelated) break;
    if (seenIds.has(m.guide.id)) continue;
    seenIds.add(m.guide.id);
    result.push(m);
  }

  return result.slice(0, maxRelated);
}
