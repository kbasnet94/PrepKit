---
name: northkeep-consolidator
description: >
  Use this skill to merge two overlapping NorthKeep guides into a single authoritative guide. Trigger whenever the planning skill flags a duplicateRisk, two guides cover the same topic in the same parentTopic and layer, or the user asks to consolidate, merge, deduplicate, or combine guides. Also trigger before annotating a guide that has a known duplicate — the duplicate must be resolved first so only one guide receives a backup/primary responseRole. This skill replaces the Research and Writing steps for duplicate cases: its output (guide-draft.json + consolidation-report.json) feeds directly into Constraint Annotation (step 4). Do NOT use this skill for guides that are merely related — only for guides with genuinely redundant scope in the same parentTopic and layer.
---

# NorthKeep Guide Consolidator

You are merging two overlapping guides into a single best-of version. This is a **side-branch of the pipeline** that replaces Research + Writing when duplicate guides exist:

**Normal pipeline:** Planning → Research → Writing → Constraint Annotation → Validation → Import/Staging
**Consolidation branch:** Planning → **Consolidation** → Constraint Annotation → Validation → Import/Staging

Your output (`guide-draft.json` + `consolidation-report.json`) must be ready to hand directly to the Constraint Annotation skill. You do not touch constraint metadata — that is step 4's job.

## Inputs

- Two slugs to consolidate (from `duplicateRisks` in `planning-packet.json`, or specified directly)
- Full guide library — fetch both guides from Supabase or the normalized export

## Step 1: Fetch and audit both guides

Read both guides in full. For each, note:

- **Slug, title, parentTopic, layer, guideType** — confirm they match (same parentTopic + layer + guideType is what makes them duplicates)
- **sourceQuality** and **sourceReferences** — which has stronger sources? Which has real URLs?
- **stepByStepActions count** — which is more thorough?
- **warnings, whatNotToDo, redFlags** — which is more complete?
- **review_status** — is either published? Published status strongly favors keeping that slug.
- **Constraint metadata** — note any existing responseRole, constraintTags, etc. (usually null for duplicates)

## Step 2: Choose the canonical slug

This is the slug that survives. The other is archived. Use this decision order:

1. **Published status**: If one is `review_status: published`, keep that slug. Don't change a live guide's identity.
2. **Source URL quality**: Prefer the guide with real, populated URLs in `sourceReferences`.
3. **Slug readability**: Prefer the shorter, cleaner, more searchable slug (e.g., `purify-water-bleach` over `purifying-water-with-household-liquid-bleach`).
4. **Content depth**: Prefer the guide with more complete `stepByStepActions` and `whatNotToDo`.
5. **Tie**: Default to the guide with the lower version number (older, more established).

Record your decision and reason in the consolidation report.

## Step 3: Merge fields

Produce a single merged guide using the canonical slug. Apply these rules field by field:

### Identity fields — always take from canonical guide
`slug`, `category`, `parentTopic`, `layer`, `guideType`

### Title — prefer the cleaner, shorter, more user-facing phrasing
Compare both. Choose the one that reads better to a panicked user. Prefer action-verb phrasing ("Disinfect Water with Bleach" over "Purifying Water with Household Liquid Bleach").

### summary and quickAnswer — prefer specificity
Take whichever version contains the most actionable information. If both are weak, synthesize a better one from the two. Flag if synthesized.

### preferredAction and backupAction — same rule as summary

### stepByStepActions — best-of merge
1. List all steps from both guides
2. Deduplicate: remove steps that say the same thing in different words
3. Order logically: prerequisites first, sequential actions middle, storage/post-treatment last
4. Prefer the more specific, actionable phrasing for each step
5. If one guide has a step the other lacks, include it unless it contradicts another step
6. Cap at 10 steps — if over 10, prioritize the most safety-critical actions

### warnings, whatNotToDo, redFlags, preparednessTips — union merge
1. Take all items from both guides
2. Deduplicate items that say the same thing
3. Prefer the more specific, concrete phrasing
4. Remove items that directly contradict a step (e.g., "do not use bleach" in a bleach guide)

### sourceReferences — union by substance, prefer real URLs
1. Start with all refs from both guides
2. If two refs cite the same source (same organization + same approximate topic), keep the one with the real URL
3. If neither has a URL for a given source, keep one entry with `"url": null`
4. Never duplicate an organization+topic combination in the final list

