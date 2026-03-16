---
name: northkeep-validation
description: >
  Use this skill to validate a NorthKeep guide draft for schema correctness, safety issues, duplicate risk, unsupported claims, missing warnings/red flags, taxonomy fit, and constraint metadata correctness. Trigger whenever the user asks to validate a guide, check a guide for errors, review a draft before import, or run quality checks on guide content. Also trigger when a guide-annotated.json needs validation before staging. This is step 5 of the pipeline: Planning → Research → Writing → Constraint Annotation → **Validation** → Import/Staging → Human Review → Release.
---

# NorthKeep Validation / Safety Skill

You are the quality gate before content enters the admin workflow. Your job is to catch schema errors, safety issues, and content problems that would be expensive to fix after import. Be thorough but fair — flag real problems, not style preferences.

## Inputs

- `guide-annotated.json` — the guide with constraint metadata (from the Constraint Annotator)
- `research-packet.json` — the source research (from the Research skill), if available
- Access to the full guide library (for duplicate detection and slug validation)
- The evidence tier for this guide (from the planning phase or user specification)

## Validation categories

### 1. Schema checks (automated, binary pass/fail)

These are structural requirements. If any fails, the guide cannot be imported.

| Check | Rule |
|---|---|
| **required_fields_present** | All 22 required fields exist (slug, title, category, parentTopic, layer, guideType, summary, quickAnswer, whenToUse, preferredAction, backupAction, stepByStepActions, warnings, whatNotToDo, redFlags, preparednessTips, sourceQuality, contentStatus, integrationDecision, upgradesGuide, appTags, sourceReferences) |
| **layer_guidetype_matched** | layer and guideType are a valid pair (action→action_card, reference→reference_guide, preparedness→preparedness_guide, scenario→scenario_guide) |
| **valid_category** | category is one of the 10 canonical values |
| **valid_source_quality** | sourceQuality is `"strong"` or `"mixed"` or `"weak"` |
| **array_fields_flat** | whenToUse, stepByStepActions, warnings, whatNotToDo, redFlags, preparednessTips, appTags are all flat arrays of strings (no nested objects) |
| **source_refs_schema** | Each sourceReferences entry is `{ title, organization, url, whyUseful }` |
| **constraint_tags_valid** | constraintTags and blockedByConstraints contain only tags from the canonical registry: no_boiling, no_fire, no_heat_source, no_bleach, no_signal, in_vehicle, at_night, child, pregnant, cant_move, no_shelter, no_clean_water, no_water, no_power, vomiting, getting_worse, alone, confused, unconscious |
| **response_role_valid** | responseRole is one of primary, backup, supporting, reference (or null) |
| **alt_slugs_exist** | Every slug in alternativeToGuideSlugs exists in the guide library |
| **no_constraint_overlap** | constraintTags and blockedByConstraints have no tags in common |
| **camelCase_fields** | All field names use camelCase (not snake_case) |
| **slug_format** | slug is lowercase kebab-case, no spaces, no uppercase |

### 2. Safety checks (flagged for human review)

These are content quality issues. They produce warnings or blocking issues depending on severity.

| Check | Rule | Severity |
|---|---|---|
| **claims_sourced** | Every claim in stepByStepActions, warnings, whatNotToDo has a matching finding in the research packet | blocking (if research packet available) |
| **no_invented_advice** | No medical or safety claims appear that aren't in the research packet or widely established guidance | blocking |
| **action_card_has_steps** | action_card guides have at least 3 stepByStepActions | blocking |
| **action_has_warnings** | action_card and scenario_guide have non-empty warnings | warning |
| **action_has_red_flags** | action_card and scenario_guide have non-empty redFlags | warning |
| **reference_no_steps** | reference_guide and preparedness_guide have empty stepByStepActions | warning |
| **source_quality_matches_tier** | If evidence tier is authoritative_only, sourceQuality should be "strong". If sources are mixed-tier, sourceQuality should reflect that honestly. | warning |
| **no_dropped_warnings** | If upgrading an existing guide, all warnings and redFlags from the previous version are either preserved or explicitly explained as removed | blocking |

### 3. Duplicate / upgrade checks

| Check | Rule | Severity |
|---|---|---|
| **upgrade_target_exists** | If integrationDecision is "upgrade", upgradesGuide points to a real slug | blocking |
| **no_duplicate_new** | If integrationDecision is "new", no existing guide has the same category + parentTopic + layer + substantially similar title | warning |
| **upgrade_slug_matches** | If upgrading, the guide's category and parentTopic are consistent with the target guide's | warning |

### 4. Constraint metadata checks

| Check | Rule | Severity |
|---|---|---|
| **role_not_duplicated** | responseRole "primary" doesn't conflict with another guide's primary role in the same parentTopic + layer | warning |
| **alt_slugs_same_topic** | alternativeToGuideSlugs are preferably in the same parentTopic | warning |
| **blocked_makes_sense** | blockedByConstraints are logically consistent with the guide's content (e.g., a guide about boiling water should be blocked by no_heat_source) | warning |

## Output format

Produce `validation-report.json`:

```json
{
  "slug": "guide-slug",
  "validatedAt": "ISO timestamp",
  "overallResult": "pass | fail | pass_with_warnings",
  "evidenceTier": "authoritative_only",
  "schemaChecks": [
    {
      "check": "required_fields_present",
      "passed": true,
      "evidence": "All 22 fields present"
    }
  ],
  "safetyChecks": [
    {
      "check": "claims_sourced",
      "passed": false,
      "severity": "blocking",
      "evidence": "stepByStepActions[4] 'Apply ice directly to the burn' has no matching research finding and contradicts ARC guidelines"
    }
  ],
  "duplicateChecks": [],
  "constraintChecks": [],
  "blockingIssues": [
    "stepByStepActions[4] contains unsourced claim that contradicts authoritative guidance"
  ],
  "warnings": [
    "redFlags array is empty — consider adding escalation indicators"
  ],
  "recommendation": "Fix blocking issues and re-validate. Warnings should be reviewed by a human but do not block import."
}
```

## Result interpretation

- **pass**: All schema checks pass, no blocking safety/duplicate issues. May proceed to Import.
- **pass_with_warnings**: All schema checks pass, no blocking issues, but warnings exist. May proceed to Import, but warnings should be visible to the human reviewer.
- **fail**: One or more blocking issues. Must loop back to the appropriate upstream skill:
  - Schema failures → Writing skill
  - Safety/content failures → Writing skill (may need Research re-run if sources are inadequate)
  - Constraint metadata failures → Constraint Annotator

## What not to do

- Don't fix the guide yourself — produce a report. The upstream skill makes the fix.
- Don't flag style preferences as blocking issues. "I would have phrased it differently" is not a validation failure.
- Don't skip the research-packet cross-check when a packet is available — it's the most important safety check.
- Don't let a guide through with `sourceQuality: "strong"` if the sourceReferences are empty or contain only organization names without URLs.
