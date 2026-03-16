---
name: northkeep-orchestrator
description: >
  Use this skill to run a batch pipeline for multiple NorthKeep guides in parallel. Trigger when the user wants to process 2 or more guides from a planning-packet in one run, asks to "run the batch," "process all work items," or "kick off the pipeline for all of these." Do NOT trigger for single-guide runs — use the individual skills directly instead. This skill coordinates steps 2–6: Research → Writing → Constraint Annotation → Validation → Import/Staging, using subagents to parallelize the per-guide work.
---

# NorthKeep Orchestrator Skill

You are coordinating a batch pipeline run across multiple guides in parallel. Your job is to spawn and manage subagents, collect their results, surface failures clearly, and run Import/Staging sequentially once the parallel phase is done.

## When to use this skill

Use the orchestrator when:
- The planning packet contains **2 or more work items** to process in one run
- The user asks to process a batch, run all work items, or kick off the full pipeline for multiple guides at once

Do NOT use the orchestrator for:
- Single-guide runs — run the individual skills directly, step by step
- Re-running a single failed guide from a previous batch — run the individual skills on that guide
- Consolidation runs — the `northkeep-consolidator` skill handles pairs and doesn't benefit from parallelism

## Inputs

- `planning-packet.json` — produced by `northkeep-planning`, contains the `workItems` array and library snapshot
- The path to the dry run working folder (e.g., `pipeline-dry-run-<topic>/`)

## Phase 1: Setup

1. Read `planning-packet.json` to get all work items
2. For each work item, determine the pipeline branch:
   - `action: "new"` or `action: "upgrade"` → **Research → Writing → Constraint Annotation → Validation**
   - `action: "consolidate"` → Route to `northkeep-consolidator` separately (not orchestrated — run manually)
3. Create the dry run folder if it doesn't exist
4. Create a `<slug>/` subfolder inside it for each guide that will be processed

## Phase 2: Parallel execution

Spawn one subagent per guide **in a single message** (all in parallel). Each subagent runs the full Research → Writing → Constraint Annotation → Validation chain for its assigned guide.

### Subagent prompt template

Use this prompt structure for each subagent (fill in the values for each guide):

```
You are running a 4-step pipeline for a single NorthKeep guide. Complete all four steps in sequence and write each artifact to disk.

Work item:
<paste the full workItem JSON object here>

Evidence tier: <evidenceTier from planning packet>
Dry run folder: <absolute path to dryRunFolder>/<slug>/
Slug: <slug>

Steps to complete:
1. Read skills/northkeep-research/SKILL.md, then research this topic and write research-packet.json to the slug subfolder
2. Read skills/northkeep-writing/SKILL.md, then write guide-draft.json from the research packet
3. Read skills/northkeep-constraint-annotator/SKILL.md, then annotate the draft and write guide-annotated.json
4. Read skills/northkeep-validation/SKILL.md, then validate and write validation-report.json

After completing all four steps, return a result message following the format in the northkeep-validation Subagent Instructions section.
```

### Parallelism rule

All subagent calls for Phase 2 must be made in a **single message** with multiple Agent tool calls. Do not spawn them sequentially — that defeats the purpose.

## Phase 3: Collect results

Wait for all subagents to complete. Then for each guide, record:
- `status`: pass | fail
- `overallResult`: pass | pass_with_warnings | fail
- `blockingIssues`: list or "none"
- `warnings`: list or "none"

## Phase 4: Present summary to user

Before touching the import API, show the user a results table:

```
BATCH RUN SUMMARY
─────────────────────────────────────────────────────
Slug                          Result         Issues
─────────────────────────────────────────────────────
tornado-preparedness          ✅ pass
flood-preparedness            ✅ pass_with_warnings  1 warning
wildfire-preparedness         ❌ fail        Missing redFlags
─────────────────────────────────────────────────────
2 ready to import. 1 needs fixes.
```

Ask the user: **"Which guides should I import? (all passing / select / none)"**

Do not proceed to import until the user responds.

## Phase 5: Import/Staging (sequential)

For each guide the user approves:

1. Read `skills/northkeep-import-staging/SKILL.md`
2. Run the import-staging skill for that guide using the `guide-annotated.json` in its slug subfolder
3. Write `import-receipt.json` to the slug subfolder
4. Show the user the import result before moving to the next guide

After all imports are complete, write `import-receipts.json` to the dry run root folder as a consolidated summary:

```json
[
  {
    "slug": "tornado-preparedness",
    "guideId": "...",
    "versionId": "...",
    "versionNumber": 1,
    "isNew": true,
    "reviewStatus": "draft",
    "importReceiptPath": "pipeline-dry-run-<topic>/tornado-preparedness/import-receipt.json"
  }
]
```

## Phase 6: Write batch-run-summary.json

Write a final summary to the dry run root folder:

```json
{
  "batchRunAt": "ISO timestamp",
  "dryRunFolder": "<path>",
  "totalGuides": 3,
  "passed": 2,
  "failed": 1,
  "imported": 2,
  "guides": [
    {
      "slug": "tornado-preparedness",
      "workItemAction": "new",
      "validationResult": "pass",
      "imported": true,
      "versionId": "...",
      "artifactFolder": "pipeline-dry-run-<topic>/tornado-preparedness/"
    }
  ]
}
```

## Artifact directory structure

Batch runs use per-guide subfolders:

```
pipeline-dry-run-<topic>/
├── planning-packet.json          ← Already exists (Step 1 output)
├── batch-run-summary.json        ← Written by orchestrator (Phase 6)
├── import-receipts.json          ← Written by orchestrator (Phase 5)
├── <slug-a>/
│   ├── research-packet.json
│   ├── guide-draft.json
│   ├── guide-annotated.json
│   ├── validation-report.json
│   └── import-receipt.json
└── <slug-b>/
    ├── research-packet.json
    ├── guide-draft.json
    ├── guide-annotated.json
    ├── validation-report.json
    └── import-receipt.json
```

## Failure handling

- If a subagent fails at any step (research, writing, annotation, or validation), mark that guide as `failed` in the summary
- Failed guides are excluded from the import offer — the user must re-run them individually using the individual skills
- A failure in one guide **never blocks** the rest of the batch
- If ALL guides fail, do not proceed to import — report the situation to the user

## What not to do

- Don't spawn subagents sequentially — all Phase 2 subagents must be launched in one parallel message
- Don't call the import API before showing the user the Phase 4 summary and getting confirmation
- Don't use the orchestrator for single-guide runs
- Don't attempt to orchestrate consolidation runs — handle those manually with `northkeep-consolidator`
- Don't skip writing `batch-run-summary.json` — it's the persistent record of what happened in this run
