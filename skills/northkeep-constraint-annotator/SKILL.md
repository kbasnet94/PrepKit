---
name: northkeep-constraint-annotator
description: >
  Use this skill to add constraint metadata (responseRole, constraintTags, blockedByConstraints, alternativeToGuideSlugs) to a NorthKeep guide draft. Trigger whenever the user asks to annotate a guide with constraint metadata, add response roles, tag a guide with constraints, set up blocked-by rules, or link alternative guides. Also trigger when a guide-draft.json needs constraint annotation before validation. This is step 4 of the pipeline: Planning → Research → Writing → **Constraint Annotation** → Validation → Import/Staging → Human Review → Release.
---

# NorthKeep Constraint Metadata Annotator

You are adding guide-ranking metadata to a draft guide so the mobile app's grounded chat system can handle follow-up constraints and guide prioritization intelligently. This is a surgical step — you add exactly four fields and change nothing else.

## What constraint metadata does

When a user asks the chat system a question like "how do I purify water?", the system retrieves matching guides. But when the user follows up with "I don't have a heat source," the system needs to know:
- Which guides are blocked by that constraint (`blockedByConstraints: ["no_heat_source"]`)
- Which alternative guides to surface instead (`alternativeToGuideSlugs`)
- Which guide is the primary response vs. backup (`responseRole`)
- Which constraints should boost a guide's relevance (`constraintTags`)

## Inputs

- `guide-draft.json` from the Writing skill (a complete NormalizedGuide without constraint metadata)
- Access to the full guide library (all slugs, all existing constraint metadata) — query Supabase or use the normalized export

## The four fields you set

### responseRole
One of: `"primary"` | `"backup"` | `"supporting"` | `"reference"`

Determines the guide's role within its parentTopic cluster:
- **primary**: The main go-to guide for this topic. Each parentTopic should have at most one primary per layer.
- **backup**: An alternative approach when the primary doesn't apply (e.g., chemical purification when boiling isn't possible).
- **supporting**: Adds context or covers a subtopic but isn't the main answer.
- **reference**: Background information — not surfaced as a direct answer, but available for deeper reading.

To assign correctly, query all guides in the same parentTopic and check their existing roles. Avoid duplicating a `primary` role in the same parentTopic + layer combination.

### constraintTags
Array of strings from the canonical registry. These are constraints under which this guide becomes MORE relevant:

```
no_boiling, no_fire, no_heat_source, no_bleach, no_signal,
in_vehicle, at_night, child, pregnant, cant_move,
no_shelter, no_clean_water, no_water, no_power,
vomiting, getting_worse, alone, confused, unconscious
```

Example: A chemical water purification guide gets `constraintTags: ["no_boiling", "no_fire", "no_heat_source"]` because it becomes more relevant when boiling isn't an option.

Only use tags from this registry. If a guide would benefit from a tag that doesn't exist, note it in your output as a suggestion but don't use it.

### blockedByConstraints
Array of strings from the same registry. These are constraints under which this guide should NOT be surfaced:

Example: A boiling water purification guide gets `blockedByConstraints: ["no_heat_source", "no_fire"]` because it's useless without a heat source.

**Critical rule:** `constraintTags` and `blockedByConstraints` must never overlap on the same guide. A guide cannot be both boosted and blocked by the same constraint.

### alternativeToGuideSlugs
Array of slugs that this guide serves as an alternative to. Must be real slugs that exist in the library.

Example: `"chemical-water-purification"` might have `alternativeToGuideSlugs: ["boiling-water-purification"]` — if the boiling guide is blocked, the chemical guide is a natural substitute.

Prefer alternatives within the same parentTopic. Cross-parentTopic alternatives are valid but should be obvious (e.g., two different approaches to the same problem).

## Process

1. Read the draft guide's category, parentTopic, layer, and content
2. Query the library for all guides in the same parentTopic to understand the existing role distribution
3. Assign `responseRole` based on the guide's position in the cluster
4. Read the guide's content carefully — what constraints make this guide more relevant? What constraints make it useless?
5. Assign `constraintTags` and `blockedByConstraints` from the canonical registry
6. Check the library for natural alternatives and assign `alternativeToGuideSlugs`
7. Verify: no overlap between `constraintTags` and `blockedByConstraints`
8. Verify: all `alternativeToGuideSlugs` are real slugs

## Output

The same NormalizedGuide JSON as the input, with the four constraint metadata fields added. Save as `guide-annotated.json`.

Include a brief annotation summary:
- Why you chose this responseRole
- What constraint tags apply and why
- What's blocked and why
- What alternatives exist

## What not to do

- Don't modify any fields other than the four constraint metadata fields
- Don't use constraint tags not in the canonical registry
- Don't assign `alternativeToGuideSlugs` pointing to slugs that don't exist
- Don't assign `primary` responseRole if the parentTopic already has a primary guide in the same layer (assign `backup` or `supporting` instead)
- Don't leave all four fields empty — every guide should have at least a `responseRole`. The other three may be empty arrays if genuinely not applicable.
- Don't overlap `constraintTags` and `blockedByConstraints`

## Subagent Instructions

This section applies when this skill is spawned as a subagent by `northkeep-orchestrator` during a batch pipeline run.

### Expected prompt inputs

The orchestrator will pass these values inline in the subagent prompt:
- `guideDraftPath` — absolute path to the guide draft produced by the Writing subagent
- `dryRunFolder` — absolute path to the batch run folder (e.g., `/Users/Karan/Desktop/PrepKit/pipeline-dry-run-<topic>`)
- `slug` — the target slug for this guide

### What to do when spawned as a subagent

1. Read this SKILL.md (you are already reading it)
2. Read the guide draft at `guideDraftPath`
3. Query Supabase (or use the library export) to check existing guides in the same parentTopic
4. Assign all four constraint metadata fields following this skill's process
5. Write the annotated guide to: `<dryRunFolder>/<slug>/guide-annotated.json`

### Result message to return

When finished, return a single result message in this format:

```
ANNOTATION COMPLETE
slug: <slug>
status: pass | fail
guideAnnotatedPath: <dryRunFolder>/<slug>/guide-annotated.json
responseRole: primary | backup | supporting | reference
constraintTags: <comma-separated, or "none">
blockedByConstraints: <comma-separated, or "none">
alternativeToGuideSlugs: <comma-separated, or "none">
notes: <any issues, e.g. suggested new tags not in registry, role conflicts found>
```

If annotation cannot be completed (e.g., unresolvable role conflict in the cluster), set `status: fail` and explain in `notes`. The orchestrator will surface this to the user before proceeding.
