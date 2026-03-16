import { Platform } from "react-native";
import { getDatabase } from "./database";
import { classifyQuery, QueryMode } from "./query-classifier";
import { searchActionCards, ActionCard } from "./action-cards";
import { GUIDE_MAP } from "./knowledge-data";

export interface AICapability {
  available: boolean;
  method: "navigator-ml" | "chrome-ai" | "apple-fm" | "fallback";
  message: string;
}

export interface RetrievedChunk {
  sourceTitle: string;
  sectionTitle: string;
  text: string;
  intentTag: "quick_answer" | "practical_steps" | "checklist" | "warning" | "background" | "history" | "theory" | "reference";
  score: number;
}

export interface KnowledgeContext {
  actionCards: ActionCard[];
  chunks: RetrievedChunk[];
  mode: QueryMode;
}

const PRACTICAL_SECTION_WORDS = [
  "method", "methods", "technique", "techniques", "how to", "steps", "step-by-step",
  "procedure", "procedures", "instruction", "instructions", "tips", "tip", "quick",
  "guide", "practical", "application", "use", "usage", "warning", "warnings",
  "caution", "danger", "safety", "preparation", "prepare", "treatment", "treat",
  "emergency", "first aid", "skill", "skills", "basic", "basics",
];

const DEPRIORITISED_SECTION_WORDS = [
  "history", "historical", "archaeology", "archaeological", "origin", "origins",
  "etymology", "culture", "cultural", "ancient", "prehistoric", "evolution",
  "background", "context", "theory", "theoretical", "research", "studies", "study",
  "science", "scientific", "academic", "literature", "bibliography", "references",
  "see also", "further reading", "gallery", "notes", "footnote",
];

function tagSection(heading: string, text: string): RetrievedChunk["intentTag"] {
  const h = heading.toLowerCase();
  const t = text.toLowerCase();

  if (DEPRIORITISED_SECTION_WORDS.some((w) => h.includes(w))) return "history";
  if (h.includes("warning") || h.includes("caution") || h.includes("danger") || h.includes("safety")) return "warning";
  if (h.includes("quick") || h.includes("summary") || h.includes("overview")) return "quick_answer";
  if (PRACTICAL_SECTION_WORDS.some((w) => h.includes(w))) return "practical_steps";
  if (h.includes("list") || h.includes("checklist") || h.includes("types") || h.includes("options")) return "checklist";

  const practicalSignals = ["step", "first", "second", "then", "next", "finally", "use a", "place the", "apply", "tie", "light", "boil", "filter", "dig", "find"];
  const practicalCount = practicalSignals.filter((w) => t.includes(w)).length;
  if (practicalCount >= 3) return "practical_steps";

  if (DEPRIORITISED_SECTION_WORDS.some((w) => t.includes(w) && t.indexOf(w) < 100)) return "background";
  return "reference";
}

function scoreChunk(chunk: RetrievedChunk, keywords: string[], mode: QueryMode): number {
  let score = chunk.score;

  const isEmergencyMode = mode === "emergency_urgent" || mode === "practical_how_to";

  if (isEmergencyMode) {
    switch (chunk.intentTag) {
      case "quick_answer": score += 8; break;
      case "practical_steps": score += 6; break;
      case "checklist": score += 5; break;
      case "warning": score += 4; break;
      case "reference": score += 1; break;
      case "background": score -= 3; break;
      case "history": score -= 6; break;
      case "theory": score -= 4; break;
    }

    const heading = chunk.sectionTitle.toLowerCase();
    if (PRACTICAL_SECTION_WORDS.some((w) => heading.includes(w))) score += 4;
    if (DEPRIORITISED_SECTION_WORDS.some((w) => heading.includes(w))) score -= 8;
  } else {
    switch (chunk.intentTag) {
      case "background": score += 2; break;
      case "history": score += 1; break;
      case "theory": score += 1; break;
      case "reference": score += 2; break;
      default: score += 1; break;
    }
  }

  return score;
}

