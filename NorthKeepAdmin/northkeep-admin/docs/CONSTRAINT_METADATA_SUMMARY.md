# Constraint-Aware Metadata — Developer Summary

## Overview

The Supabase guide model and admin dashboard now support constraint-aware guide relationship metadata, aligned with Replit local annotations. These fields enable smarter ranking and alternative suggestions in the mobile app.

## Tables Changed

- **guide_versions** (only table modified)

## Columns Added

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `response_role` | text | yes | — | `primary`, `backup`, `supporting`, or `reference` (CHECK constraint) |
| `constraint_tags` | jsonb | no | `[]` | Situations where this guide should be boosted |
| `blocked_by_constraints` | jsonb | no | `[]` | Situations where this guide should be demoted |
| `alternative_to_guide_slugs` | jsonb | no | `[]` | Direct alternatives when another guide's method is unavailable |

## Import/Export Support

- **JSON Import** (`/guides/import`): Reads `responseRole`, `constraintTags`, `blockedByConstraints`, `alternativeToGuideSlugs` if present. Backward compatible if absent.
- **Release bundle** (`/api/releases/[id]/generate`): Includes these fields in the exported JSON when non-empty.

## Where to Edit in Admin

- **Guide detail → Edit tab** → "Constraint-aware metadata" card:
  - Response role (dropdown)
  - Constraint tags (tag input)
  - Blocked by constraints (tag input)
  - Alternative to guide slugs (slug tag input)

## List/Detail Views

- **Guide Library**: Response role filter added. Type column unchanged.
- **Guide detail header**: Response role badge when set.
- **Guide preview**: Response role badge + "Constraint metadata" section (boost when, demote when, alternative to).

## Canonical Constraint Tags

See `src/lib/constants/constraint-tags.ts`. Only tags in the registry are valid. Unknown tags are rejected in admin and filtered during import/backfill. To add tags, edit that file.

## Backfill / Update Workflow

**Script**: `scripts/backfill-constraint-metadata.ts`

```bash
npm run backfill-constraint-metadata [path] [--dry-run]
# Default path: data/constraint_metadata_patch.json
```

**Behavior**:
- Matches guides by `slug`
- Updates **only** the latest version of each guide
- Updates **only** these four fields; does not overwrite other content
- Validates tags and response roles; filters invalid
- Reports: updated, skipped, not found, invalid tags, invalid roles, broken alternative refs

**JSON format**:
```json
{
  "guides": [
    {
      "slug": "guide-slug-here",
      "responseRole": "primary",
      "constraintTags": ["no-power", "outdoors"],
      "blockedByConstraints": ["indoors-only"],
      "alternativeToGuideSlugs": ["other-guide-slug"]
    }
  ]
}
```

Or a bare array of such objects.

## Assumptions

- Existing schema: `guides` (identity) + `guide_versions` (versioned content). New fields live in `guide_versions` to follow versioning.
- Existing data: All new columns nullable or default `[]`; no data loss.
- RLS: No policy changes; existing policies apply.
