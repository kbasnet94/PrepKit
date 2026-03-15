import type { AIService } from "./ai-service";
import type { AIRewriteInput } from "./types";
import type { StructuredAnswer, StructuredAnswerSection } from "../guides/response-types";

function getText(section: StructuredAnswerSection): string {
  if (typeof section.content === "string") return section.content;
  return section.content.join("\n");
}

function getList(section: StructuredAnswerSection): string[] {
  if (typeof section.content === "string") return [section.content];
  return section.content;
}

function findSection(answer: StructuredAnswer, id: string): StructuredAnswerSection | undefined {
  return answer.sections.find((s) => s.id === id);
}

function synthPractical(answer: StructuredAnswer): string {
  const parts: string[] = [];

  const quick = findSection(answer, "quick-answer");
  const preferred = findSection(answer, "preferred-method");
  const backup = findSection(answer, "backup-method");
  const steps = findSection(answer, "steps");
  const warnings = findSection(answer, "warnings");

  if (quick) {
    parts.push(getText(quick));
  }

  if (preferred) {
    parts.push(`Best approach: ${getText(preferred)}`);
  }
  if (backup) {
    parts.push(`If that's not available: ${getText(backup)}`);
  }

  if (steps) {
    const list = getList(steps);
    const numbered = list.map((s, i) => `${i + 1}. ${s}`).join("\n");
    parts.push(`Steps:\n${numbered}`);
  }

  if (warnings) {
    const list = getList(warnings);
    if (list.length === 1) {
      parts.push(`⚠ ${list[0]}`);
    } else {
      parts.push(`⚠ Important:\n${list.map((w) => `• ${w}`).join("\n")}`);
    }
  }

  return parts.join("\n\n");
}

function synthMedical(answer: StructuredAnswer): string {
  const parts: string[] = [];

  parts.push("⚠ FIELD USE ONLY — Seek professional medical help as soon as it is accessible.");

  const immediate = findSection(answer, "immediate-priority");
  const canDo = findSection(answer, "what-you-can-do");
  const redFlags = findSection(answer, "red-flags");
  const notToDo = findSection(answer, "what-not-to-do");

  if (immediate) {
    parts.push(`Immediate priority: ${getText(immediate)}`);
  }

  if (canDo) {
    const list = getList(canDo);
    const numbered = list.map((s, i) => `${i + 1}. ${s}`).join("\n");
    parts.push(`What you can safely do right now:\n${numbered}`);
  }

  if (redFlags) {
    const list = getList(redFlags);
    parts.push(`Red flags — seek urgent help if:\n${list.map((f) => `• ${f}`).join("\n")}`);
  }

  if (notToDo) {
    const list = getList(notToDo);
    parts.push(`Do not:\n${list.map((f) => `• ${f}`).join("\n")}`);
  }

  return parts.join("\n\n");
}

function synthPreparedness(answer: StructuredAnswer): string {
  const parts: string[] = [];

  const goal = findSection(answer, "goal");
  const priorities = findSection(answer, "priorities");
  const checklist = findSection(answer, "checklist");
  const gaps = findSection(answer, "gaps");

  if (goal) {
    parts.push(getText(goal));
  }

  if (priorities) {
    const list = getList(priorities);
    parts.push(`Start with these priorities:\n${list.map((p) => `• ${p}`).join("\n")}`);
  }

  if (checklist) {
    const list = getList(checklist);
    const numbered = list.map((s, i) => `${i + 1}. ${s}`).join("\n");
    parts.push(`Full checklist:\n${numbered}`);
  }

  if (gaps) {
    const list = getList(gaps);
    if (list.length > 0) {
      parts.push(`Watch out for:\n${list.map((g) => `• ${g}`).join("\n")}`);
    }
  }

  return parts.join("\n\n");
}

function synthEducational(answer: StructuredAnswer): string {
  const parts: string[] = [];

  const explanation = findSection(answer, "short-explanation");
  const concepts = findSection(answer, "key-concepts");
  const relevance = findSection(answer, "practical-relevance");

  if (explanation) {
    parts.push(getText(explanation));
  }

  if (concepts) {
    const content = concepts.content;
    if (typeof content === "string") {
      parts.push(content);
    } else {
      parts.push(content.map((c) => `• ${c}`).join("\n"));
    }
  }

  if (relevance) {
    parts.push(getText(relevance));
  }

  return parts.join("\n\n");
}

function synthCautious(answer: StructuredAnswer): string {
  const parts: string[] = [];

  const understanding = findSection(answer, "best-understanding");
  const canSay = findSection(answer, "what-we-can-say");
  const missing = findSection(answer, "what-may-be-missing");

  if (understanding) parts.push(getText(understanding));
  if (canSay) parts.push(getText(canSay));
  if (missing) parts.push(`Note: ${getText(missing)}`);

  return parts.join("\n\n");
}

function synthesize(input: AIRewriteInput): string {
  const { structuredAnswer } = input;

  let body: string;
  switch (structuredAnswer.templateType) {
    case "practical":
      body = synthPractical(structuredAnswer);
      break;
    case "medical":
      body = synthMedical(structuredAnswer);
      break;
    case "preparedness":
      body = synthPreparedness(structuredAnswer);
      break;
    case "educational":
      body = synthEducational(structuredAnswer);
      break;
    case "cautious":
    default:
      body = synthCautious(structuredAnswer);
      break;
  }

  if (
    structuredAnswer.strictSafetyMode &&
    !body.includes("FIELD USE ONLY") &&
    !body.includes("professional medical")
  ) {
    body += "\n\n⚠ Field use only. Seek professional medical help as soon as possible.";
  }

  return body.trim();
}

export class MockAIService implements AIService {
  readonly serviceId = "mock-v1";

  isAvailable(): boolean {
    return true;
  }

  async rewriteStructuredAnswer(input: AIRewriteInput): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(synthesize(input)), 200);
    });
  }
}

let _instance: MockAIService | null = null;

export function getMockAIService(): MockAIService {
  if (!_instance) _instance = new MockAIService();
  return _instance;
}
