---
name: northkeep-tool-backfill
description: >
  One-time skill to populate the normalized tools database from all existing guides.
  Scans every published guide version in Supabase, extracts tools using the tool extractor
  rules, deduplicates into canonical tool rows, and creates all join table entries.
  Run this once after deploying the normalized_tools migration.
---

# NorthKeep Tool Backfill

You are performing a one-time migration to populate the normalized `tools` and `guide_version_tools` tables from all existing published guides in Supabase. This runs once after the `20260321000000_normalized_tools.sql` migration has been applied.

## Prerequisites

- The `tools` and `guide_version_tools` tables exist in Supabase (migration applied)
- Access to Supabase (via the admin app's Supabase client or direct API)
- The tool extractor skill rules in `skills/northkeep-tool-extractor/SKILL.md` (for extraction logic)

## Process

### Phase 1: Fetch all published guide versions

Query Supabase for all guide versions that are part of the latest published release:

```sql
SELECT gv.id as version_id, gv.title, gv.summary, gv.quick_answer,
       gv.preferred_action, gv.backup_action,
       gv.step_by_step_actions, gv.warnings, gv.what_not_to_do,
       gv.red_flags, gv.preparedness_tips,
       gv.layer, gv.guide_type,
       g.slug
FROM guide_versions gv
JOIN guide_release_items gri ON gri.guide_version_id = gv.id
JOIN guide_releases gr ON gr.id = gri.release_id
JOIN guides g ON g.id = gv.guide_id
WHERE gr.status = 'published'
ORDER BY g.slug
```

If no published release exists, fall back to fetching the latest version per guide:

```sql
SELECT DISTINCT ON (gv.guide_id)
       gv.id as version_id, gv.title, gv.summary, gv.quick_answer,
       gv.preferred_action, gv.backup_action,
       gv.step_by_step_actions, gv.warnings, gv.what_not_to_do,
       gv.red_flags, gv.preparedness_tips,
       gv.layer, gv.guide_type,
       g.slug
FROM guide_versions gv
JOIN guides g ON g.id = gv.guide_id
WHERE g.is_active = true
ORDER BY gv.guide_id, gv.version_number DESC
```

### Phase 2: Extract tools from each guide

For each guide version, apply the extraction rules from the tool extractor skill:

1. Read the content fields: `stepByStepActions`, `preferredAction`, `backupAction`, `preparednessTips`, `warnings`, `summary`
2. Identify physical tools/equipment (INCLUDE list)
3. Filter out excluded items (EXCLUDE list)
4. Normalize to canonical names
5. Assign category, optional flag, and context
6. Collect into a tools list per guide

### Phase 3: Deduplicate into canonical tools

Across ALL guides, build a single canonical tool registry:

1. Collect every extracted tool name from every guide
2. Group by name similarity — if two guides mention "Knife" and "Fixed-blade knife", these should be ONE canonical tool named "Knife"
3. For each canonical tool, determine:
   - `name`: The most common or most general form
   - `category`: The most frequently assigned category (or the most logical one)
   - `description`: A single guide-independent sentence describing the tool

**Deduplication rules:**
- Case-insensitive matching ("Paracord" = "paracord")
- Singular/plural matching ("Bandage" = "Bandages")
- Specificity: prefer the more general name ("Knife" over "Fixed-blade knife") unless the specific variant is genuinely different
- Parenthetical variants: "Fire starter (matches or lighter)" should be split into "Matches" and "Lighter" as separate tools

### Phase 4: Insert canonical tools

For each unique canonical tool:

```sql
INSERT INTO tools (name, category, description)
VALUES ($1, $2, $3)
ON CONFLICT (name) DO NOTHING
RETURNING id
```

### Phase 5: Create join table entries

For each guide-tool relationship:

```sql
INSERT INTO guide_version_tools (guide_version_id, tool_id, optional, context, sort_order)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (guide_version_id, tool_id) DO NOTHING
```

### Phase 6: Generate backfill report

Save a report to the working directory as `tool-backfill-report.json`:

```json
{
  "backfilledAt": "ISO timestamp",
  "guidesScanned": 187,
  "guidesWithTools": 142,
  "guidesWithNoTools": 45,
  "canonicalToolsCreated": 78,
  "joinRowsCreated": 534,
  "tools": [
    {
      "name": "Knife",
      "category": "Cutting",
      "description": "A fixed or folding blade used for cutting, carving, and general utility tasks",
      "usedByGuides": ["build-debris-shelter", "make-improvised-splint", "..."],
      "guideCount": 23
    }
  ],
  "guideDetails": [
    {
      "slug": "build-debris-shelter",
      "versionId": "uuid",
      "toolCount": 5,
      "tools": ["Knife", "Paracord", "Tarp", "Emergency blanket", "Duct tape"]
    }
  ],
  "noToolGuides": ["cpr-basics", "recognize-heat-stroke", "..."]
}
```

## Important notes

- **Run this once.** After the backfill, all future tools come through the pipeline's tool extractor skill.
- **Do not delete the old `tools` JSONB column** from `guide_versions` yet — that cleanup happens in a separate migration after the mobile app is updated to read from the join tables.
- **Process guides in batches** to avoid overwhelming the Supabase API. Process 10-20 guides at a time with brief pauses.
- **Log progress** as you go — if interrupted, the `ON CONFLICT DO NOTHING` clauses make this idempotent and safe to re-run.

## Verification

After the backfill, verify with these queries:

```sql
-- Total canonical tools
SELECT COUNT(*) FROM tools;

-- Total guide-tool links
SELECT COUNT(*) FROM guide_version_tools;

-- Guides with the most tools
SELECT g.slug, COUNT(gvt.id) as tool_count
FROM guide_version_tools gvt
JOIN guide_versions gv ON gv.id = gvt.guide_version_id
JOIN guides g ON g.id = gv.guide_id
GROUP BY g.slug
ORDER BY tool_count DESC
LIMIT 10;

-- Most common tools across guides
SELECT t.name, t.category, COUNT(gvt.id) as guide_count
FROM tools t
JOIN guide_version_tools gvt ON gvt.tool_id = t.id
GROUP BY t.id, t.name, t.category
ORDER BY guide_count DESC
LIMIT 20;
```
