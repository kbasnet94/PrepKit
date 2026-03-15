import type { QueryMode } from "./query-types";

export type ResponseTemplateType =
  | "practical"
  | "medical"
  | "preparedness"
  | "educational"
  | "cautious";

export interface StructuredAnswerSection {
  id: string;
  label: string;
  content: string | string[];
  emphasis?: "normal" | "important" | "warning";
}

export interface StructuredAnswerSource {
  guideId: string;
  guideTitle: string;
  sectionHints?: string[];
}

export interface StructuredAnswer {
  query: string;
  mode: QueryMode;
  templateType: ResponseTemplateType;
  title: string;
  summary?: string;
  sections: StructuredAnswerSection[];
  warnings: string[];
  sources: StructuredAnswerSource[];
  confidence: "high" | "medium" | "low";
  strictSafetyMode: boolean;
}
