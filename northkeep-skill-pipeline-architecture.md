# NorthKeep Skill Pipeline Architecture

## Skill Responsibilities and Handoff Contracts

### Overview

Eight-step content pipeline where each skill produces a defined output artifact that the next skill consumes. Every artifact is a JSON file, making handoffs inspectable at each stage.

```
Planning → Research → Writing → Constraint Annotation → Validation → Import/Staging → Human Review → Release
```

---

### 1. Planning Skill

**Responsibility:** Analyze the current guide library against coverage goals and produce a prioritized work plan.

**Inputs:**
- Live Supabase query of all guides + latest versions (primary)
- Fallback: `guides_master_export.normalized.json`
- Optional: user-specified focus area (category, parentTopic, or specific slug)

**What it does:**
- Scans the library for gaps using the weak-guide criteria:
  - Missing or empty `warnings`, `redFlags`
  - `source_quality: "weak"` or null
  - Empty or placeholder `sourceReferences`
  - `content_status: "needs_source_review"`
  - Shallow `step_by_step_actions` on action_cards (fewer than 3 steps)
  - Missing `parent_topic_id`
  - Overlapping coverage (similar slugs, identical parentTopic with same layer)
- Identifies missing coverage by comparing existing categories/parentTopics against a reasonable baseline for emergency guidance
- Recommends upgrade vs. new for each item
- Assigns evidence tier requirement per item

**Output: `planning-packet.json`**
```json
{
  "generatedAt": "ISO timestamp",
  "librarySnapshot": {
    "totalGuides": 187,
    "byCategory": { "medical_safety": 34, ... },
    "byLayer": { "action": 62, ... }
  },
  "workItems": [
    {
      "priority": 1,
      "action": "upgrade",
      "targetSlug": "existing-guide-slug",
      "reason": "Missing warnings, weak sourceReferences, shallow steps",
      "weaknessFlags": ["missing_warnings", "weak_sources", "shallow_steps"],
      "category": "medical_safety",
      "parentTopic": "Bleeding Control",
      "evidenceTier": "authoritative_only",
      "estimatedEffort": "medium"
    },
    {
      "priority": 2,
      "action": "new",
      "targetSlug": null,
      "suggestedSlug": "heat-stroke-immediate-response",
      "reason": "No action_card exists for heat stroke despite being a common emergency",
      "category": "medical_safety",
      "parentTopic": "Heat-Related Illness",
      "evidenceTier": "authoritative_only",
      "estimatedEffort": "high"
    }
  ],
  "duplicateRisks": [
    {
      "slugA": "water-purification-basics",
      "slugB": "field-water-treatment",
      "overlapDescription": "Both cover boiling and chemical treatment in nearly identical scope",
      "recommendation": "Merge into single guide, archive the weaker one"
    }
  ]
}
```

**Handoff:** Human reviews the plan, selects work items to proceed with, passes selected items to Research.

---

### 2. Research Skill

**Responsibility:** Research a specific work item and produce a structured research packet with sourced claims.

**Inputs:**
- One or more work items from `planning-packet.json`
- Evidence tier constraint for this item
- If upgrading: the existing guide JSON (fetched from Supabase by slug)

**What it does:**
- Researches the topic using sources appropriate to the evidence tier:
  - `authoritative_only`: Government agencies (FEMA, NWS, CDC, NPS), medical organizations (AHA, Red Cross, WHO), peer-reviewed guidelines
  - `authoritative_plus_field_practice`: Above + established field manuals, military survival guides (FM 21-76), Wilderness Medical Society, recognized outdoor education programs
  - `authoritative_plus_examples`: Above + well-documented case studies, incident reports, reputable journalism
- Each claim is tagged with its source
- Conflicting information between sources is flagged explicitly
- If upgrading, compares existing guide content to research findings and flags gaps

