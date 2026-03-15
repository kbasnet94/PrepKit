# Constraint Metadata Sync — Replit to Supabase

## Overview

Sync constraint-aware metadata from Replit local exports into Supabase. The backfill updates **only** these four fields on the **latest version** of each guide, without overwriting other content.

## Field Meanings

| Field | Meaning |
|-------|---------|
| `responseRole` | Role within parent topic cluster: `primary`, `backup`, `supporting`, `reference` |
| `constraintTags` | Situations where this guide becomes more relevant (boost) |
| `blockedByConstraints` | Situations where this guide should be demoted or hidden |
| `alternativeToGuideSlugs` | Direct alternatives when another guide's method is unavailable |

## Canonical Allowed Constraint Tags

Only these tags are valid. Unknown tags are rejected in the admin form and filtered during import/backfill.

- `no_boiling`
- `no_fire`
- `no_heat_source`
- `no_bleach`
- `no_signal`
- `in_vehicle`
- `at_night`
- `child`
- `pregnant`
- `cant_move`
- `no_shelter`
- `no_clean_water`
- `no_power`
- `vomiting`
- `getting_worse`
- `alone`
- `confused`
- `unconscious`

**Registry location**: `src/lib/constants/constraint-tags.ts`

## How to Add New Tags

1. Edit `src/lib/constants/constraint-tags.ts`
2. Add the new tag to the `ALLOWED_CONSTRAINT_TAGS` array (ASCII snake_case only)
3. Deploy; admin form, import, and backfill will accept the new tag

## Running the Backfill Safely

### 1. Place the export file

Put `constraint_metadata_patch.json` (or your export) in `data/`:

```
prepkit-admin/
  data/
    constraint_metadata_patch.json
```

Or use any path when invoking the script.

### 2. Dry run first

```bash
cd prepkit-admin
npm run backfill-constraint-metadata -- --dry-run
# Or with explicit path:
npx tsx scripts/backfill-constraint-metadata.ts data/constraint_metadata_patch.json --dry-run
```

This prints what would be updated without writing to the database.

### 3. Apply the update

```bash
npm run backfill-constraint-metadata
# Or:
npx tsx scripts/backfill-constraint-metadata.ts data/constraint_metadata_patch.json
```

### 4. Review the summary

The script reports:

- **Updated**: Guides whose latest version was updated
- **Skipped**: No metadata or no version
- **Not found**: Slugs in JSON that don't exist in Supabase
- **Invalid tags**: Tags not in the registry (filtered out)
- **Invalid response roles**: Non-allowed values (filtered out)
- **Broken alternative refs**: `alternativeToGuideSlugs` pointing to non-existent guides

## JSON Format

```json
{
  "guides": [
    {
      "slug": "guide-slug-here",
      "responseRole": "primary",
      "constraintTags": ["no_power", "at_night"],
      "blockedByConstraints": ["no_fire"],
      "alternativeToGuideSlugs": ["other-guide-slug"]
    }
  ]
}
```

Or a bare array of such objects.

## What Was Synced from Replit

Constraint metadata annotated in Replit local can be exported as JSON and synced into Supabase using this backfill. The script matches guides by `slug`, updates only the latest version, and updates only these four metadata fields. Normal guide content (steps, warnings, sources, etc.) is never overwritten.
