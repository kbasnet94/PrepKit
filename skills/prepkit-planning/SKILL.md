---
name: prepkit-planning
description: >
  Use this skill to analyze the PrepKit guide library and produce a prioritized work plan identifying missing guides, weak guides needing upgrades, and duplicate coverage risks. Trigger whenever the user asks about gaps in guide coverage, what guides need improvement, what topics are missing, what should be written next, or wants to plan a batch of guide work. Also trigger when the user says "plan", "audit", "coverage check", "what's missing", "what needs work", or references guide quality across the library. This is the first step in the PrepKit content pipeline.
---

# PrepKit Planning Skill

You are analyzing the PrepKit emergency guidance library to produce a prioritized content plan. This is step 1 of the pipeline: **Planning → Research → Writing → Constraint Annotation → Validation → Import/Staging → Human Review → Release**.

## Your job

Scan the guide library, identify what's missing or weak, and produce a `planning-packet.json` that tells downstream skills exactly what to work on and to what standard.

## Data source

Query Supabase as the primary source of truth. Use the admin client to fetch all guides with their latest versions:

```sql
SELECT g.slug, g.title, g.is_active,
       gv.layer, gv.guide_type, gv.summary, gv.quick_answer,
       gv.when_to_use, gv.step_by_step_actions, gv.warnings,
       gv.what_not_to_do, gv.red_flags, gv.preparedness_tips,
       gv.source_quality, gv.content_status, gv.source_references,
       gv.response_role, gv.constraint_tags, gv.review_status,
       gc.slug as category_slug, gc.name as category_name,
       gpt.slug as parent_topic_slug, gpt.name as parent_topic_name
FROM guides g
LEFT JOIN guide_versions gv ON gv.guide_id = g.id
LEFT JOIN guide_categories gc ON gc.id = g.category_id
LEFT JOIN guide_parent_topics gpt ON gpt.id = g.parent_topic_id
WHERE g.is_active = true
ORDER BY gv.version_number DESC
```

Fallback: if Supabase is unavailable, read `guides_master_export.normalized.json` from the admin app's `data/` directory.

## Weak-guide criteria

A guide is flagged as weak if it has one or more of these issues:

- **missing_warnings**: `warnings` array is empty on an action_card or scenario_guide
- **missing_red_flags**: `redFlags` array is empty on an action_card or scenario_guide
- **weak_sources**: `source_quality` is `"weak"` or null, OR `source_references` is empty or contains entries without URLs
- **placeholder_content**: `summary` or `quick_answer` is null, empty, or duplicates the title verbatim
- **shallow_steps**: `step_by_step_actions` has fewer than 3 items on an action_card
- **missing_parent_topic**: `parent_topic_id` is null
- **needs_source_review**: `content_status` is `"needs_source_review"`
- **duplicate_overlap**: another guide exists with the same category + parentTopic + layer combination and substantially similar title

## Evidence tiers

Assign one of these tiers to each work item. The tier determines what sources the Research skill can use and what the Validation skill will check:

- **authoritative_only**: Only government agencies, established medical organizations, peer-reviewed guidelines. Use for medical/safety content where bad advice could cause harm.
- **authoritative_plus_field_practice**: Above + established field manuals, military survival guides, Wilderness Medical Society, recognized outdoor education programs. Use for wilderness/survival skills where field-tested knowledge matters.
- **authoritative_plus_examples**: Above + well-documented case studies, incident reports, reputable journalism. Use for scenario guides and preparedness content where real-world examples add value.

Default to `authoritative_only` for any guide in `medical_safety` category or with `action` layer. Use your judgment for others based on the topic's safety criticality.

## Coverage baseline

The 10 categories should each have reasonable coverage across layers. Flag gaps like:
- A category with action_cards but no corresponding preparedness_guides
- A parentTopic with only reference content and no actionable guidance
- Common emergencies (house fire, earthquake, severe bleeding, choking, heat stroke, hypothermia, flooding, power outage, car accident) with no action_card

Don't be exhaustive — focus on the most impactful gaps. Prioritize by: (1) safety criticality, (2) how common the emergency is, (3) how weak the existing coverage is.

## Output format

Produce `planning-packet.json` with this structure:

```json
{
  "generatedAt": "ISO timestamp",
  "librarySnapshot": {
    "totalGuides": 187,
    "byCategory": { "medical_safety": 34 },
    "byLayer": { "action": 62 },
    "byReviewStatus": { "draft": 12, "approved": 150 }
  },
  "workItems": [
    {
      "priority": 1,
      "action": "upgrade | new",
      "targetSlug": "existing-slug or null",
      "suggestedSlug": "new-slug-if-new or null",
      "reason": "Human-readable explanation",
      "weaknessFlags": ["missing_warnings", "weak_sources"],
      "category": "medical_safety",
      "parentTopic": "Bleeding Control",
      "suggestedLayer": "action",
      "suggestedGuideType": "action_card",
      "evidenceTier": "authoritative_only",
      "estimatedEffort": "low | medium | high"
    }
  ],
  "duplicateRisks": [
    {
      "slugA": "guide-a",
      "slugB": "guide-b",
      "overlapDescription": "What overlaps",
      "recommendation": "Merge, archive one, or keep both with differentiated scope"
    }
  ]
}
```

## What not to do

- Don't recommend creating guides outside the 10 existing categories unless the user explicitly asks
- Don't flag a guide as weak just because it's a reference_guide with empty stepByStepActions (that's correct behavior)
- Don't assign evidence tiers lower than `authoritative_only` for medical or immediate-safety content
- Don't produce more than 20 work items at once — prioritize ruthlessly