function splitIntoSections(content: string, articleTitle: string): Array<{ heading: string; text: string }> {
  const sections: Array<{ heading: string; text: string }> = [];

  const lines = content.split("\n");
  let currentHeading = articleTitle;
  let currentLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isHeading =
      (trimmed.length < 80 && trimmed === trimmed.toUpperCase() && trimmed.length > 3) ||
      /^(==+)\s*.+\s*\1$/.test(trimmed) ||
      /^[A-Z][A-Za-z\s]{3,50}$/.test(trimmed) && currentLines.length > 5;

    if (isHeading && currentLines.length > 20) {
      sections.push({ heading: currentHeading, text: currentLines.join(" ").trim() });
      currentHeading = trimmed.replace(/^==+\s*|\s*==+$/g, "").trim();
      currentLines = [];
    } else {
      currentLines.push(trimmed);
    }
  }

  if (currentLines.length > 10) {
    sections.push({ heading: currentHeading, text: currentLines.join(" ").trim() });
  }

  if (sections.length <= 1 && content.length > 800) {
    const chunkSize = 600;
    const words = content.split(/\s+/);
    const chunks: Array<{ heading: string; text: string }> = [];
    for (let i = 0; i < words.length; i += Math.floor(chunkSize / 6)) {
      chunks.push({
        heading: i === 0 ? articleTitle : `${articleTitle} (cont.)`,
        text: words.slice(i, i + Math.floor(chunkSize / 6)).join(" "),
      });
    }
    return chunks.filter((c) => c.text.length > 50);
  }

  return sections.filter((s) => s.text.length > 50);
}

async function checkNavigatorML(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  try {
    const ml = (navigator as any).ml;
    if (ml && typeof ml.createTextSession === "function") return true;
  } catch {}
  return false;
}

async function checkWindowAI(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const ai = (window as any).ai;
    if (ai?.languageModel) {
      const capabilities = await ai.languageModel.capabilities();
      return capabilities.available === "readily" || capabilities.available === "after-download";
    }
  } catch {}
  return false;
}

function checkAppleFoundationModels(): boolean {
  if (Platform.OS !== "ios") return false;
  try {
    const fm = (globalThis as any).AppleFoundationModels;
    if (fm && typeof fm.generate === "function") return true;
  } catch {}
  return false;
}

export async function checkAICapability(): Promise<AICapability> {
  if (await checkNavigatorML()) {
    return { available: true, method: "navigator-ml", message: "On-device AI ready (navigator.ml)" };
  }
  if (await checkWindowAI()) {
    return { available: true, method: "chrome-ai", message: "On-device AI ready (Gemini Nano)" };
  }
  if (checkAppleFoundationModels()) {
    return { available: true, method: "apple-fm", message: "On-device AI ready (Apple Intelligence)" };
  }
  return {
    available: false,
    method: "fallback",
    message: "Using offline knowledge base. Download guides from the Knowledge tab for richer answers.",
  };
}

export async function retrieveKnowledgeContext(query: string): Promise<KnowledgeContext> {
  const mode = classifyQuery(query);
  const actionCards = searchActionCards(query, 2);

  const db = await getDatabase();
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 8);

  if (keywords.length === 0) return { actionCards, chunks: [], mode };

  const articles = await db.getAllAsync<{ id: string; title: string; content: string }>(
    "SELECT id, title, content FROM knowledge_articles WHERE downloaded = 1 AND content IS NOT NULL"
  );

  const isEmergencyOrPractical = mode === "emergency_urgent" || mode === "practical_how_to";
  const allChunks: RetrievedChunk[] = [];

  for (const article of articles) {
    const guide = GUIDE_MAP[article.id];

    if (guide?.preferredUse === "reference_only" && isEmergencyOrPractical) continue;

    const sections = splitIntoSections(article.content || "", article.title);

    for (const section of sections) {
      const textLower = (section.heading + " " + section.text).toLowerCase();
      let rawScore = 0;

      for (const kw of keywords) {
        const titleHits = section.heading.toLowerCase().split(kw).length - 1;
        rawScore += titleHits * 3;
        const textHits = textLower.split(kw).length - 1;
        rawScore += Math.min(textHits, 5);
      }

      if (rawScore === 0) continue;

      if (guide) {
        if (guide.contentType === "practical_reference" && isEmergencyOrPractical) rawScore += 4;
        if (guide.contentType === "background_reference" && isEmergencyOrPractical) rawScore -= 4;
        if (guide.preferredUse === "action_card_source" && isEmergencyOrPractical) rawScore += 2;
        if (guide.contentType === "medical_reference" && mode !== "emergency_urgent") rawScore -= 2;
      }

      const intentTag = tagSection(section.heading, section.text);
      const chunk: RetrievedChunk = {
        sourceTitle: article.title,
        sectionTitle: section.heading === article.title ? "Overview" : section.heading,
        text: section.text.substring(0, 500).trim(),
        intentTag,
        score: rawScore,
      };

      chunk.score = scoreChunk(chunk, keywords, mode);
      if (chunk.score > 0) allChunks.push(chunk);
    }
  }

  allChunks.sort((a, b) => b.score - a.score);
  const topChunks = allChunks.slice(0, 3);

  return { actionCards, chunks: topChunks, mode };
}

