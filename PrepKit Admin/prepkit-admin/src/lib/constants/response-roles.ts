/**
 * Canonical allowed response roles for guide metadata.
 */

export const VALID_RESPONSE_ROLES = ["primary", "backup", "supporting", "reference"] as const;

export type ResponseRole = (typeof VALID_RESPONSE_ROLES)[number];

const ROLE_SET = new Set<string>(VALID_RESPONSE_ROLES);

export function isValidResponseRole(value: string | null | undefined): value is ResponseRole {
  return typeof value === "string" && ROLE_SET.has(value);
}
