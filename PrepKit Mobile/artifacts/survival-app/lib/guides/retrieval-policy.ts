import type { QueryMode, RetrievalPolicy } from "./query-types";

const POLICIES: Record<QueryMode, RetrievalPolicy> = {
  emergency_urgent: {
    mode: "emergency_urgent",
    maxResults: 3,
    minScore: 8,
    strictMode: false,
    preferredCategories: ["natural_disasters", "weather_environment", "medical_safety", "communication"],
    preferredCardTypes: ["practical", "medical_safety", "checklist"],
    description:
      "Prioritize action cards first, then scenario guides. Surface the most directly relevant field-action content for the emergency.",
  },
  medical_safety: {
    mode: "medical_safety",
    maxResults: 2,
    minScore: 12,
    strictMode: true,
    preferredCategories: ["medical_safety"],
    preferredCardTypes: ["medical_safety", "practical"],
    description:
      "Strictly prioritize medical-safety guides. Apply conservative matching. Fewer, more accurate results are better than broad results.",
  },
  practical_how_to: {
    mode: "practical_how_to",
    maxResults: 3,
    minScore: 8,
    strictMode: false,
    preferredCategories: ["core_skills", "water_food", "navigation", "communication", "natural_disasters"],
    preferredCardTypes: ["practical", "checklist"],
    description:
      "Prioritize action-oriented guides with clear steps. Match on the specific skill being asked about.",
  },
  preparedness_planning: {
    mode: "preparedness_planning",
    maxResults: 3,
    minScore: 6,
    strictMode: false,
    preferredCategories: ["preparedness", "natural_disasters"],
    preferredCardTypes: ["checklist", "practical"],
    description:
      "Prioritize checklist-format and planning guides. Broader matches are acceptable.",
  },
  educational_background: {
    mode: "educational_background",
    maxResults: 3,
    minScore: 5,
    strictMode: false,
    preferredCategories: [
      "natural_disasters",
      "weather_environment",
      "core_skills",
      "water_food",
      "navigation",
      "communication",
      "medical_safety",
      "preparedness",
    ],
    preferredCardTypes: ["practical", "reference_summary", "checklist", "medical_safety"],
    description:
      "Allow broader matches. Reference guides and explanatory content are appropriate. Confidence may be lower.",
  },
  unclear_or_unknown: {
    mode: "unclear_or_unknown",
    maxResults: 2,
    minScore: 10,
    strictMode: false,
    preferredCategories: [
      "core_skills",
      "natural_disasters",
      "medical_safety",
      "preparedness",
      "water_food",
      "navigation",
      "communication",
      "weather_environment",
    ],
    preferredCardTypes: ["practical", "medical_safety", "checklist", "reference_summary"],
    description:
      "Cautious broad retrieval. Return fewer results with higher minimum score. Do not surface weakly related content.",
  },
};

export function getPolicy(mode: QueryMode): RetrievalPolicy {
  return POLICIES[mode];
}

export function getAllPolicies(): Record<QueryMode, RetrievalPolicy> {
  return POLICIES;
}
