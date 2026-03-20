# Guide Consolidation + Title Simplifier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Archive the zero-content sanitation shell guide (Option A), scaffold a consolidation queue JSON for all 7 Option B duplicate clusters, and create the `northkeep-title-simplifier` skill file with its reference in the pipeline architecture doc.

**Architecture:** Two independent workstreams — WS3 does a one-time archive operation via a tsx script and creates a static JSON tracking file; WS4 creates a new skill file at `skills/northkeep-title-simplifier/SKILL.md` and appends a Maintenance Skills section to `northkeep-skill-pipeline-architecture.md`. No admin app code changes required for either workstream.

**Tech Stack:** Node.js/tsx (scripts), Supabase JS client (direct DB access), Markdown (skill file)

**Spec:** `docs/superpowers/specs/2026-03-19-needs-images-status-and-guide-consolidation-design.md` — WS3 + WS4

---

## File Map

| Action | Path |
|--------|------|
| Create | `NorthKeepAdmin/northkeep-admin/scripts/archive-duplicate-guides.ts` |
| Create | `pipeline-consolidation-queue/consolidation-queue.json` |
| Create | `skills/northkeep-title-simplifier/SKILL.md` |
| Modify | `northkeep-skill-pipeline-architecture.md` |

All script paths are relative to the repo root unless otherwise noted.

---

## Task 1: Option A Archive — Sanitation Shell

**Context:** `sanitation-waste-basics` has 0 steps and is a thin shell that duplicates `emergency-toilet-and-waste-management`. Archive operation: set all versions to `review_status: "archived"`, set the guide's `is_active: false`, and append a consolidation note to the survivor guide's latest version notes.

**Files:**
- Create: `NorthKeepAdmin/northkeep-admin/scripts/archive-duplicate-guides.ts`

