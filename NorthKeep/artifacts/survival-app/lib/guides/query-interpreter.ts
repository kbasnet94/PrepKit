import type { QueryInterpretation, QueryMode, AnswerStyle } from "./query-types";

const EMERGENCY_PHRASES = [
  "right now", "happening now", "is happening", "currently happening",
  "i am bleeding", "i'm bleeding", "we are bleeding",
  "won't stop bleeding", "cant stop bleeding",
  "help me", "need help now", "need help immediately",
  "i am lost", "i'm lost", "we are lost", "got lost",
  "stranded", "i am stranded", "i'm stranded",
  "trapped", "i am trapped", "i'm trapped",
  "can't breathe", "cant breathe", "not breathing", "stopped breathing",
  "unconscious", "passed out",
  "sos", "mayday", "rescue me", "need rescue",
  "emergency", "urgent",
];

const EMERGENCY_DISASTER_COMBOS: [string, string[]][] = [
  ["earthquake", ["is happening", "occurring", "right now", "started", "hit", "struck"]],
  ["flood", ["is rising", "rising", "flooding", "flooded", "right now", "everywhere"]],
  ["tornado", ["is coming", "touching down", "touched down", "spotted", "warning"]],
  ["fire", ["is spreading", "out of control", "surrounding", "i see smoke", "my house"]],
];

const MEDICAL_KEYWORDS = [
  "stitch", "suture", "sew wound", "wound", "laceration", "slash",
  "severe bleeding", "stop bleeding", "bleeding won't stop",
  "infection", "infected", "red streaks", "pus", "abscess",
  "hypothermia", "frostbite",
  "dehydration", "heat exhaustion", "heat stroke",
  "cpr", "cardiac", "heart attack", "chest compression",
  "broken bone", "fracture", "sprain", "burn",
  "recognize hypothermia", "recognize dehydration",
  "warning signs", "signs of infection",
  "symptoms", "medical", "first aid", "treat a", "treatment",
];

const MEDICAL_BODY_PHRASES = [
  "my cut", "my wound", "my leg", "my arm", "my hand", "my foot",
  "i cut myself", "i cut my", "i hurt", "i injured",
  "someone is", "they are", "he is", "she is",
];

const PRACTICAL_PHRASES = [
  "how do i", "how to", "how can i", "show me how",
  "best way to", "steps to", "steps for", "what's the best",
  "what is the best way", "technique for", "method for",
];

const PRACTICAL_KEYWORDS = [
  "build", "make", "start a fire", "create", "construct", "set up", "rig",
  "purify", "filter water", "boil water", "disinfect",
  "navigate", "find direction", "find north",
  "signal for", "signal rescue",
  "tie", "knot", "lash", "cordage",
  "shelter", "tarp", "lean-to", "bivouac",
];

const PREPAREDNESS_PHRASES = [
  "should i pack", "what to bring", "what to pack",
  "emergency kit", "go bag", "go-bag", "bug out bag", "bug-out bag",
  "72 hour kit", "72-hour kit",
  "prepare for", "preparing for", "how to prepare",
  "plan for", "planning for", "get ready for",
  "before a disaster", "before an earthquake",
  "family emergency plan", "evacuation plan",
  "what do i need to survive", "what should i have ready",
  "what to stockpile",
];

const PREPAREDNESS_KEYWORDS = [
  "kit", "pack", "bag", "supplies", "stockpile", "checklist",
  "prepare", "preparation", "readiness", "evacuate", "evacuation",
];

const EDUCATIONAL_PHRASES = [
  "what causes", "why does", "why do", "how does",
  "what is a", "what are", "explain", "tell me about",
  "what happens when", "learn about", "information on",
  "background on", "history of", "science of",
  "what makes", "why is it",
];

const EDUCATIONAL_KEYWORDS = [
  "science", "geology", "meteorology", "physics", "biology",
  "theory", "study", "research",
];

type ModeScores = Record<QueryMode, number>;

function scoreAllModes(q: string): ModeScores {
  const scores: ModeScores = {
    emergency_urgent: 0,
    medical_safety: 0,
    practical_how_to: 0,
    preparedness_planning: 0,
    educational_background: 0,
    unclear_or_unknown: 2,
  };

  for (const phrase of EMERGENCY_PHRASES) {
    if (q.includes(phrase)) scores.emergency_urgent += 12;
  }
  for (const [dk, combos] of EMERGENCY_DISASTER_COMBOS) {
    if (q.includes(dk)) {
      for (const combo of combos) {
        if (q.includes(combo)) {
          scores.emergency_urgent += 15;
          break;
        }
      }
    }
  }

  for (const kw of MEDICAL_KEYWORDS) {
    if (q.includes(kw)) scores.medical_safety += 8;
  }
  for (const phrase of MEDICAL_BODY_PHRASES) {
    if (q.includes(phrase)) scores.medical_safety += 5;
  }

  for (const phrase of PRACTICAL_PHRASES) {
    if (q.includes(phrase)) scores.practical_how_to += 10;
  }
  for (const kw of PRACTICAL_KEYWORDS) {
    if (q.includes(kw)) scores.practical_how_to += 6;
  }

  for (const phrase of PREPAREDNESS_PHRASES) {
    if (q.includes(phrase)) scores.preparedness_planning += 10;
  }
  for (const kw of PREPAREDNESS_KEYWORDS) {
    if (q.includes(kw)) scores.preparedness_planning += 4;
  }

  for (const phrase of EDUCATIONAL_PHRASES) {
    if (q.includes(phrase)) scores.educational_background += 10;
  }
  for (const kw of EDUCATIONAL_KEYWORDS) {
    if (q.includes(kw)) scores.educational_background += 6;
  }

  return scores;
}

