import type { GuideResponseRole } from "./types";

export interface GuideAnnotation {
  responseRole?: GuideResponseRole;
  constraintTags?: string[];
  blockedByConstraints?: string[];
  alternativeToGuideSlugs?: string[];
}

export const GUIDE_ANNOTATIONS: Record<string, GuideAnnotation> = {

  // ── Safe Drinking Water in Emergencies ──────────────────────────────────────
  "purify-water-boiling": {
    responseRole: "primary",
    blockedByConstraints: ["no_boiling", "no_fire", "no_heat_source"],
  },
  "purifying-water-with-household-liquid-bleach": {
    responseRole: "backup",
    constraintTags: ["no_boiling", "no_fire", "no_heat_source"],
    blockedByConstraints: ["no_bleach"],
    alternativeToGuideSlugs: ["purify-water-boiling"],
  },
  "purify-water-bleach": {
    responseRole: "backup",
    constraintTags: ["no_boiling", "no_fire", "no_heat_source"],
    blockedByConstraints: ["no_bleach"],
    alternativeToGuideSlugs: ["purify-water-boiling"],
  },
  "choosing-safe-hydration-sources": {
    responseRole: "supporting",
    constraintTags: ["no_boiling", "no_bleach", "no_clean_water"],
  },
  "using-non-drinking-water-safely": {
    responseRole: "supporting",
    constraintTags: ["no_clean_water"],
  },
  "when-treated-water-is-still-unsafe-to-drink": {
    responseRole: "supporting",
  },
  "emergency-water-storage-at-home": {
    responseRole: "reference",
  },
  "water-purification-reference": {
    responseRole: "reference",
  },
  "solar-still": {
    responseRole: "supporting",
    constraintTags: ["no_boiling", "no_bleach", "no_clean_water"],
  },

  // ── Food Safety During Power Outages ────────────────────────────────────────
  "refrigerator-safety-during-outages": {
    responseRole: "primary",
    constraintTags: ["no_power"],
  },
  "freezer-safety-during-outages": {
    responseRole: "primary",
    constraintTags: ["no_power"],
  },
  "deciding-when-to-throw-away-food-after-an-outage": {
    responseRole: "primary",
    constraintTags: ["no_power"],
  },
  "safe-food-handling-when-water-is-limited": {
    responseRole: "backup",
    constraintTags: ["no_clean_water", "no_water"],
  },
  "food-preservation": {
    responseRole: "reference",
  },
  "food-safety-no-fridge": {
    responseRole: "reference",
  },

  // ── Heat and Fluids ─────────────────────────────────────────────────────────
  "heat-stroke-emergency": {
    responseRole: "primary",
    constraintTags: ["vomiting", "getting_worse", "confused", "unconscious"],
  },
  "heat-exhaustion-cool-rehydrate": {
    responseRole: "primary",
  },
  "dehydration-signs-and-immediate-care": {
    responseRole: "backup",
    constraintTags: ["vomiting", "getting_worse"],
    alternativeToGuideSlugs: ["heat-exhaustion-cool-rehydrate"],
  },
  "dehydration-reference": {
    responseRole: "reference",
  },

  // ── Extreme Heat: Prevention and Emergencies ────────────────────────────────
  "heat-prevention": {
    responseRole: "primary",
  },
  "everyday-extreme-heat-precautions": {
    responseRole: "primary",
  },
  "working-or-exercising-safely-in-high-heat": {
    responseRole: "supporting",
  },

  // ── Cold Exposure ───────────────────────────────────────────────────────────
  "hypothermia-warm-core": {
    responseRole: "primary",
  },
  "frostbite-protect-rewarm": {
    responseRole: "primary",
  },
  "hypothermia-reference": {
    responseRole: "reference",
  },

  // ── Cold Exposure, Hypothermia, and Frostbite ───────────────────────────────
  "staying-warm-and-dry-in-cold-weather": {
    responseRole: "primary",
  },
  "cold-wet-exposure-rain-wind-and-chill": {
    responseRole: "supporting",
  },

  // ── If You Get Lost ─────────────────────────────────────────────────────────
  "lost-on-land-first-30-minutes": {
    responseRole: "primary",
  },
  "stay-put-vs-move-land": {
    responseRole: "primary",
    constraintTags: ["in_vehicle"],
    alternativeToGuideSlugs: ["lost-on-land-first-30-minutes"],
  },
  "stay-put-vs-move": {
    responseRole: "reference",
  },

  // ── Land Rescue Signaling ───────────────────────────────────────────────────
  "whistle-distress-signals-land": {
    responseRole: "primary",
    blockedByConstraints: ["no_signal"],
  },
  "mirror-and-light-signaling-land-day-and-night": {
    responseRole: "primary",
    constraintTags: ["at_night"],
  },
  "night-signaling-and-battery": {
    responseRole: "backup",
    constraintTags: ["at_night"],
    alternativeToGuideSlugs: ["mirror-and-light-signaling-land-day-and-night"],
  },
  "maximizing-rescue-visibility-land": {
    responseRole: "supporting",
  },
  "signal-for-rescue": {
    responseRole: "supporting",
  },
  "ground-to-air-symbols-for-aircraft": {
    responseRole: "supporting",
  },
  "distress-signaling": {
    responseRole: "reference",
  },
  "morse-code": {
    responseRole: "reference",
  },

  // ── Wildfire: Evacuation and Smoke Safety ───────────────────────────────────
  "wildfire-evacuate-early": {
    responseRole: "primary",
    blockedByConstraints: ["cant_move"],
  },
  "wildfire-smoke-protection": {
    responseRole: "backup",
    constraintTags: ["no_shelter", "cant_move"],
  },
  "wildfire-return-home": {
    responseRole: "supporting",
  },

  // ── Air Quality, Smoke, Dust, and Ash ──────────────────────────────────────
  "using-aqi-and-basic-smoke-air-quality-precautions": {
    responseRole: "primary",
  },
  "dust-ash-and-airborne-irritants-after-storms-eruptions-or-collapses": {
    responseRole: "supporting",
  },

  // ── Carbon Monoxide Safety ──────────────────────────────────────────────────
  "carbon-monoxide-basics-and-symptoms": {
    responseRole: "primary",
  },
  "preventing-co-poisoning-during-outages": {
    responseRole: "backup",
    constraintTags: ["no_power"],
  },

  // ── Generator Safety ────────────────────────────────────────────────────────
  "safe-placement-and-operation-of-portable-generators": {
    responseRole: "primary",
  },
  "powering-appliances-safely-with-a-generator": {
    responseRole: "supporting",
  },
  "apartment-and-multi-unit-housing-generator-safety": {
    responseRole: "backup",
  },

  // ── Emergency Shelter Basics ────────────────────────────────────────────────
  "choosing-a-safe-spot-for-emergency-shelter": {
    responseRole: "primary",
  },
  "simple-no-tools-emergency-shelter-inside-buildings": {
    responseRole: "backup",
    constraintTags: ["no_shelter"],
  },
  "shelter-building": {
    responseRole: "supporting",
  },

  // ── Staying Warm Without Power or Heat ──────────────────────────────────────
  "staying-warm-in-a-cold-home-without-power": {
    responseRole: "primary",
    constraintTags: ["no_power"],
  },
  "layering-clothing-and-bedding-for-maximum-warmth": {
    responseRole: "supporting",
  },
  "keeping-children-elderly-and-frail-adults-warm-safely": {
    responseRole: "supporting",
    constraintTags: ["child", "pregnant"],
  },
};