- [ ] **Step 1: Create the archive script**

  ```typescript
  /**
   * Archives thin-shell duplicate guides (Option A consolidation).
   *
   * For each archived guide:
   *   1. Sets review_status = "archived" on all versions
   *   2. Sets is_active = false on the guide record
   *   3. Appends a consolidation note to the survivor's latest active version
   *
   * Usage: npx tsx scripts/archive-duplicate-guides.ts
   */

  import { createClient } from "@supabase/supabase-js";
  import { readFileSync } from "fs";
  import { resolve } from "path";

  // Load .env.local
  try {
    const envLocal = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const line of envLocal.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch { /* .env.local may not exist */ }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or key");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  /**
   * Each entry: the slug to archive and the slug of the survivor guide
   * that should receive the consolidation note.
   * Option A only — thin shells with no meaningful content to merge.
   */
  const OPTION_A_ARCHIVES: Array<{ archive: string; survivor: string }> = [
    {
      archive: "sanitation-waste-basics",
      survivor: "emergency-toilet-and-waste-management",
    },
  ];

  async function archiveGuide(archiveSlug: string, survivorSlug: string) {
    console.log(`\nArchiving: ${archiveSlug} → survivor: ${survivorSlug}`);

    // 1. Find the guide to archive
    const { data: archiveGuide, error: archiveErr } = await supabase
      .from("guides")
      .select("id, slug, is_active")
      .eq("slug", archiveSlug)
      .single();

    if (archiveErr || !archiveGuide) {
      console.error(`  ✗ Guide not found: ${archiveSlug}`);
      return false;
    }

    // Idempotency: skip if already inactive
    if (!archiveGuide.is_active) {
      console.log(`  ⏭  ${archiveSlug} is already inactive, skipping`);
      return true;
    }

    // 2. Archive all versions
    const { error: versionsErr } = await supabase
      .from("guide_versions")
      .update({ review_status: "archived" })
      .eq("guide_id", archiveGuide.id)
      .neq("review_status", "archived");

    if (versionsErr) {
      console.error(`  ✗ Failed to archive versions: ${versionsErr.message}`);
      return false;
    }
    console.log(`  ✓ All versions archived`);

    // 3. Set guide inactive
    const { error: guideErr } = await supabase
      .from("guides")
      .update({ is_active: false })
      .eq("id", archiveGuide.id);

    if (guideErr) {
      console.error(`  ✗ Failed to deactivate guide: ${guideErr.message}`);
      return false;
    }
    console.log(`  ✓ Guide set inactive`);

    // 4. Find survivor's latest non-archived version
    const { data: survivorGuide, error: survivorGuideErr } = await supabase
      .from("guides")
      .select("id")
      .eq("slug", survivorSlug)
      .single();

    if (survivorGuideErr || !survivorGuide) {
      console.warn(`  ⚠  Survivor guide not found: ${survivorSlug} — skipping note append`);
      return true;
    }

    const { data: survivorVersion, error: survivorVersionErr } = await supabase
      .from("guide_versions")
      .select("id, version_number, notes")
      .eq("guide_id", survivorGuide.id)
      .neq("review_status", "archived")
      .order("version_number", { ascending: false })
      .maybeSingle();

    if (survivorVersionErr || !survivorVersion) {
      console.warn(`  ⚠  No active version found for survivor ${survivorSlug} — skipping note`);
      return true;
    }

    // 5. Append consolidation note
    const existingNotes = survivorVersion.notes ?? "";
    const consolidationNote = `Consolidated from ${archiveSlug} on 2026-03-19`;

    // Idempotency: skip if note already present
    if (existingNotes.includes(consolidationNote)) {
      console.log(`  ⏭  Consolidation note already present on survivor v${survivorVersion.version_number}`);
      return true;
    }

    const updatedNotes = existingNotes
      ? `${existingNotes}\n${consolidationNote}`
      : consolidationNote;

    const { error: noteErr } = await supabase
      .from("guide_versions")
      .update({ notes: updatedNotes })
      .eq("id", survivorVersion.id);

    if (noteErr) {
      console.warn(`  ⚠  Failed to append note: ${noteErr.message}`);
      // Non-fatal — archive already succeeded
      return true;
    }

    console.log(`  ✓ Consolidation note appended to survivor v${survivorVersion.version_number}`);
    return true;
  }

  async function main() {
    console.log("=== archive-duplicate-guides (Option A) ===\n");

    let succeeded = 0, failed = 0;

    for (const { archive, survivor } of OPTION_A_ARCHIVES) {
      const ok = await archiveGuide(archive, survivor);
      if (ok) succeeded++; else failed++;
    }

    console.log(`\nDone — Succeeded: ${succeeded}  Failed: ${failed}`);
    if (failed > 0) process.exit(1);
  }

  main().catch((err) => { console.error(err); process.exit(1); });
  ```

- [ ] **Step 2: Run the script**

  ```bash
  cd NorthKeepAdmin/northkeep-admin
  npx tsx scripts/archive-duplicate-guides.ts
  ```

  Expected output:
  ```
  === archive-duplicate-guides (Option A) ===

  Archiving: sanitation-waste-basics → survivor: emergency-toilet-and-waste-management
    ✓ All versions archived
    ✓ Guide set inactive
    ✓ Consolidation note appended to survivor v<N>

  Done — Succeeded: 1  Failed: 0
  ```

- [ ] **Step 3: Verify in Supabase SQL**

  ```sql
  -- sanitation-waste-basics should be inactive
  SELECT slug, is_active FROM guides WHERE slug = 'sanitation-waste-basics';
  -- Expected: is_active = false

  -- All its versions should be archived
  SELECT version_number, review_status
  FROM guide_versions
  WHERE guide_id = (SELECT id FROM guides WHERE slug = 'sanitation-waste-basics');
  -- Expected: all rows have review_status = 'archived'

  -- Survivor's latest version should have the consolidation note
  SELECT version_number, notes
  FROM guide_versions
  WHERE guide_id = (SELECT id FROM guides WHERE slug = 'emergency-toilet-and-waste-management')
  ORDER BY version_number DESC LIMIT 1;
  -- Expected: notes contains "Consolidated from sanitation-waste-basics on 2026-03-19"
  ```