function pickMode(scores: ModeScores): { primary: QueryMode; secondary: QueryMode[] } {
  const entries = Object.entries(scores) as [QueryMode, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const [top, second] = entries;

  const primary: QueryMode = top[1] > 2 ? top[0] : "unclear_or_unknown";
  const secondary: QueryMode[] = entries
    .slice(1)
    .filter(([m, s]) => s > 2 && m !== "unclear_or_unknown")
    .map(([m]) => m);

  return { primary, secondary };
}

function calcConfidence(scores: ModeScores, primary: QueryMode): "high" | "medium" | "low" {
  const topScore = scores[primary];
  const otherScores = Object.entries(scores)
    .filter(([m]) => m !== primary)
    .map(([, s]) => s);
  const secondBest = Math.max(...otherScores, 0);

  if (primary === "unclear_or_unknown") return "low";
  if (topScore >= 15 && secondBest <= topScore * 0.5) return "high";
  if (topScore >= 8 && secondBest <= topScore * 0.7) return "medium";
  return "low";
}

function calcRisk(primary: QueryMode, q: string): "low" | "medium" | "high" {
  if (primary === "emergency_urgent") return "high";
  if (primary === "medical_safety") return "high";
  if (primary === "practical_how_to") {
    const disasterKeywords = ["earthquake", "flood", "tornado", "hurricane", "wildfire"];
    if (disasterKeywords.some((k) => q.includes(k))) return "medium";
    const injuryKeywords = ["cut", "wound", "bleeding", "burn", "fracture"];
    if (injuryKeywords.some((k) => q.includes(k))) return "medium";
    return "low";
  }
  return "low";
}

function calcUrgency(primary: QueryMode, q: string): "low" | "medium" | "high" {
  if (primary === "emergency_urgent") return "high";
  const nowKeywords = ["right now", "immediately", "urgent", "currently", "happening"];
  if (nowKeywords.some((k) => q.includes(k))) return "high";
  if (primary === "medical_safety") {
    const severeKeywords = ["won't stop", "severe", "unconscious", "not breathing"];
    return severeKeywords.some((k) => q.includes(k)) ? "high" : "medium";
  }
  if (primary === "practical_how_to") return "low";
  return "low";
}

const ANSWER_STYLES: Record<QueryMode, AnswerStyle> = {
  emergency_urgent: "immediate_action",
  medical_safety: "medical_conservative",
  practical_how_to: "step_by_step",
  preparedness_planning: "checklist",
  educational_background: "explanation",
  unclear_or_unknown: "broad_cautious",
};

function extractKeywords(q: string): string[] {
  const allPatterns = [
    ...EMERGENCY_PHRASES,
    ...MEDICAL_KEYWORDS,
    ...MEDICAL_BODY_PHRASES,
    ...PRACTICAL_PHRASES,
    ...PRACTICAL_KEYWORDS,
    ...PREPAREDNESS_PHRASES,
    ...PREPAREDNESS_KEYWORDS,
    ...EDUCATIONAL_PHRASES,
    ...EDUCATIONAL_KEYWORDS,
  ];
  const found: string[] = [];
  for (const p of allPatterns) {
    if (q.includes(p) && !found.includes(p)) found.push(p);
  }
  return found.slice(0, 8);
}

export function interpretQuery(rawQuery: string): QueryInterpretation {
  const normalizedQuery = rawQuery.trim().toLowerCase();
  const scores = scoreAllModes(normalizedQuery);
  const { primary, secondary } = pickMode(scores);
  const confidence = calcConfidence(scores, primary);
  const riskLevel = calcRisk(primary, normalizedQuery);
  const urgencyLevel = calcUrgency(primary, normalizedQuery);
  const detectedKeywords = extractKeywords(normalizedQuery);

  const isMedical = primary === "medical_safety";
  const isHighUrgency = urgencyLevel === "high";
  const hasBodyKeywords = MEDICAL_BODY_PHRASES.some((p) => normalizedQuery.includes(p));
  const shouldUseStrictSafetyMode = isMedical || (isHighUrgency && hasBodyKeywords);

  return {
    normalizedQuery,
    primaryIntent: primary,
    secondaryIntents: secondary,
    riskLevel,
    urgencyLevel,
    answerStyle: ANSWER_STYLES[primary],
    shouldUseStrictSafetyMode,
    confidence,
    detectedKeywords,
  };
}
