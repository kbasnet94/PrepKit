---
name: prepkit-writing
description: >
  Use this skill whenever the user wants to create, write, draft, author, or convert content into a PrepKit guide JSON. Triggers include: writing a new guide from scratch, writing from a research packet, importing or transforming an article/source into a guide, reviewing or editing existing guide JSON, or asking about correct guide fields, taxonomy, or structure. Also trigger when the user pastes a source article and wants it turned into a guide, asks whether a guide should be an action_card vs reference_guide, or hands off a research-packet.json for guide production. This is step 3 of the pipeline: Planning → Research → **Writing** → Constraint Annotation → Validation → Import/Staging → Human Review → Release.
---

# PrepKit Writing Skill

You are producing app-ready guide JSON for an offline-first emergency guidance app. Your output must match the NormalizedGuide schema exactly so it can flow through Constraint Annotation → Validation → Import without manual fixes.

## Core principles

**Safety first.** Never invent safety advice. Every claim in `stepByStepActions`, `warnings`, `redFlags`, and `whatNotToDo` must be grounded in the research packet or widely established emergency guidance.

**Prefer existing structure.** Don't create new categories, layers, or guideTypes. Use only the established taxonomy below.

**Be deterministic.** Same input should produce the same output. Avoid vague or hedging language in action-oriented fields.

## Inputs

This skill accepts any of these:
- A `research-packet.json` from the Research skill (preferred — contains sourced claims and recommendations)
- A direct request from the user to write a guide on a topic
- Source content (article, manual excerpt) the user wants transformed into a guide

When a research packet is available, use it as the primary source of truth. Map `researchFindings` directly to guide fields. Do not add claims not present in the packet.

## Taxonomy

### Categories
`communication` · `core_skills` · `medical_safety` · `natural_disasters` · `navigation` · `power_utilities_home_safety` · `preparedness` · `shelter_fire_warmth` · `water_food` · `weather_environment`

### Layers & guideTypes (always paired)
| layer | guideType | When to use |
|---|---|---|
| `action` | `action_card` | Immediate step-by-step response to an active emergency. Short, scannable. |
| `reference` | `reference_guide` | Background knowledge, how-things-work, deeper reading. Not crisis-moment content. |
| `preparedness` | `preparedness_guide` | Before-the-emergency planning, kit building, drills. |
| `scenario` | `scenario_guide` | Multi-step situational walkthroughs ("you're stranded in X, here's what to do"). |

### sourceQuality (canonical DB values — use only these)
`strong` · `mixed` · `weak`

### contentStatus values
`draft` · `reference_summary` · `reviewed` · `approved` · `needs_source_review`

### integrationDecision values
`existing` · `new` · `upgrade` · `exclude`

## Required fields (always include all of these)

```
slug                  - kebab-case unique identifier
title                 - Human-readable title
category              - From taxonomy above
parentTopic           - Descriptive grouping within category (e.g. "Land Rescue Signaling")
layer                 - From taxonomy above
guideType             - From taxonomy above (must match layer)
summary               - 1–2 sentence overview
quickAnswer           - The single most important thing to know, as one sentence
whenToUse             - Array of strings: contexts where this guide is relevant
preferredAction       - String or null: the #1 recommended action
backupAction          - String or null: fallback if preferred isn't possible
stepByStepActions     - Array of strings (for action_cards/scenario_guides); empty array for reference/preparedness
warnings              - Array of strings: things that could make the situation worse
whatNotToDo           - Array of strings: common dangerous mistakes
redFlags              - Array of strings: signs that the situation is escalating/dangerous
preparednessTips      - Array of strings: what to prepare in advance
sourceQuality         - "strong" | "mixed" | "weak"
contentStatus         - From values above; default to "draft"
integrationDecision   - From values above
upgradesGuide         - slug of guide this replaces, or null
appTags               - Array of strings for search/filtering
sourceReferences      - Array of { title, organization, url, whyUseful }
```

**Do NOT populate constraint metadata fields** — that is the Constraint Annotation skill's job. Omit `responseRole`, `constraintTags`, `blockedByConstraints`, and `alternativeToGuideSlugs` from your output.

**Use camelCase throughout. Do not add fields not listed above.**

## Workflow

### When writing from a research packet

1. Read the packet's `suggestedLayer`, `suggestedGuideType`, `workItemRef.category`, and `workItemRef.parentTopic`
2. Map each `researchFinding` to the appropriate guide field based on its `fieldRelevance`
3. Respect `conflictsOrWeakClaims` — if a claim was resolved as "omit," do not include it
4. Build `sourceReferences` from the unique sources cited in `researchFindings`
5. Set `sourceQuality` to match the packet's `topicSourceQuality`
6. If upgrading (`existingGuideUpgradeTarget` is set), set `upgradesGuide` to that slug and `integrationDecision` to `"upgrade"`

### When authoring from scratch (no research packet)

1. Ask (or infer from context): topic, intended layer/guideType, category
2. Use your training knowledge as a well-sourced emergency reference — but be conservative
3. Fill every required field; use `null` or `[]` for fields with no applicable content (never omit them)
4. Set `contentStatus: "draft"` and `integrationDecision: "new"`

### When transforming source content

1. Read the source carefully before writing anything
2. Extract claims directly from the source — don't add information not present
3. Map source content to the correct fields
4. Populate `sourceReferences` from the source URL/title
5. Set `sourceQuality` honestly based on the source (government/medical org → `strong`; mixed sources → `mixed`; blog/forum → `weak`)

## Output format

Always output in this order:

1. **The guide JSON** — complete, valid, copyable
2. **Decision summary** — 3–5 sentences explaining:
   - Why you chose this layer/guideType
   - Any fields left null/empty and why
   - Source quality assessment
   - Whether this upgrades an existing guide

## Field guidance

### stepByStepActions
- Action cards: 3–10 concrete, imperative steps. Each step is a standalone string. Keep them scannable — someone reading this is in an emergency.
- Reference guides: always `[]`. Reference guides explain, they don't instruct.
- Preparedness guides: always `[]`. Put preparation steps in `preparednessTips` instead.

### warnings vs. whatNotToDo
- `warnings`: things about the *situation* that could make it worse ("Gas can accumulate in enclosed spaces")
- `whatNotToDo`: things the *person* might do wrong ("Do not use electrical switches near a gas leak")

### sourceReferences
Each entry must have all four fields:
```json
{
  "title": "Name of the document or page",
  "organization": "Publishing organization",
  "url": "https://... or null if URL unknown",
  "whyUseful": "One sentence on what this source contributes"
}
```

### Slug conventions
- All lowercase kebab-case: `earthquake-indoor-safety`
- Be specific enough to be unique, concise enough to be readable
- Mirror the title closely: "CPR for Adults" → `cpr-adults`

### parentTopic conventions
Group related guides under a shared parentTopic string. Look at sibling guides in the same category for the right grouping.

## What not to do

- Don't invent warnings, red flags, or steps that aren't grounded in source material
- Don't create new categories, layers, or guideTypes
- Don't include extra fields not in the schema
- Don't use snake_case — always camelCase
- Don't leave out required fields, even if their value is `null` or `[]`
- Don't write stepByStepActions for reference_guides or preparedness_guides
- Don't use `"high"`, `"low"`, or `"unknown"` for sourceQuality — only `"strong"`, `"mixed"`, `"weak"`
- Don't populate constraint metadata fields (responseRole, constraintTags, etc.)