- [ ] **Step 4: Commit**

  ```bash
  cd ../..
  git add NorthKeepAdmin/northkeep-admin/scripts/archive-duplicate-guides.ts
  git commit -m "feat: archive sanitation-waste-basics shell (Option A consolidation)"
  ```

---

## Task 2: Consolidation Queue JSON

**Context:** The 7 Option B clusters (content-rich duplicates) need dedicated `northkeep-consolidator` pipeline runs. This task creates a tracking file so the planner can reference them without having to re-analyze the library.

**Files:**
- Create: `pipeline-consolidation-queue/consolidation-queue.json`

- [ ] **Step 1: Create the queue directory and file**

  Create the directory `pipeline-consolidation-queue/` in the repo root, then write the file:

  ```json
  {
    "generatedAt": "2026-03-19",
    "description": "Option B consolidation clusters — each requires a dedicated northkeep-consolidator pipeline run. Clusters are listed in suggested execution order (most user-facing first). Each cluster keeps the shorter/simpler slug as canonical.",
    "clusters": [
      {
        "id": "food-safety",
        "keep": "food-safety-no-fridge",
        "archive": ["food-preservation", "food-safety-power-outage-action"],
        "method": "B",
        "note": "Three-way merge: run consolidator twice. Run 1: food-safety-no-fridge + food-preservation → improved draft. Run 2: run-1 output + food-safety-power-outage-action → final draft. Archive both food-preservation and food-safety-power-outage-action after final import.",
        "status": "pending"
      },
      {
        "id": "emergency-water-storage",
        "keep": "emergency-water-storage",
        "archive": ["emergency-water-storage-at-home"],
        "method": "B",
        "note": "Standard two-guide merge via northkeep-consolidator.",
        "status": "pending"
      },
      {
        "id": "stay-put-vs-move",
        "keep": "stay-put-vs-move",
        "archive": ["stay-put-vs-move-land"],
        "method": "B",
        "note": "Standard two-guide merge via northkeep-consolidator.",
        "status": "pending"
      },
      {
        "id": "sprains",
        "keep": "immobilize-sprain-or-fracture",
        "archive": ["sprains-and-suspected-fractures"],
        "method": "B",
        "note": "Standard two-guide merge. Note: immobilize-sprain-or-fracture has a needs_images v2 created in the WS1 batch script — run consolidator against its current published version, not the v2.",
        "status": "pending"
      },
      {
        "id": "go-bag",
        "keep": "evacuation-go-bag",
        "archive": ["personal-evacuation-go-bag-adult"],
        "method": "B",
        "note": "Standard two-guide merge via northkeep-consolidator.",
        "status": "pending"
      },
      {
        "id": "72-hour-kit",
        "keep": "build-72-hour-kit",
        "archive": ["72-hour-home-survival-kit-shelter-at-home"],
        "method": "B",
        "note": "Standard two-guide merge via northkeep-consolidator.",
        "status": "pending"
      },
      {
        "id": "family-plan",
        "keep": "family-emergency-plan",
        "archive": ["basic-family-emergency-communication-plan"],
        "method": "B",
        "note": "Standard two-guide merge via northkeep-consolidator.",
        "status": "pending"
      }
    ]
  }
  ```

- [ ] **Step 2: Verify the file is valid JSON**

  ```bash
  node -e "JSON.parse(require('fs').readFileSync('pipeline-consolidation-queue/consolidation-queue.json','utf8')); console.log('Valid JSON')"
  ```

  Expected: `Valid JSON`

- [ ] **Step 3: Commit**

  ```bash
  git add pipeline-consolidation-queue/consolidation-queue.json
  git commit -m "chore: add Option B consolidation queue (7 duplicate clusters)"
  ```

---

## Task 3: Title Simplifier Skill File

**Context:** Creates the skill that scans guide titles, flags ones that are too long or redundantly structured, proposes simplified versions, and applies admin-approved renames atomically across both `guides.title` and `guide_versions.title`.

