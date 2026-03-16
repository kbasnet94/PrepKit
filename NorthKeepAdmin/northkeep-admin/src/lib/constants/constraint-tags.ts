/**
 * Canonical allowed constraint-tag registry.
 * ASCII snake_case only. Unknown tags are invalid unless explicitly added here.
 * Used by: admin form validation, import validation, backfill validation.
 */

export const ALLOWED_CONSTRAINT_TAGS = [
  "no_boiling",
  "no_fire",
  "no_heat_source",
  "no_bleach",
  "no_tablets",
  "no_filter",
  "no_signal",
  "in_vehicle",
  "at_night",
  "child",
  "pregnant",
  "cant_move",
  "no_shelter",
  "no_clean_water",
  "no_water",
  "no_power",
  "vomiting",
  "getting_worse",
  "alone",
  "confused",
  "unconscious",
] as const;

export type AllowedConstraintTag = (typeof ALLOWED_CONSTRAINT_TAGS)[number];

const TAG_SET = new Set<string>(ALLOWED_CONSTRAINT_TAGS);

/** Check if a tag is in the allowed registry */
export function isAllowedConstraintTag(tag: string): tag is AllowedConstraintTag {
  return typeof tag === "string" && TAG_SET.has(tag);
}

/** Validate an array of tags; returns { valid: string[], invalid: string[] } */
export function validateConstraintTags(tags: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const t of tags) {
    const s = typeof t === "string" ? t.trim() : "";
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    if (isAllowedConstraintTag(s)) valid.push(s);
    else invalid.push(s);
  }
  return { valid, invalid };
}

/** Get all allowed tags (for dropdowns, autocomplete) */
export function getAllowedConstraintTags(): readonly string[] {
  return ALLOWED_CONSTRAINT_TAGS;
}
