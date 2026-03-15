import { buildStructuredAnswer, buildStructuredAnswerFromContext } from "../guides/structured-answer-builder";
import { buildGuideGroundingContext } from "../guides/grounding-context";
import type { GroundingContext } from "../guides/query-types";
import { getMockAIService } from "./mock-ai-service";
import { buildCompactGroundingText, buildRewriteInstruction } from "./prompt-builder";
import type { AIEnhancedAnswer, AIRewriteMode } from "./types";

function fallbackRewrittenText(answer: ReturnType<typeof buildStructuredAnswer>): string {
  const lines: string[] = [];
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
  return lines.join("\n").trim();
}

export async function buildAIEnhancedAnswer(
  query: string,
  mode: AIRewriteMode
): Promise<AIEnhancedAnswer> {
  const structuredAnswer = buildStructuredAnswer(query);

  if (mode === "off") {
    return {
      query,
      rewrittenText: fallbackRewrittenText(structuredAnswer),
      structuredAnswer,
      usedAI: false,
      aiAvailability: "unknown",
      fallbackReason: "AI rewrite is disabled",
      sources: structuredAnswer.sources,
      strictSafetyMode: structuredAnswer.strictSafetyMode,
    };
  }

  const service = getMockAIService();
  const available = await service.isAvailable();

  if (!available) {
    return {
      query,
      rewrittenText: fallbackRewrittenText(structuredAnswer),
      structuredAnswer,
      usedAI: false,
      aiAvailability: "unavailable",
      fallbackReason: "AI service is not available on this device",
      sources: structuredAnswer.sources,
      strictSafetyMode: structuredAnswer.strictSafetyMode,
    };
  }

  const ctx = buildGuideGroundingContext(query);
  const groundingContextText = buildCompactGroundingText(ctx);
  const rewriteInstruction = buildRewriteInstruction(
    structuredAnswer.mode,
    structuredAnswer.strictSafetyMode
  );

  try {
    const rewrittenText = await service.rewriteStructuredAnswer({
      query,
      structuredAnswer,
      groundingContextText,
      rewriteInstruction,
      strictSafetyMode: structuredAnswer.strictSafetyMode,
    });

    return {
      query,
      rewrittenText,
      structuredAnswer,
      usedAI: true,
      aiAvailability: "available",
      sources: structuredAnswer.sources,
      strictSafetyMode: structuredAnswer.strictSafetyMode,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "unknown error";
    return {
      query,
      rewrittenText: fallbackRewrittenText(structuredAnswer),
      structuredAnswer,
      usedAI: false,
      aiAvailability: "unavailable",
      fallbackReason: `AI error: ${msg}`,
      sources: structuredAnswer.sources,
      strictSafetyMode: structuredAnswer.strictSafetyMode,
    };
  }
}

export async function buildAIEnhancedAnswerFromContext(
  ctx: GroundingContext,
  mode: AIRewriteMode
): Promise<AIEnhancedAnswer> {
  const query = ctx.query;
  const structuredAnswer = buildStructuredAnswerFromContext(ctx);

  if (mode === "off") {
    return {
      query,
      rewrittenText: fallbackRewrittenText(structuredAnswer),
      structuredAnswer,
      usedAI: false,
      aiAvailability: "unknown",
      fallbackReason: "AI rewrite is disabled",
      sources: structuredAnswer.sources,
      strictSafetyMode: structuredAnswer.strictSafetyMode,
    };
  }

  const service = getMockAIService();
  const available = await service.isAvailable();

  if (!available) {
    return {
      query,
      rewrittenText: fallbackRewrittenText(structuredAnswer),
      structuredAnswer,
      usedAI: false,
      aiAvailability: "unavailable",
      fallbackReason: "AI service is not available on this device",
      sources: structuredAnswer.sources,
      strictSafetyMode: structuredAnswer.strictSafetyMode,
    };
  }

  const groundingContextText = buildCompactGroundingText(ctx);
  const rewriteInstruction = buildRewriteInstruction(
    structuredAnswer.mode,
    structuredAnswer.strictSafetyMode
  );

  try {
    const rewrittenText = await service.rewriteStructuredAnswer({
      query,
      structuredAnswer,
      groundingContextText,
      rewriteInstruction,
      strictSafetyMode: structuredAnswer.strictSafetyMode,
    });

    return {
      query,
      rewrittenText,
      structuredAnswer,
      usedAI: true,
      aiAvailability: "available",
      sources: structuredAnswer.sources,
      strictSafetyMode: structuredAnswer.strictSafetyMode,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "unknown error";
    return {
      query,
      rewrittenText: fallbackRewrittenText(structuredAnswer),
      structuredAnswer,
      usedAI: false,
      aiAvailability: "unavailable",
      fallbackReason: `AI error: ${msg}`,
      sources: structuredAnswer.sources,
      strictSafetyMode: structuredAnswer.strictSafetyMode,
    };
  }
}