### sourceQuality — take the stronger value
`strong` > `mixed` > `weak`. If one guide is `strong`, the merged guide is `strong` — provided the strong-quality refs survive the merge.

### appTags — union all tags, deduplicate

### contentStatus — always `"draft"` (this is a new version entering the pipeline)

### integrationDecision — always `"upgrade"`

### upgradesGuide — the canonical slug

### notes — record that this is a consolidation and which slug was archived

## Step 4: Identify and record conflicts

A **conflict** is when both guides contain substantively different guidance on the same safety-critical topic. Examples:

- Different dosage amounts ("8 drops per gallon" vs "16 drops per gallon")
- Different wait times ("15 minutes" vs "30 minutes")
- Contradictory instructions for the same scenario

For each conflict:
1. Quote both claims exactly
2. Identify which source each came from
3. Make a resolution recommendation (prefer the more recent, more specific, or more authoritative source)
4. If you cannot resolve it with confidence, mark it `"unresolved"` and flag for human review before proceeding

**A guide with unresolved conflicts must not proceed to Import/Staging.**

## Step 5: Identify the archive candidate

Record the slug to be archived. Note clearly:

- **The archive action is performed by a human**, not by this skill
- The archived guide should be set to `review_status: archived` in the admin app after the merged version is approved
- Do not archive before the merged version is approved — the library should never have a gap
- If the archived slug has external references (e.g., `alternativeToGuideSlugs` in other guides pointing to it), flag those for update

## Output

Produce two files:

### `consolidation-report.json`

```json
{
  "canonicalSlug": "purify-water-bleach",
  "archiveSlug": "purifying-water-with-household-liquid-bleach",
  "canonicalChoiceReason": "Has real source URLs; cleaner slug; published v1 already in library",
  "fieldDecisions": [
    {
      "field": "stepByStepActions",
      "decision": "merged",
      "source": "6 steps from archive guide + 1 unique step from canonical guide, deduplicated to 7",
      "note": null
    },
    {
      "field": "sourceReferences",
      "decision": "canonical-preferred",
      "source": "Canonical has 3 refs with real URLs; archive has same 3 orgs but empty URLs",
      "note": null
    }
  ],
  "conflicts": [
    {
      "field": "stepByStepActions[3]",
      "valueA": "Wait at least 30 minutes before drinking",
      "sourceA": "purifying-water-with-household-liquid-bleach",
      "valueB": "Follow official dosage guidance for the bleach strength and water amount",
      "sourceB": "purify-water-bleach",
      "resolution": "Use '30 minutes' — matches EPA guidance",
      "status": "resolved"
    }
  ],
  "archiveCandidateWarnings": [
    "No other guides currently have alternativeToGuideSlugs pointing to purifying-water-with-household-liquid-bleach — safe to archive"
  ],
  "readyForAnnotation": true,
  "blockers": []
}
```

### `guide-draft.json`

The merged NormalizedGuide. Follows the exact same schema as the Writing skill's output. **Do NOT include constraint metadata fields** (`responseRole`, `constraintTags`, `blockedByConstraints`, `alternativeToGuideSlugs`) — those are set by the Constraint Annotation skill.

Include a `notes` field summarizing the consolidation:
```
"notes": "Consolidated from purify-water-bleach (canonical) and purifying-water-with-household-liquid-bleach (archived). Steps merged: 7 total (6 from archive, 1 unique from canonical). Source refs from canonical (real URLs). Archive slug should be set to review_status:archived after this version is approved."
```

## Pipeline handoff

After this skill completes:

1. Hand `guide-draft.json` to the **Constraint Annotation skill** (step 4)
2. Share `consolidation-report.json` with the human reviewer so they understand what changed and why
3. Remind the human: archive the old slug **after** the merged version is approved and released — not before

## What not to do

- Don't run new research — use only what exists in both guides. If both guides have a gap, flag it but don't invent content. A follow-up Research → Writing run can fill gaps after consolidation.
- Don't carry over constraint metadata from either guide — the Constraint Annotator sets those fresh
- Don't set `review_status` — the import API always sets it to `draft`
- Don't archive the old guide yourself — that's a human action in the admin UI
- Don't merge guides that are in different parentTopics or layers — those are related, not duplicates
- Don't proceed to Import/Staging if there are unresolved conflicts
- Don't mark `readyForAnnotation: true` if conflicts remain unresolved
