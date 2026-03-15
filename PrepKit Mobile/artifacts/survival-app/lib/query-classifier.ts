export type QueryMode =
  | "emergency_urgent"
  | "practical_how_to"
  | "educational_background"
  | "inventory_related"
  | "preparedness_planning";

const EMERGENCY_PATTERNS = [
  /\b(emergency|urgent|now|immediately|right now|help|sos|stranded|lost|injured|bleeding|dying|survival|critical)\b/i,
  /\b(no (matches|lighter|fire|water|food|shelter|signal))\b/i,
  /\b(without (matches|lighter|tools|equipment|gear|gps))\b/i,
  /\b(how do i (survive|escape|get out|signal|start a fire|find water|build|make))\b/i,
  /\b(i (am|need|have|can't|cannot|don't have))\b/i,
];

const PRACTICAL_HOW_TO_PATTERNS = [
  /\b(how (to|do|can|should)|what('s| is) the (best|way)|steps? (to|for)|method(s?) (for|to))\b/i,
  /\b(teach me|show me|explain how|walk me through|guide me|instructions? for)\b/i,
  /\b(build|make|start|create|find|purify|filter|tie|signal|navigate|treat|splint|wrap)\b/i,
  /\b(technique|skill|trick|tip(s?)|approach|procedure|process)\b/i,
  /\b(can i|should i|which is better|what works|what should)\b/i,
];

const EDUCATIONAL_PATTERNS = [
  /\b(what is|what are|why (is|does|do)|tell me about|explain|describe|history of|origin of)\b/i,
  /\b(background|context|information about|learn about|understand|difference between)\b/i,
  /\b(when was|who invented|where does|how does it work|science of|biology of|chemistry of)\b/i,
];

const INVENTORY_PATTERNS = [
  /\b(kit|bag|pack|gear|supply|supplies|item(s?)|stock|checklist|inventory|stored?)\b/i,
  /\b(what (do i|should i) (have|bring|pack|carry|store)|what('s| is) in my)\b/i,
  /\b(expired?|expiry|condition|quantity|how many|do i have)\b/i,
  /\b(72.hour|bug.out|go.bag|first aid kit|emergency kit)\b/i,
];

const PREPAREDNESS_PATTERNS = [
  /\b(prepare|preparation|plan(ning)?|ready|readiness|before|in case of|if (there is|a) (disaster|emergency|earthquake|flood|hurricane|storm))\b/i,
  /\b(should i (prepare|plan|stock|buy|get)|how (much|many) (should|do) i (have|store|keep))\b/i,
  /\b(disaster|earthquake|hurricane|tornado|flood|wildfire|pandemic|power outage|grid (down|failure))\b/i,
  /\b(long.term|72.hour|bug.out|evacuation|evac|prepper|prepping)\b/i,
];

export function classifyQuery(query: string): QueryMode {
  const q = query.toLowerCase();

  let scores: Record<QueryMode, number> = {
    emergency_urgent: 0,
    practical_how_to: 0,
    educational_background: 0,
    inventory_related: 0,
    preparedness_planning: 0,
  };

  for (const pattern of EMERGENCY_PATTERNS) {
    if (pattern.test(q)) scores.emergency_urgent += 2;
  }
  for (const pattern of PRACTICAL_HOW_TO_PATTERNS) {
    if (pattern.test(q)) scores.practical_how_to += 1;
  }
  for (const pattern of EDUCATIONAL_PATTERNS) {
    if (pattern.test(q)) scores.educational_background += 1;
  }
  for (const pattern of INVENTORY_PATTERNS) {
    if (pattern.test(q)) scores.inventory_related += 2;
  }
  for (const pattern of PREPAREDNESS_PATTERNS) {
    if (pattern.test(q)) scores.preparedness_planning += 1;
  }

  if (scores.emergency_urgent >= 2) return "emergency_urgent";

  const top = (Object.entries(scores) as [QueryMode, number][]).sort((a, b) => b[1] - a[1]);
  if (top[0][1] === 0) return "practical_how_to";
  return top[0][0];
}

export function getModeLabel(mode: QueryMode): string {
  switch (mode) {
    case "emergency_urgent": return "Emergency";
    case "practical_how_to": return "How-To";
    case "educational_background": return "Reference";
    case "inventory_related": return "Inventory";
    case "preparedness_planning": return "Planning";
  }
}

export function getModeColor(mode: QueryMode): string {
  switch (mode) {
    case "emergency_urgent": return "#C0392B";
    case "practical_how_to": return "#2D6A4F";
    case "educational_background": return "#5D6D7E";
    case "inventory_related": return "#8E6B3E";
    case "preparedness_planning": return "#1A5276";
  }
}
