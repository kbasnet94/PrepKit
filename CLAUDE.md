# NorthKeep — Project Instructions for Claude

## What this project is

NorthKeep is an offline emergency survival app. This repo contains two main parts:

- **NorthKeep Mobile** (`NorthKeep/`) — React Native mobile app (read-only reference; don't modify unless asked)
- **NorthKeepAdmin** (`NorthKeepAdmin/northkeep-admin/`) — Next.js admin app for managing guide content, running at `localhost:3000`

The admin app connects to a **Supabase** backend. Credentials are in `NorthKeepAdmin/northkeep-admin/.env.local`.

## The guide content pipeline

NorthKeep uses an eight-step pipeline to create and upgrade emergency guides. **This is the most important workflow in the project.** When someone asks to "run the pipeline," "do a dry run," "check for gaps," "add a new topic," or "kick off the flow," they mean this pipeline.

```
Planning → Research → Writing → Constraint Annotation → Validation → Tool Extraction → Import/Staging → Human Review → Release
```

For duplicate guides, a **Consolidation** step replaces Research + Writing:
```
Planning → Consolidation → Constraint Annotation → Validation → Tool Extraction → Import/Staging → Human Review → Release
```

### Pipeline skills

Each step has a skill with detailed instructions in `skills/<skill-name>/SKILL.md`. **Always read the relevant SKILL.md before executing a pipeline step.** The skills are:

| Step | Skill | Input | Output |
|------|-------|-------|--------|
| 1. Planning | `northkeep-planning` | DB query or JSON export | `planning-packet.json` |
| 2. Research | `northkeep-research` | Planning packet + evidence tier | `research-packet.json` |
| 3. Writing | `northkeep-writing` | Research packet | `guide-draft.json` |
| 3a. Consolidation | `northkeep-consolidator` | Two duplicate guides | `consolidation-report.json` + `guide-draft.json` |
| 4. Constraint Annotation | `northkeep-constraint-annotator` | Guide draft + full library context | `guide-annotated.json` |
| 5. Validation | `northkeep-validation` | Annotated guide + research packet + library | `validation-report.json` |
| 5.5. Tool Extraction | `northkeep-tool-extractor` | Validated guide | `guide-with-tools.json` |
| 6. Import/Staging | `northkeep-import-staging` | Guide with tools (validated) | `import-receipt.json` |
| 7. Human Review | Manual in admin UI | — | Status change: draft → in_review → approved |
| 8. Release | `northkeep-release` | Approved versions | Published release bundle |

**For batch runs (2+ guides):** Use `northkeep-orchestrator` instead of running steps 2–6 manually. The orchestrator spawns one subagent per guide in parallel, collects results, and runs Import/Staging sequentially with user confirmation. Single-guide runs still use the individual skills directly.

### Pipeline architecture doc

Full details on every skill's inputs, outputs, and handoff contracts: `northkeep-skill-pipeline-architecture.md`

### Completed pipeline run examples

Three completed dry runs exist as reference for artifact format and content quality:

- `pipeline-dry-run/` — `during-landslide` (upgrade, action_card)
- `pipeline-dry-run-water/` — `purify-water-boiling` (upgrade, action_card, constraint-heavy)
- `pipeline-dry-run-bleach-consolidation/` — `purify-water-bleach` (consolidation of two duplicates)

Each folder contains the full chain of artifacts produced at every step.

## Running a pipeline dry run

When asked to run the pipeline:

1. **Create a working folder** for this run (e.g., `pipeline-dry-run-<topic>/`)
2. **Read the skill SKILL.md** before each step
3. **Produce the output artifact** as a JSON file in the working folder
4. **Stop at staging** unless told to import — "dry run" means produce all artifacts but don't call the import API

### Starting a new pipeline run

If the user says something like "check the database and recommend a topic" or "scan for gaps":

1. Read `skills/northkeep-planning/SKILL.md`
2. Query Supabase for the full guide library (guides + latest versions with constraint metadata)
3. Apply the weak-guide criteria and gap analysis from the planning skill
4. Present findings and let the user pick what to work on
5. Then proceed through Research → Writing → Constraint Annotation → Validation → Import/Staging

## Key technical details

### NormalizedGuide schema

The guide JSON format uses **camelCase** field names with these required fields: `slug`, `title`, `category`, `parentTopic`, `layer`, `guideType`, `summary`, `quickAnswer`, `whenToUse`, `preferredAction`, `backupAction`, `stepByStepActions`, `warnings`, `whatNotToDo`, `redFlags`, `preparednessTips`, `sourceQuality`, `contentStatus`, `integrationDecision`, `appTags`, `sourceReferences`, `notes`.

- `sourceQuality` must be `"strong"` | `"mixed"` | `"weak"` (DB enum values)
- `sourceReferences` are objects: `{ title, organization, url, whyUseful }`
- All array fields are flat arrays of strings
- Constraint metadata fields are added ONLY by the Constraint Annotator step, never by Writing

### Constraint metadata fields

These four fields control how the mobile chat system ranks guides:

- `responseRole`: `"primary"` | `"backup"` | `"supporting"` | `"reference"` — guide's rank within its parentTopic cluster
- `constraintTags`: Tags that BOOST this guide's relevance (e.g., bleach guide gets `["no_boiling", "no_fire"]`)
- `blockedByConstraints`: Tags that SUPPRESS this guide (e.g., boiling guide gets `["no_boiling", "no_fire", "no_heat_source"]`)
- `alternativeToGuideSlugs`: Links to fallback targets (must be real slugs)

### Canonical constraint tag registry (19 tags)

```
no_boiling, no_fire, no_heat_source, no_bleach, no_signal, in_vehicle,
at_night, child, pregnant, cant_move, no_shelter, no_clean_water,
no_water, no_power, vomiting, getting_worse, alone, confused, unconscious
```

Defined in `NorthKeepAdmin/northkeep-admin/src/lib/constants/constraint-tags.ts`. New tags require a code change — skills can suggest but not unilaterally add.

### Admin app API endpoints

- `POST /api/guides/import?action=preview` — Preview a guide import (shows diff)
- `POST /api/guides/import?action=save` — Save a guide import (creates version at `review_status: "draft"`)
- `PATCH /api/guides/versions/{versionId}/review-status` — Update review status (`draft`, `in_review`, `approved`, `archived`)
- `PATCH /api/guides/{guideId}/versions/{versionId}` — Update guide content fields
- `POST /api/releases` — Create a release
- `POST /api/releases/{id}/items` — Add guide versions to a release
- `POST /api/releases/{id}/generate` — Generate release bundle
- `POST /api/releases/{id}/publish` — Publish a release

### Database

Supabase (PostgreSQL). Key tables: `guides`, `guide_versions`, `guide_categories`, `guide_parent_topics`, `releases`, `release_items`. The admin app uses the **anon key** (not service role) via `createAdminClient()` in `NorthKeepAdmin/northkeep-admin/src/lib/supabase/admin.ts`.

### Fallback chain pattern

Guides within a parentTopic form fallback chains. Example (Safe Drinking Water):

| Tier | Slug | Role | Boosted by | Blocked by |
|------|------|------|-----------|------------|
| 1 | `purify-water-boiling` | primary | — | no_boiling, no_fire, no_heat_source |
| 2 | `purify-water-bleach` | backup | no_boiling, no_fire, no_heat_source | no_bleach |
| 3 | `choosing-safe-hydration-sources` | supporting | no_bleach, no_clean_water | — |

When the user says "I can't boil water," the chat system blocks tier 1 and boosts tier 2.

## What NOT to do

- Don't modify the mobile app code unless explicitly asked
- Don't skip reading the SKILL.md before running a pipeline step
- Don't add constraint metadata during the Writing step (that's the Constraint Annotator's job)
- Don't invent new constraint tags outside the 19-tag registry without discussing it
- Don't import a guide that failed validation — fix it first and re-validate
- Don't set `review_status` to `"published"` directly — that's managed through the Release flow