**Output: `research-packet.json`**
```json
{
  "workItemRef": {
    "action": "upgrade",
    "targetSlug": "existing-guide-slug",
    "category": "medical_safety",
    "parentTopic": "Bleeding Control"
  },
  "evidenceTier": "authoritative_only",
  "topicSourceQuality": "strong",
  "suggestedLayer": "action",
  "suggestedGuideType": "action_card",
  "existingGuideUpgradeTarget": "existing-guide-slug or null",
  "researchFindings": [
    {
      "claim": "Apply direct pressure with a clean cloth for at least 15 minutes without checking",
      "sourceTitle": "First Aid/CPR/AED Participant's Manual",
      "sourceOrganization": "American Red Cross",
      "sourceUrl": "https://...",
      "evidenceStrength": "authoritative",
      "fieldRelevance": "Directly applicable step-by-step action"
    }
  ],
  "suggestedSubGuides": [
    {
      "slug": "tourniquet-application",
      "reason": "Separate action_card needed for tourniquet use (different skill level, different scenario)"
    }
  ],
  "conflictsOrWeakClaims": [
    {
      "claim": "Elevate the wound above heart level",
      "issue": "Red Cross removed elevation from current guidelines; some older sources still recommend it",
      "resolution": "Omit — do not include in guide per current authoritative guidance"
    }
  ],
  "recommendation": "Upgrade existing guide with 7 new sourced steps, add 3 missing warnings, improve sourceReferences from 1 to 4 authoritative sources"
}
```

**Handoff:** Research packet passes directly to Writing.

---

### 3. Writing Skill

**Responsibility:** Transform a research packet into app-ready guide JSON in the NormalizedGuide format.

**Inputs:**
- `research-packet.json`
- If upgrading: the existing guide's current version (for diff awareness)

**What it does:**
- Maps research findings to the correct guide fields
- Uses only the established taxonomy (categories, layers, guideTypes from the database)
- Produces flat string arrays for all array fields (no nested objects)
- Sets `contentStatus` to `"draft"` and `integrationDecision` to `"new"` or `"upgrade"` as appropriate
- Produces a decision summary explaining field choices
- Does NOT populate constraint metadata fields (that's the next skill's job)

**Output: `guide-draft.json`**

A complete NormalizedGuide object matching the schema in `src/types/normalized-export.ts`. Key rules:
- `sourceQuality` must be `"strong"` | `"mixed"` | `"weak"` (matching the DB enum, not the normalized export's values)
- `review_status` is always omitted (the import API sets it to `"draft"`)
- `sourceReferences` are objects with `{ title, organization, url, whyUseful }`
- All array fields are flat arrays of strings
- `upgradesGuide` is set to the target slug if this is an upgrade, null otherwise
- camelCase field names throughout

**Handoff:** Draft passes to Constraint Metadata Annotation.

---

### 4. Constraint Metadata Annotation Skill

**Responsibility:** Add guide-ranking metadata so the mobile chat system can handle follow-up constraints and guide prioritization.

**Inputs:**
- `guide-draft.json` from Writing
- Full guide library (all slugs, all existing constraint metadata) — needed to determine `alternativeToGuideSlugs` and avoid duplicate role assignments within a parentTopic

**What it does:**
- Assigns `responseRole`: `"primary"` | `"backup"` | `"supporting"` | `"reference"` based on the guide's position within its parentTopic cluster
- Assigns `constraintTags` from the canonical registry (the 27 tags in `constraint-tags.ts`) — only tags that genuinely apply to this guide's content
- Assigns `blockedByConstraints` — constraint tags under which this guide should NOT be surfaced (e.g., a boiling-water guide gets `blockedByConstraints: ["no_heat_source"]`)
- Assigns `alternativeToGuideSlugs` — must be real slugs that exist in the library
- Does NOT modify any other fields from the draft

**Output: `guide-annotated.json`**

Same NormalizedGuide as the draft, with the four constraint metadata fields populated.

**Handoff:** Annotated guide passes to Validation.

---

### 5. Validation / Safety Skill

**Responsibility:** Check the annotated draft for schema correctness, safety issues, duplicate risk, and source grounding before it enters the admin workflow.

**Inputs:**
- `guide-annotated.json`
- `research-packet.json` (for source verification)
- Full guide library (for duplicate detection and slug validation)
- Evidence tier from the planning phase

**What it does — produces a validation report with these checks:**

**Schema checks (automated, binary pass/fail):**
- All 22+ required fields present
- `layer` and `guideType` correctly paired
- `sourceQuality` is a valid DB enum value (`strong`/`mixed`/`weak`)
- All array fields are flat string arrays
- `sourceReferences` objects have `{ title, organization, url, whyUseful }`
- `constraintTags` and `blockedByConstraints` only contain tags from the canonical registry
- `alternativeToGuideSlugs` all resolve to existing slugs
- `responseRole` is one of `primary`/`backup`/`supporting`/`reference`
- `review_status` is not set (import API handles this)

**Safety checks (flagged for human review):**
- Every claim in `stepByStepActions`, `warnings`, `whatNotToDo` can be traced back to a finding in the research packet
- No unsupported medical or safety advice (claims present in guide but absent from research findings)
- `action_card` guides have at least 3 `stepByStepActions`
- `action_card` and `scenario_guide` guides have non-empty `warnings` and `redFlags`
- Source quality matches evidence tier requirement (e.g., `authoritative_only` tier should have `sourceQuality: "strong"`)

**Duplicate / upgrade checks:**
- If `integrationDecision: "upgrade"`, `upgradesGuide` points to a real slug
- If `integrationDecision: "new"`, no existing guide with substantially similar title/parentTopic/layer exists
- If upgrading, verify no warnings or redFlags from the existing version were dropped without explanation

**Constraint metadata checks:**
- `responseRole` doesn't conflict with another guide's role in the same parentTopic cluster
- `blockedByConstraints` and `constraintTags` don't overlap (a guide shouldn't be boosted and blocked by the same tag)
- `alternativeToGuideSlugs` are in the same parentTopic

