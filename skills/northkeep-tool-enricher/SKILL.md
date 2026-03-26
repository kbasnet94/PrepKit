---
name: northkeep-tool-enricher
description: >
  Enrich the canonical tool library with descriptions, use cases, icons, Amazon keywords,
  and product variants. Runs against the full tools table, not individual guides.
  Trigger when asked to "enrich tools", "add variants", "improve tool metadata",
  "set up Amazon links for tools", or "curate tool library".
---

# Tool Enricher

## What this skill does

Analyzes the entire canonical `tools` table and produces enrichment recommendations for each tool — improved descriptions, use cases, Ionicons icon names, Amazon search keywords, and **product variants** (subtypes with individual Amazon links).

This is a **standalone skill**, not part of the per-guide pipeline. It operates on the tool library as a whole.

## When to run

- After a batch of guides has been imported and the `tools` table has new entries
- When setting up Amazon affiliate links for the first time
- When a tool's metadata feels thin (no description, no use cases, no variants)
- Periodically as the tool library grows

## Inputs

- Access to Supabase via `createAdminClient()`
- The full `tools` table
- Guide usage data from `guide_version_tools` (for context on how each tool is used)

## Outputs

### `tool-enrichment-report.json`

```json
{
  "generatedAt": "2026-03-26T...",
  "totalTools": 84,
  "enriched": 42,
  "skipped": 42,
  "tools": [
    {
      "toolId": "uuid",
      "name": "Radio",
      "category": "Communication",
      "guideCount": 26,
      "currentDescription": "A radio used in survival and emergency preparedness",
      "recommendations": {
        "description": "A portable receiver for monitoring NOAA weather alerts, emergency broadcasts, and AM/FM stations during disasters and power outages.",
        "useCases": [
          "Monitor NOAA weather alerts during severe weather",
          "Receive emergency broadcast system (EBS) updates",
          "Stay informed during extended power outages"
        ],
        "icon": "radio-outline",
        "amazonSearchKeywords": "emergency radio NOAA weather",
        "variants": [
          {
            "label": "Hand-Crank Radio",
            "description": "No batteries needed. Most models include NOAA weather bands, a built-in flashlight, and USB charging port.",
            "amazonSearchKeywords": "hand crank emergency radio NOAA weather flashlight"
          },
          {
            "label": "Solar-Powered Radio",
            "description": "Charges via built-in solar panel. Ideal for extended outages. Often paired with hand-crank backup.",
            "amazonSearchKeywords": "solar powered emergency radio NOAA"
          },
          {
            "label": "Battery-Operated Radio",
            "description": "Reliable and familiar. Stock extra AA or AAA batteries in your emergency kit.",
            "amazonSearchKeywords": "battery operated emergency AM FM radio"
          }
        ]
      },
      "reasoning": "Radio has 3 clearly distinct power-source types that affect purchasing decisions."
    }
  ]
}
```

## Process

### Phase 1: Fetch tool library

1. Query all tools: `SELECT * FROM tools ORDER BY category, name`
2. Query usage counts: `SELECT tool_id, COUNT(*) FROM guide_version_tools GROUP BY tool_id`
3. Query sample contexts: For each tool, fetch up to 5 `guide_version_tools.context` values to understand how the tool is used in guides

### Phase 2: Analyze each tool

For each tool, determine:

#### Description
- If the current description is generic (e.g., "A [name] used in survival and emergency preparedness"), write a specific 1-2 sentence description
- Focus on: what it does, why it matters in emergencies, key features

#### Use Cases (max 3)
- Specific scenarios where this tool is essential
- Draw from guide contexts if available
- Example: "Purify questionable water sources when chemical treatment is unavailable"

#### Icon
- Must be a valid Ionicons name (e.g., `radio-outline`, `flashlight-outline`, `medkit-outline`)
- Use `-outline` suffix for consistency
- Reference: https://ionic.io/ionicons

#### Amazon Search Keywords
- The default/fallback search keywords for tools without variants
- Should return relevant emergency/survival products on Amazon
- Include qualifying words: "emergency", "survival", "NOAA", brand-neutral terms

#### Variants (0-4)
Apply these decision rules:

| Condition | Variants | Example |
|-----------|----------|---------|
| Tool has 2-4 clearly distinct product types that affect purchasing | Yes, 2-4 | Radio → Hand-Crank / Solar / Battery |
| Tool has meaningful size/material variants | Yes, 2-3 | Tarp → Small (8x10) / Large (12x16) |
| Tool is already specific | No | Paracord, Duct Tape, SAM Splint |
| Tool has too many types to narrow (>5) | No, use broad keywords | Batteries, Bandages |
| Tool is a technique, not a product | No | "Tourniquet" (it's a product), but "Pressure technique" (not a product) |

Each variant needs:
- **label**: Short, specific name (e.g., "Hand-Crank Radio")
- **description**: 1-2 sentences on what makes this type distinctive and when to choose it
- **amazonSearchKeywords**: Specific search terms for this variant on Amazon

### Phase 3: Generate report

Write `tool-enrichment-report.json` to the working folder.

### Phase 4: Apply (optional)

If the user says "apply" or "save these":

1. Show a summary: "About to update X tools. Y tools get variants, Z tools get improved descriptions."
2. Wait for user confirmation
3. For each tool with recommendations, call `PATCH /api/tools/{toolId}` with the enrichment fields
4. Report success/failure per tool

## Variant quality guidelines

### Good variants
- Each variant represents a **different purchasing decision** the user needs to make
- Descriptions explain **when to choose this type** over others
- Amazon keywords are **specific enough** to return the right products (not just the tool category page)

### Bad variants
- Variants that are just brands (don't recommend specific brands — that's a future feature)
- Variants that are too similar (LED flashlight vs LED torch — same thing)
- More than 4 variants (narrow to the most common/useful 3-4)
- Variants for tools where the user doesn't need to choose (a whistle is a whistle)

## Tools that should NOT get variants

These tool types should use a single broad `amazonSearchKeywords` instead:

- **Batteries**: Too many types. Use "emergency battery variety pack"
- **Bandages**: Many sizes/types. Use "first aid bandage assortment"
- **Rope**: Paracord is specific enough already
- **Generic supplies**: "Plastic bags", "Duct tape", "Safety pins" — one type
- **Medical supplies with specific names**: "SAM splint", "Tourniquet", "Thermometer" — already specific

## Amazon keyword guidelines

- Always include "emergency" or "survival" to surface appropriate products
- Don't include brand names
- Include 4-7 keywords per search
- Test the URL in a browser to verify results are relevant
- For variants, make keywords specific to that variant type

## Integration with existing pipeline

This skill is **independent of the per-guide pipeline**. It doesn't modify guides or guide versions. It only updates the canonical `tools` table, which then flows into future guide imports via the enriched JSONB.

Existing guides will NOT automatically get updated variants. To update existing guides:
1. Run the enricher to update the `tools` table
2. Re-import affected guides (or wait for the next pipeline run)

## Subagent instructions

This skill does not participate in the orchestrator's parallel guide processing. It runs as a single serial process against the tool library.