function buildFallbackResponse(query: string, context: KnowledgeContext): { text: string; sources: SourceRef[] } {
  const { actionCards, chunks, mode } = context;
  const isEmergency = mode === "emergency_urgent" || mode === "practical_how_to";
  const sources: SourceRef[] = [];
  let text = "";

  if (actionCards.length > 0) {
    const card = actionCards[0];
    const cardSourceGuides = card.sourceGuideIds
      .map((id) => GUIDE_MAP[id]?.title)
      .filter(Boolean) as string[];
    sources.push({ title: "Quick Guide", section: card.title });
    for (const guideTitle of cardSourceGuides) {
      sources.push({ title: guideTitle, section: "Reference" });
    }

    if (card.riskLevel === "high") {
      text += `⚠ **Medical/Safety Notice:** This guidance is for emergency field use only. Seek professional medical help as soon as possible.\n\n`;
    }

    if (isEmergency) {
      text += `**${card.title}**\n\n`;
      text += `${card.summary}\n\n`;
      text += `**When to use:** ${card.whenToUse}\n\n`;
      text += `**Best option:** ${card.bestOption}\n\n`;
      if (card.backupOption) text += `**Backup option:** ${card.backupOption}\n\n`;
      if (card.steps.length > 0) {
        text += `**Steps:**\n`;
        card.steps.forEach((s, i) => { text += `${i + 1}. ${s}\n`; });
        text += "\n";
      }
      if (card.warnings.length > 0) {
        text += `**Warnings:**\n`;
        card.warnings.forEach((w) => { text += `⚠ ${w}\n`; });
      }
    } else {
      text += `**${card.title}**\n\n${card.summary}\n\n${card.bestOption}`;
      if (card.steps.length > 0) {
        text += `\n\n**Steps:**\n`;
        card.steps.forEach((s, i) => { text += `${i + 1}. ${s}\n`; });
      }
    }

    if (actionCards.length > 1) {
      const card2 = actionCards[1];
      sources.push({ title: "Quick Guide", section: card2.title });
      text += `\n\n---\n\n**Also relevant — ${card2.title}:**\n${card2.summary}\n${card2.bestOption}`;
    }
  }

  if (chunks.length > 0) {
    if (text) text += "\n\n---\n\n";

    if (isEmergency) {
      const practicalChunks = chunks.filter((c) =>
        c.intentTag === "practical_steps" || c.intentTag === "quick_answer" || c.intentTag === "checklist" || c.intentTag === "warning"
      );
      const usedChunks = practicalChunks.length > 0 ? practicalChunks : chunks;

      if (usedChunks.length > 0) {
        text += `**From your downloaded guides:**\n\n`;
        for (const chunk of usedChunks.slice(0, 2)) {
          sources.push({ title: chunk.sourceTitle, section: chunk.sectionTitle });
          text += `**${chunk.sourceTitle} › ${chunk.sectionTitle}:**\n${chunk.text}\n\n`;
        }
      }
    } else {
      text += `**From your downloaded guides:**\n\n`;
      for (const chunk of chunks.slice(0, 2)) {
        sources.push({ title: chunk.sourceTitle, section: chunk.sectionTitle });
        text += `**${chunk.sourceTitle} › ${chunk.sectionTitle}:**\n${chunk.text}\n\n`;
      }
    }
  }

  if (!text) {
    text = `I don't have strong local guidance for that specific question.\n\nFor best results:\n1. Download relevant survival guides from the Knowledge tab\n2. Ask about: fire making, water purification, shelter, first aid, food foraging, navigation, signaling, or knots\n\nOnce you have guides downloaded, I can search them to give you section-specific answers.`;
  }

  return { text, sources };
}

export interface SourceRef {
  title: string;
  section: string;
}