**Files:**
- Create: `skills/northkeep-title-simplifier/SKILL.md`

- [ ] **Step 1: Create the skill directory and file**

  Create `skills/northkeep-title-simplifier/SKILL.md`:

  ````markdown
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
        "status": "applied" | "partial" | "skipped"
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
  ````

- [ ] **Step 2: Verify the file exists**

  ```bash
  ls skills/northkeep-title-simplifier/SKILL.md
  ```

  Expected: file listed.

- [ ] **Step 3: Commit**

  ```bash
  git add skills/northkeep-title-simplifier/SKILL.md
  git commit -m "feat: add northkeep-title-simplifier skill"
  ```

---

## Task 4: Pipeline Architecture Doc — Maintenance Skills Section

**Context:** The title simplifier is a maintenance skill, not part of the 8-step pipeline. The architecture doc needs a new section so the planner knows it exists.

**Files:**
- Modify: `northkeep-skill-pipeline-architecture.md`

- [ ] **Step 1: Ensure you are in the repo root, then append the Maintenance Skills section**

  ```bash
  # Run from repo root (C:\Users\...\PrepKit or equivalent)
  # If you were in NorthKeepAdmin/northkeep-admin, run: cd ../..
  pwd  # should end in /PrepKit
  ```

  At the very end of `northkeep-skill-pipeline-architecture.md`, append:

  ```markdown

  ---

  ## Maintenance Skills

  These skills sit outside the standard 8-step pipeline. They are invoked on demand or during the Planning step when specific conditions are met.

  ### Title Simplifier

  **Skill:** `skills/northkeep-title-simplifier/SKILL.md`

  **Responsibility:** Scan active guide titles for length, structural redundancy, or clarity issues. Propose simplified versions and apply admin-approved renames atomically.

  **When to invoke:**
  - During Planning when the planner flags titles exceeding 55 characters or with colon-subtitles
  - After a consolidation run, when the survivor may have inherited a verbose name
  - On direct admin request ("simplify guide titles")

  **Inputs:** Live Supabase query of active guides + current published version titles

  **Output: `rename-log.json`**
  ```json
  {
    "date": "YYYY-MM-DD",
    "renames": [
      {
        "slug": "build-72-hour-kit",
        "oldTitle": "72 Hour Home Survival Kit Shelter at Home",
        "newTitle": "Build a 72-Hour Kit",
        "rulesTriggered": ["too_long"],
        "status": "applied"
      }
    ]
  }
  ```

  **Rules applied:** `too_long` (>55 chars), `colon_subtitle`, `parenthetical`, `noun_heavy`
  ```

- [ ] **Step 2: Verify the section was appended correctly**

  ```bash
  tail -40 northkeep-skill-pipeline-architecture.md
  ```

  Expected: "Maintenance Skills" section and Title Simplifier subsection visible at the end of the file.

- [ ] **Step 3: Commit**

  ```bash
  git add northkeep-skill-pipeline-architecture.md
  git commit -m "docs: add Maintenance Skills section with title-simplifier reference"
  ```

---

## Task 5: Final Verification

- [ ] **Step 1: Verify all artifacts are in place**

  ```bash
  ls NorthKeepAdmin/northkeep-admin/scripts/archive-duplicate-guides.ts
  ls pipeline-consolidation-queue/consolidation-queue.json
  ls skills/northkeep-title-simplifier/SKILL.md
  ```

  All three should exist.

- [ ] **Step 2: Verify the admin app still builds (no regressions)**

  ```bash
  cd NorthKeepAdmin/northkeep-admin
  npm run build 2>&1 | tail -10
  ```

  Expected: build completes. This workstream makes no admin app code changes, so failure here indicates a pre-existing issue.

- [ ] **Step 3: Final summary commit (if any unstaged changes remain)**

  ```bash
  cd ../..
  git status
  ```

  If clean, nothing to do. If any files remain unstaged, stage and commit them.
