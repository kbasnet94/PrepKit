# NorthKeep Title Simplifier Skill

## Purpose

Scan active guide titles for length, structural redundancy, or clarity issues. Propose simplified versions. Apply admin-approved renames atomically to both `guides.title` and the latest active `guide_versions.title`.

## When to Use

- During the Planning step, when the planner identifies titles worth simplifying
- On request ("simplify guide titles", "review guide naming", "clean up titles")
- After consolidation runs, when a survivor guide may have inherited a verbose name

## Process

### Step 1 — Pull active guide titles

Query Supabase for all active guides with their current published title:

```sql
SELECT g.id AS guide_id, g.slug, gv.id AS version_id, gv.title, gv.version_number
FROM guides g
JOIN guide_versions gv ON gv.id = g.current_published_version_id
WHERE g.is_active = true
ORDER BY g.slug;
```

If `current_published_version_id` is null for any guide, fall back to the latest non-archived version:

```sql
SELECT DISTINCT ON (g.id) g.id AS guide_id, g.slug, gv.id AS version_id, gv.title, gv.version_number
FROM guides g
JOIN guide_versions gv ON gv.guide_id = g.id
WHERE g.is_active = true AND gv.review_status != 'archived'
ORDER BY g.id, gv.version_number DESC;
```

### Step 2 — Flag titles by rule

Apply each rule independently. A title may trigger multiple rules.

| Rule ID | Rule | Example (before → after) |
|---------|------|--------------------------|
| `too_long` | Title exceeds 55 characters | "72 Hour Home Survival Kit Shelter at Home" → "Build a 72-Hour Kit" |
| `colon_subtitle` | Contains a colon where the subtitle restates the parent concept | "Tornado Safety: Take Shelter Immediately" → "Take Shelter in a Tornado" |
| `parenthetical` | Parenthetical elaboration adds length without clarity | "Beacon and Locator Basics (PLB, EPIRB, Satellite Messengers)" → "Beacon and Locator Basics" |
| `noun_heavy` | Passive or noun-heavy phrasing where action lead is clearer | "Wound Infection Identification" → "Identify a Wound Infection" |

A title must trigger at least one rule to appear in the review table.

### Step 3 — Propose simplified titles

For each flagged title, propose a simplified version following these guidelines:

- Preferred length: ≤ 50 characters
- Lead with an action verb where the guide describes a procedure (e.g., "Build", "Stop", "Signal", "Treat")
- Drop redundant category context that the app's navigation already provides
- Keep enough specificity to distinguish from sibling guides in the same parentTopic
- Do not change the slug — only the display title changes

### Step 4 — Output review table

Present a Markdown table for admin approval:

| Slug | Current title | Proposed title | Rule(s) triggered | Decision |
|------|--------------|----------------|-------------------|----------|
| `build-72-hour-kit` | 72 Hour Home Survival Kit Shelter at Home | Build a 72-Hour Kit | too_long | approve / skip |
| ... | ... | ... | ... | ... |

Wait for admin to mark each row `approve` or `skip` before proceeding. Do not apply any renames until the full table is reviewed and confirmed.

### Step 5 — Apply approved renames

For each approved rename, apply both writes in sequence. If either write fails, log the inconsistency and surface a warning without stopping the remaining renames.

**Write 1 — update `guides.title`:**
```sql
UPDATE guides SET title = '<new_title>', updated_at = NOW() WHERE id = '<guide_id>';
```

**Write 2 — update `guide_versions.title` on the latest non-archived version:**
```sql
UPDATE guide_versions SET title = '<new_title>', updated_at = NOW() WHERE id = '<version_id>';
```

If Write 1 succeeds and Write 2 fails (or vice versa), log:
```
⚠ PARTIAL RENAME: <slug> — guides.title updated but guide_versions.title failed (or vice versa). Manual fix required.
```

### Step 6 — Write rename log artifact

Save `rename-log.json` in the working folder (e.g., `pipeline-title-simplifier-YYYY-MM-DD/`):

```json
{
  "date": "YYYY-MM-DD",
  "renames": [
    {
      "slug": "build-72-hour-kit",
      "oldTitle": "72 Hour Home Survival Kit Shelter at Home",
      "newTitle": "Build a 72-Hour Kit",
      "rulesTriggered": ["too_long"],
      "guideId": "...",
      "versionId": "...",
      "status": "applied"
    }
  ]
}
```

`status` values:
- `applied` — both writes succeeded
- `partial` — one write succeeded, one failed (requires manual follow-up)
- `skipped` — admin marked as skip in review table

## Output Artifacts

| File | Description |
|------|-------------|
| `rename-log.json` | Record of all proposed and applied renames for this run |

## Constraints

- Slug is immutable — title changes do not affect routing or guide identity
- Only the **latest non-archived version** gets its title updated; older versions retain their original title for audit history
- A rename does not create a new version — it is an in-place correction to the display title
- Do not rename a guide whose title is referenced in another guide's `notes` or `change_summary` without flagging it