function buildOnDeviceSystemPrompt(context: KnowledgeContext, mode: QueryMode): string {
  const isEmergency = mode === "emergency_urgent" || mode === "practical_how_to";

  let prompt = `You are NorthKeep, an offline survival and emergency preparedness assistant. Your job is to give practical, actionable guidance.\n\n`;

  if (isEmergency) {
    prompt += `RESPONSE MODE: EMERGENCY/PRACTICAL\n`;
    prompt += `Rules:\n`;
    prompt += `- Lead with the direct answer immediately\n`;
    prompt += `- Use numbered steps for procedures\n`;
    prompt += `- Include the best option and a backup option\n`;
    prompt += `- Always include relevant warnings\n`;
    prompt += `- Be concise — omit history, background, and archaeology\n`;
    prompt += `- Never dump raw excerpts. Synthesize the information.\n\n`;
  } else if (mode === "educational_background") {
    prompt += `RESPONSE MODE: EDUCATIONAL\n`;
    prompt += `Rules:\n`;
    prompt += `- Provide context and explanation\n`;
    prompt += `- Historical background is appropriate here\n`;
    prompt += `- Be thorough but clear\n\n`;
  } else {
    prompt += `Rules:\n- Be practical and helpful\n- Use clear structure\n\n`;
  }

  if (context.actionCards.length > 0) {
    prompt += `CURATED QUICK REFERENCE:\n`;
    for (const card of context.actionCards) {
      prompt += `\n[${card.title}]\n`;
      prompt += `Best option: ${card.bestOption}\n`;
      prompt += `Backup: ${card.backupOption}\n`;
      prompt += `Steps: ${card.steps.slice(0, 4).join(" | ")}\n`;
      prompt += `Warnings: ${card.warnings.slice(0, 2).join(" | ")}\n`;
    }
    prompt += "\n";
  }

  if (context.chunks.length > 0) {
    const relevantChunks = isEmergency
      ? context.chunks.filter((c) => c.intentTag !== "history" && c.intentTag !== "background" && c.intentTag !== "theory")
      : context.chunks;

    if (relevantChunks.length > 0) {
      prompt += `DOWNLOADED REFERENCE SECTIONS:\n`;
      for (const chunk of relevantChunks) {
        prompt += `\n[${chunk.sourceTitle} › ${chunk.sectionTitle}]\n${chunk.text}\n`;
      }
    }
  }

  return prompt;
}

async function generateWithNavigatorML(
  userMessage: string,
  conversationHistory: { role: string; content: string }[],
  context: KnowledgeContext
): Promise<string> {
  const ml = (navigator as any).ml;
  const systemPrompt = buildOnDeviceSystemPrompt(context, context.mode);
  const session = await ml.createTextSession({ systemPrompt });

  const msgs = conversationHistory.slice(-6);
  let prompt = msgs.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
  prompt += `\nUser: ${userMessage}`;

  const result = await session.prompt(prompt);
  session.destroy();
  return result;
}

async function generateWithChromeAI(
  userMessage: string,
  conversationHistory: { role: string; content: string }[],
  context: KnowledgeContext
): Promise<string> {
  const ai = (window as any).ai;
  const systemPrompt = buildOnDeviceSystemPrompt(context, context.mode);
  const session = await ai.languageModel.create({ systemPrompt });

  const msgs = conversationHistory.slice(-6);
  let prompt = msgs.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
  prompt += `\nUser: ${userMessage}`;

  const result = await session.prompt(prompt);
  session.destroy();
  return result;
}

async function generateWithAppleFM(
  userMessage: string,
  context: KnowledgeContext
): Promise<string> {
  const fm = (globalThis as any).AppleFoundationModels;
  const systemPrompt = buildOnDeviceSystemPrompt(context, context.mode);
  const result = await fm.generate({ prompt: userMessage, systemPrompt });
  return result.text || "I couldn't generate a response. Please try again.";
}

export async function generateAIResponse(
  userMessage: string,
  conversationHistory: { role: string; content: string }[],
  _legacyContext: { title: string; excerpt: string }[]
): Promise<{ text: string; sources: SourceRef[]; mode: QueryMode }> {
  const context = await retrieveKnowledgeContext(userMessage);
  const capability = await checkAICapability();

  if (!capability.available) {
    const { text, sources } = buildFallbackResponse(userMessage, context);
    return { text, sources, mode: context.mode };
  }

  try {
    let text: string;
    switch (capability.method) {
      case "navigator-ml":
        text = await generateWithNavigatorML(userMessage, conversationHistory, context);
        break;
      case "chrome-ai":
        text = await generateWithChromeAI(userMessage, conversationHistory, context);
        break;
      case "apple-fm":
        text = await generateWithAppleFM(userMessage, context);
        break;
      default:
        text = "Unexpected AI method. Please restart the app.";
    }

    const sources: SourceRef[] = [
      ...context.actionCards.map((c) => ({ title: "NorthKeep Quick Guide", section: c.title })),
      ...context.chunks
        .filter((c) => c.intentTag !== "history" && c.intentTag !== "background")
        .slice(0, 3)
        .map((c) => ({ title: c.sourceTitle, section: c.sectionTitle })),
    ];

    return { text, sources, mode: context.mode };
  } catch (error: any) {
    const { text, sources } = buildFallbackResponse(userMessage, context);
    return { text: text + `\n\n_(AI error: ${error?.message || "unknown"}. Showing offline knowledge instead.)_`, sources, mode: context.mode };
  }
}