**Output: `validation-report.json`**
```json
{
  "slug": "guide-slug",
  "overallResult": "pass" | "fail" | "pass_with_warnings",
  "schemaChecks": [
    { "check": "all_required_fields_present", "passed": true, "evidence": "..." }
  ],
  "safetyChecks": [
    { "check": "all_claims_sourced", "passed": false, "evidence": "stepByStepActions[4] has no matching research finding", "severity": "blocking" }
  ],
  "duplicateChecks": [...],
  "constraintChecks": [...],
  "blockingIssues": ["list of issues that must be fixed"],
  "warnings": ["list of non-blocking concerns for human review"]
}
```

**Handoff:** If `overallResult` is `"fail"`, loop back to the appropriate upstream skill (Writing for content issues, Constraint Annotation for metadata issues). If `"pass"` or `"pass_with_warnings"`, proceed to Import.

---

### 6. Import / Staging Skill

**Responsibility:** Submit the validated guide into the admin workflow as a draft version.

**Inputs:**
- `guide-annotated.json` (the validated draft)
- `validation-report.json` (must be `"pass"` or `"pass_with_warnings"`)
- Supabase credentials (via the admin app's existing API)

**What it does:**
1. Calls the import API at `POST /api/guides/import?action=preview` with the NormalizedGuide JSON
2. Presents the diff to the user (what's new, what changed, what's unchanged)
3. On user confirmation, calls `POST /api/guides/import?action=save`
4. The import API creates the guide (if new) and a new `guide_version` with `review_status: "draft"`
5. Records the `changeSummary` from the validation report
6. Reports back: slug, version ID, version number, any warnings from the API (e.g., invalid constraint tags that were filtered)

**Output: `import-receipt.json`**
```json
{
  "slug": "guide-slug",
  "guideId": "uuid",
  "versionId": "uuid",
  "versionNumber": 3,
  "reviewStatus": "draft",
  "isNew": false,
  "apiWarnings": [],
  "importedAt": "ISO timestamp"
}
```

**Handoff:** Guide is now visible in the admin app's Review Queue at `/review?filter=draft`. Human takes over.

---

### 7. Human Review / Approval (not a skill — manual step)

**What happens:**
- Reviewer opens the guide in the admin app at `/guides/{slug}?tab=editor`
- Reviews content, makes edits if needed
- Changes `review_status` from `"draft"` → `"in_review"` → `"approved"`
- Only `"approved"` versions can be added to a release

---

### 8. Release / Publish Skill

**Responsibility:** Bundle approved guide versions into a release for the mobile app.

**Inputs:**
- Release name and semantic version (from user)
- List of approved guide version IDs to include (or "all approved since last release")

**What it does:**
1. Creates a new release via `POST /api/releases` with status `"draft"`
2. Adds approved guide versions via `POST /api/releases/{id}/items`
3. Generates the bundle via `POST /api/releases/{id}/generate` — this produces the JSON manifest + guide bundle that the mobile app downloads
4. Presents the manifest to the user for final confirmation (guide count, version, release notes)
5. On confirmation, publishes via `POST /api/releases/{id}/publish`

**Output: Release is live. Mobile app can fetch the new bundle.**

---

## What Needs Schema/Backend Support vs. What Stays as Policy

### Needs schema changes (build before skills)

**1. Evidence tier field on guide_versions**

The evidence tiers (`authoritative_only`, `authoritative_plus_field_practice`, `authoritative_plus_examples`) are real data that should persist with the guide. The Validation skill needs to check that source quality matches the tier, and future reviewers need to know what standard was applied.

Add to `guide_versions` table:
```sql
evidence_tier TEXT CHECK (evidence_tier IN (
  'authoritative_only',
  'authoritative_plus_field_practice',
  'authoritative_plus_examples'
))
```

Add to the NormalizedGuide type and the import API so it flows through the pipeline.

**2. Fix sourceQuality enum mismatch**

The database uses `"strong" | "mixed" | "weak"` but the normalized export and the Writing skill currently use `"high" | "mixed" | "low" | "unknown"`. The import API silently coerces invalid values to null. This should be reconciled — pick one set and enforce it everywhere. Recommendation: adopt the DB values (`strong`/`mixed`/`weak`) as canonical since they're already enforced at the database level.

### Needs admin API changes (small)

**3. Bulk approved-versions endpoint**

The Release skill needs to efficiently query "all approved versions since the last published release." The current `/api/guides/approved` endpoint works but filters by release exclusion, not by date. A small enhancement (add `?since=ISO_DATE` parameter) would make the Release skill much more reliable.

**4. Review status transition API**

Currently the admin app updates `review_status` via the guide editor form. The Import skill should be able to set it to `"draft"` (which it already does), but the Release skill may need to verify all included versions are `"approved"`. This already works — the `/api/guides/approved` endpoint filters for it.

### Stays as workflow policy (no schema changes needed)

**5. Evidence tier influences on research sources**

Which sources are "allowed" per tier is a policy decision, not a data model concern. The Research skill enforces this internally based on the tier value. No schema needed — the skill just follows the rules.

**6. Weak-guide criteria**

These are heuristics the Planning skill applies. They don't need database support — the Planning skill queries the existing fields and applies the logic. If you later want to store a "health score" per guide, that's an optimization, not a prerequisite.

**7. Duplicate detection**

The Validation skill can detect duplicates by querying existing guides by category, parentTopic, and title similarity. No new tables or indexes needed — it's a read-only check against existing data.

**8. The "don't drop warnings on upgrade" rule**

This is validation logic. The Validation skill loads the existing version, compares warnings/redFlags arrays, and flags any that were removed. Pure skill-side logic, no schema support required.

**9. Constraint tag registry expansion**

The current 27 tags in `constraint-tags.ts` are hardcoded. If skills need to propose new tags, that's a code change to the admin app — not a database migration. Keep it as a manual gate: a skill can *suggest* a new tag, but adding it requires a code deploy.

---

## Summary: Build Order

**Before building any skills:**
1. Add `evidence_tier` column to `guide_versions` and thread it through the import API and NormalizedGuide type
2. Reconcile `sourceQuality` enum (adopt `strong`/`mixed`/`weak` everywhere)

**Then build skills in this order:**
1. Writing (already drafted and tested)
2. Validation (highest value — catches errors regardless of how content is created)
3. Planning (drives the pipeline but can be used standalone)
4. Research (pairs with Planning output)
5. Constraint Annotation (needs the full library for context)
6. Import/Staging (wraps existing API — relatively thin)
7. Release (wraps existing APIs — thin, but production-adjacent so build last)
