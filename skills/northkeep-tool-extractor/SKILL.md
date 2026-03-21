---
name: northkeep-tool-extractor
description: >
  Use this skill to extract structured tool/equipment data from a NorthKeep guide. Trigger whenever the user asks to extract tools from a guide, add tools metadata, identify required equipment, or prepare a guide's tools list. This is step 5.5 of the pipeline, running after Validation and before Import/Staging: Planning → Research → Writing → Constraint Annotation → Validation → **Tool Extraction** → Import/Staging → Human Review → Release.
---

# NorthKeep Tool Extractor

You are scanning a finalized guide to extract structured tool and equipment data. This step produces a `tools` array that the mobile app displays in the guide's "Tools" tab, cross-referenced against the user's inventory.

## What this step does

The mobile app shows a "Tools" tab on each guide detail page. This tab lists the tools and equipment mentioned in the guide, and checks whether the user has each item in their inventory. Your job is to extract those tools from the guide's narrative text into a structured array.

## Inputs

- A validated guide JSON — either `guide-annotated.json` (from Constraint Annotation/Validation) or `guide-draft.json` (from Writing)
- The guide can be at any pipeline stage; this skill only reads content fields

## Output

The same guide JSON with a `tools` array appended. Save as `guide-with-tools.json` in the working folder.

```typescript
interface GuideTool {
  name: string;       // Canonical common name (e.g., "Paracord rope", "Water filter")
  category: string;   // From the predefined category list below
  optional: boolean;  // true if mentioned as alternative/backup, false if required
  context: string;    // One sentence: why this tool is needed in this guide
}
```

## Tool categories

Use one of these categories for each tool:

| Category | Examples |
|----------|----------|
| Water Purification | Water filter, purification tablets, bleach, UV purifier |
| First Aid | First aid kit, bandages, tourniquet, CPR mask, splint |
| Fire | Matches, lighter, ferro rod, fire starter, tinder |
| Shelter | Tarp, emergency blanket, tent, stakes, ground pad |
| Navigation | Compass, map, GPS device, signal mirror |
| Cutting | Knife, multi-tool, axe, saw, scissors |
| Rope & Cordage | Paracord, rope, cord, twine, wire |
| Lighting | Flashlight, headlamp, lantern, glow sticks |
| Communication | Whistle, two-way radio, satellite communicator, signal flare |
| Cooking | Camp stove, pot, cup, utensils, fuel canister |
| Storage | Dry bag, water bottle, container, zip-lock bags |
| Signaling | Signal mirror, whistle, flare, reflective tape |
| General | Duct tape, garbage bags, safety pins, carabiners |

## Extraction rules

### What to INCLUDE

Manufactured, purchasable preparedness items — things someone would buy or pack in a kit:

- Tools and implements (knife, axe, saw, shovel)
- Emergency gear (tarp, emergency blanket, whistle)
- Medical supplies (bandages, tourniquet, CPR mask)
- Water treatment items (filter, purification tablets, bleach)
- Fire-starting supplies (matches, lighter, ferro rod)
- Navigation aids (compass, map, GPS)
- Communication devices (radio, satellite communicator)
- Containers and storage (water bottle, dry bag)
- Fasteners and cordage (rope, paracord, duct tape)
- Clothing/protective gear (gloves, goggles, respirator)

### What to EXCLUDE

- **Natural materials**: sticks, rocks, leaves, mud, snow, sand, grass, bark, moss, logs
- **Body parts**: hands, fingers, mouth
- **Abstract concepts**: knowledge, experience, training, calm
- **Generic terms**: supplies, materials, equipment, tools, gear, stuff, items
- **Buildings/infrastructure**: shelter, house, vehicle (as locations, not gear)
- **People**: helper, bystander, medical professional
- **Water**: water itself (not a tool — it's a resource)

### Determining `optional`

- `false` (required): The tool is needed for the guide's primary method
- `true` (optional): The tool is mentioned as an alternative, backup, or "if available" item. Look for language like:
  - "if you have..."
  - "alternatively, use..."
  - "ideal but not required"
  - Mentioned only in `backupAction` or fallback steps
  - Mentioned only in `preparednessTips` (forward-looking, not currently needed)

### Writing `context`

One concise sentence explaining why this tool matters for this specific guide. Examples:
- "Used to cut cordage when building a debris shelter"
- "Provides light for nighttime navigation when moving to safety"
- "Purifies water when boiling is not possible"

### Deduplication

If the same tool appears in multiple fields (e.g., "knife" in both steps and tips), produce ONE entry. Use the most important context (prefer steps over tips).

### Limits

- Maximum 15 tools per guide
- Minimum 0 (some guides genuinely need no tools — e.g., CPR, recognizing symptoms)
- Order tools by importance: required tools first, then optional

## Process

1. Read the guide's content fields:
   - `stepByStepActions` (primary source)
   - `preferredAction` / `backupAction`
   - `preparednessTips`
   - `warnings`
   - `summary`
2. For each field, identify mentions of physical tools/equipment
3. Filter out natural materials and excluded items
4. Normalize names to canonical common form
5. Assign a category from the table above
6. Determine optional vs. required
7. Write a context sentence
8. Deduplicate and order by importance
9. Append the `tools` array to the guide JSON
10. Save as `guide-with-tools.json`

## Example output

For a guide about purifying water by boiling:

```json
{
  "tools": [
    {
      "name": "Metal pot or container",
      "category": "Cooking",
      "optional": false,
      "context": "Required to hold water over a heat source for boiling"
    },
    {
      "name": "Fire starter (matches or lighter)",
      "category": "Fire",
      "optional": false,
      "context": "Needed to ignite fuel and create heat for boiling water"
    },
    {
      "name": "Water bottle",
      "category": "Storage",
      "optional": true,
      "context": "For storing purified water after boiling and cooling"
    },
    {
      "name": "Cloth or coffee filter",
      "category": "General",
      "optional": true,
      "context": "Pre-filters sediment from water before boiling to improve clarity"
    }
  ]
}
```

## Edge cases

- **Medical guides** (CPR, wound care): May have zero tools or only medical supplies. Don't force tools where none are needed.
- **Preparedness/checklist guides**: These ARE about gear — extract generously from the checklist items.
- **Scenario guides**: Focus on tools mentioned in the action steps, not every theoretical item.
- **Overlapping tool names**: "Matches" and "lighter" should be separate entries, not combined. They are different tools even if they serve the same purpose.
