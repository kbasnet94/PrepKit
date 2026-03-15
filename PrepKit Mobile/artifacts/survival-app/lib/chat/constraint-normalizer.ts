const CONSTRAINT_TAG_RULES: Array<{ patterns: string[]; tags: string[] }> = [
  {
    patterns: [
      "can't boil", "cant boil", "no way to boil", "nothing to boil",
      "can't heat water", "no way to heat", "no stove", "no fire",
      "cant start a fire", "can't start a fire",
      "i don't have fire", "i dont have fire",
      "no heat source", "without fire", "without heat",
      "no way to cook", "can't cook",
    ],
    tags: ["no_boiling", "no_heat_source"],
  },
  {
    patterns: [
      "no bleach", "don't have bleach", "dont have bleach",
      "no chlorine", "no purification tablets", "no tablets", "no iodine",
      "out of bleach", "without bleach",
    ],
    tags: ["no_bleach"],
  },
  {
    patterns: [
      "no signal", "no cell", "no phone signal", "no reception",
      "no service", "can't call", "cant call",
      "no network", "no wifi", "no data", "no coverage",
    ],
    tags: ["no_signal"],
  },
  {
    patterns: [
      "in a car", "in my car", "in the car", "in a vehicle",
      "stranded in a car", "stuck in a car", "inside a car",
    ],
    tags: ["in_vehicle"],
  },
  {
    patterns: [
      "it's dark", "its dark", "getting dark", "no light",
      "can't see", "dark now", "no flashlight", "no torch",
      "pitch black", "in the dark",
    ],
    tags: ["at_night"],
  },
  {
    patterns: [
      "vomiting", "throwing up", "can't keep down",
      "keep vomiting", "keep throwing up",
    ],
    tags: ["vomiting", "getting_worse"],
  },
  {
    patterns: [
      "getting worse", "much worse", "worsening",
      "not improving", "deteriorating", "rapidly getting",
    ],
    tags: ["getting_worse"],
  },
  {
    patterns: [
      "confused", "disoriented", "not making sense",
      "can't think clearly", "can't think straight",
      "not coherent", "incoherent",
    ],
    tags: ["confused"],
  },
  {
    patterns: [
      "unconscious", "passed out", "unresponsive",
      "not responding", "won't wake", "wont wake",
      "not waking up",
    ],
    tags: ["unconscious", "getting_worse"],
  },
  {
    patterns: [
      "no shelter", "no building", "nowhere to go",
      "no structure", "no cover", "outside with nowhere",
      "without shelter",
    ],
    tags: ["no_shelter"],
  },
  {
    patterns: [
      "no clean water", "no drinking water", "no safe water",
      "no potable water", "water is contaminated",
    ],
    tags: ["no_clean_water"],
  },
  {
    patterns: [
      "no water", "out of water", "no more water",
      "run out of water", "without water",
    ],
    tags: ["no_water"],
  },
  {
    patterns: [
      "no power", "no electricity", "power's out", "power out",
      "no heating", "blackout", "power cut", "power failure",
      "without power", "without electricity",
    ],
    tags: ["no_power"],
  },
  {
    patterns: [
      "can't move", "cant move", "can't walk", "can't stand",
      "immobile", "stuck here", "unable to move", "can't evacuate",
    ],
    tags: ["cant_move"],
  },
  {
    patterns: [
      "pregnant", "i'm pregnant", "im pregnant", "she's pregnant",
    ],
    tags: ["pregnant"],
  },
  {
    patterns: [
      "child", "kid", "baby", "infant", "toddler",
      "young child", "my child", "my kid", "children",
    ],
    tags: ["child"],
  },
  {
    patterns: [
      "alone", "by myself", "no one with me",
      "no one around", "on my own", "by myself",
    ],
    tags: ["alone"],
  },
];

export function normalizeConstraintTags(message: string): string[] {
  const q = message.toLowerCase().trim();
  const tags = new Set<string>();

  for (const rule of CONSTRAINT_TAG_RULES) {
    if (rule.patterns.some((p) => q.includes(p))) {
      rule.tags.forEach((t) => tags.add(t));
    }
  }

  return Array.from(tags);
}
