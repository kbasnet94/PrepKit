import type { QueryMode } from "./query-types";
import type { ResponseTemplateType } from "./response-types";

const TEMPLATE_MAP: Record<QueryMode, ResponseTemplateType> = {
  practical_how_to: "practical",
  emergency_urgent: "practical",
  medical_safety: "medical",
  preparedness_planning: "preparedness",
  educational_background: "educational",
  unclear_or_unknown: "cautious",
};

export interface ResponseTemplate {
  type: ResponseTemplateType;
  sectionLabels: Record<string, string>;
  description: string;
}

const TEMPLATES: Record<ResponseTemplateType, ResponseTemplate> = {
  practical: {
    type: "practical",
    sectionLabels: {
      "quick-answer": "Quick Answer",
      "preferred-method": "Preferred Method",
      "backup-method": "Backup Option",
      steps: "Steps",
      warnings: "Warnings",
    },
    description: "Action-oriented with preferred method, backup, and numbered steps.",
  },
  medical: {
    type: "medical",
    sectionLabels: {
      "immediate-priority": "Immediate Priority",
      "red-flags": "Red Flags — When to Seek Urgent Help",
      "what-you-can-do": "What You Can Do Right Now",
      "what-not-to-do": "What Not To Do",
    },
    description: "Conservative safety-first response prioritising escalation cues and safe field actions.",
  },
  preparedness: {
    type: "preparedness",
    sectionLabels: {
      goal: "Goal",
      priorities: "Recommended Priorities",
      checklist: "Full Checklist",
      gaps: "Warnings and Gaps",
    },
    description: "Planning-focused checklist response.",
  },
  educational: {
    type: "educational",
    sectionLabels: {
      "short-explanation": "Short Explanation",
      "key-concepts": "Key Concepts",
      "practical-relevance": "Practical Relevance",
    },
    description: "Explanatory overview of the topic with practical implications.",
  },
  cautious: {
    type: "cautious",
    sectionLabels: {
      "best-understanding": "Best Understanding of Your Question",
      "what-we-can-say": "What We Can Say Safely",
      "what-may-be-missing": "What May Be Missing",
    },
    description: "Cautious broad response used when intent is unclear.",
  },
};

export function getTemplateForMode(mode: QueryMode): ResponseTemplate {
  return TEMPLATES[TEMPLATE_MAP[mode]];
}

export function getTemplateTypeForMode(mode: QueryMode): ResponseTemplateType {
  return TEMPLATE_MAP[mode];
}
