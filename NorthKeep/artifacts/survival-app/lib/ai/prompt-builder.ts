import type { QueryMode, GroundingContext } from "../guides/query-types";
import type { StructuredAnswer, StructuredAnswerSection } from "../guides/response-types";

export function buildRewriteInstruction(mode: QueryMode, strictSafetyMode: boolean): string {
  const base = strictSafetyMode
    ? "STRICT SAFETY MODE: Do not introduce any guidance beyond what the structured answer contains. Do not add invasive procedures. Preserve all red flags and warnings exactly. Do not expand into novel medical advice.\n\n"
    : "";

  switch (mode) {
    case "emergency_urgent":
    case "practical_how_to":
      return (
        base +
        "Rewrite as concise, action-first prose. Lead with the direct answer. " +
        "State the preferred method, then the backup. Present steps as a numbered list. " +
        "End with warnings. No background or history. Easy to scan in seconds."
      );

    case "medical_safety":
      return (
        base +
        "Rewrite as conservative, safety-focused prose. Lead with the immediate priority. " +
        "List what the person can safely do right now. Then clearly state red flags that need urgent help. " +
        "End with a 'Do not' list. Do not provide invasive procedural instructions. " +
        "Preserve the field-use-only disclaimer."
      );

    case "preparedness_planning":
      return (
        base +
        "Rewrite in a planning and checklist tone. State the goal first. " +
        "List top priorities, then the full checklist. Flag gaps and warnings. " +
        "Organised, practical, and complete."
      );

    case "educational_background":
      return (
        base +
        "Rewrite as a clear, concise explanation. One paragraph for the overview, " +
        "then key concepts, then practical relevance. Accessible but accurate."
      );

    case "unclear_or_unknown":
    default:
      return (
        base +
        "Rewrite with uncertainty clearly stated. Summarise what can be said safely. " +
        "Be transparent about the limitations of the match. Keep claims conservative."
      );
  }
}

function sectionText(section: StructuredAnswerSection): string {
  if (typeof section.content === "string") return section.content;
  return section.content.join("\n");
}

export function buildCompactAnswerText(answer: StructuredAnswer): string {
  const lines: string[] = [`[${answer.templateType.toUpperCase()} — ${answer.mode}]`, `Guide: ${answer.title}`, ""];

  for (const section of answer.sections) {
    lines.push(`${section.label}:`);
    if (typeof section.content === "string") {
      lines.push(section.content);
    } else {
      section.content.forEach((item, i) => {
        const prefix = section.id === "steps" ? `${i + 1}.` : "•";
        lines.push(`  ${prefix} ${item}`);
      });
    }
    lines.push("");
  }

  if (answer.sources.length > 0) {
    lines.push("Sources: " + answer.sources.map((s) => s.guideTitle).join(", "));
  }

  return lines.join("\n").trim();
}

export function buildCompactGroundingText(ctx: GroundingContext): string {
  const lines: string[] = [
    `Mode: ${ctx.interpretation.primaryIntent}`,
    `Risk: ${ctx.interpretation.riskLevel} | Urgency: ${ctx.interpretation.urgencyLevel}`,
  ];

  if (ctx.topGuides.length > 0) {
    lines.push("Top guides:");
    ctx.topGuides.slice(0, 2).forEach((m) => {
      lines.push(`  • ${m.guide.title} (score: ${m.score})`);
    });
  }

  if (ctx.warnings.length > 0) {
    lines.push("Warnings: " + ctx.warnings.join("; "));
  }

  return lines.join("\n");
}
