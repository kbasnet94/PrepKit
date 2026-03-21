---
name: northkeep-tool-extractor
description: >
  Use this skill to extract structured tool/equipment data from a NorthKeep guide and persist it to the normalized tools database. Trigger whenever the user asks to extract tools from a guide, add tools metadata, identify required equipment, or prepare a guide's tools list. This is step 5.5 of the pipeline, running after Validation and before Import/Staging: Planning → Research → Writing → Constraint Annotation → Validation → **Tool Extraction** → Import/Staging → Human Review → Release.
---

# NorthKeep Tool Extractor

You are scanning a finalized guide to extract structured tool and equipment data. Tools are stored in a **normalized Supabase schema** — a canonical `tools` table (one row per unique tool) and a `guide_version_tools` join table linking tools to guide versions.

## What this step does

The mobile app shows a "Tools" tab on each guide detail page. This tab lists the tools and equipment mentioned in the guide, and checks whether the user has each item in their inventory. Your job is to:

1. Extract tools from the guide's narrative text
2. Match each extracted tool against the canonical `tools` table in Supabase
3. If a match exists, reuse that tool's `id` (do NOT create a duplicate)
4. If no match exists, create a new row in the `tools` table
5. Create `guide_version_tools` join rows linking the guide version to each tool

## Database schema

```sql
-- Canonical tool definitions (one row per unique tool)
CREATE TABLE tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Join table: guide_versions <-> tools
CREATE TABLE guide_version_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_version_id uuid NOT NULL REFERENCES guide_versions(id) ON DELETE CASCADE,
  tool_id uuid NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  optional boolean NOT NULL DEFAULT false,
  context text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (guide_version_id, tool_id)
);
```

### Key distinction: tool-level vs. guide-level fields

| Field | Lives on | Meaning |
|-------|----------|---------|
| `name` | `tools` | Canonical name shared across all guides |
| `category` | `tools` | Tool category shared across all guides |
| `description` | `tools` | Canonical one-sentence description of what this tool is |
| `optional` | `guide_version_tools` | Whether this tool is required or optional **for this specific guide** |
| `context` | `guide_version_tools` | Guide-specific usage note (e.g., "for lashing the ridgepole") — nullable |
| `sort_order` | `guide_version_tools` | Display order within this guide's tools list |

### The `description` field

The `description` on the `tools` table is a **canonical, guide-independent** description of the tool itself. It should be a single sentence describing what the tool is and its general purpose. Examples:

- "A length of lightweight nylon cord rated to 550 lbs, used for lashing, rigging, and general-purpose tying"
- "A handheld device that uses magnetic north to determine direction of travel"
- "A broad-spectrum germicidal agent used to disinfect drinking water"

This is NOT the same as `context` on the join table. `context` describes why the tool matters **in a specific guide**.

## Inputs

- A validated guide JSON — either `guide-annotated.json` (from Constraint Annotation/Validation) or `guide-draft.json` (from Writing)
- The guide can be at any pipeline stage; this skill only reads content fields
- Access to the Supabase `tools` table (to check for existing tools)

## Output

The same guide JSON with a `tools` array appended. Save as `guide-with-tools.json` in the working folder.

The `tools` array in the guide JSON now uses this format for pipeline handoff:

```typescript
interface GuideTool {
  name: string;        // Must exactly match the canonical name in the tools table
  category: string;    // Must exactly match the canonical category in the tools table
  description: string; // Canonical tool description (from the tools table)
  optional: boolean;   // Guide-specific: required or optional for this guide
  context: string;     // Guide-specific: why this tool matters in this guide
}
```

## Tool matching process

When extracting tools, follow this process to ensure consistency:

1. **Query the `tools` table** for all existing tools before starting extraction
2. For each extracted tool, check if a tool with a matching or very similar name already exists:
   - **Exact match**: Use the existing tool as-is (same name, category, description)
   - **Near match** (e.g., "Knife" vs "Fixed-blade knife"): Use the existing canonical name — do NOT create a variant
   - **No match**: Create a new tool with a canonical name, category, and description
3. If an existing tool's category doesn't match what you'd assign, **use the existing category** — consistency across guides is more important than recategorizing
4. Never create duplicate tools with slightly different names for the same item

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

1. **Fetch existing tools** from Supabase: `SELECT id, name, category, description FROM tools ORDER BY name`
2. Read the guide's content fields:
   - `stepByStepActions` (primary source)
   - `preferredAction` / `backupAction`
   - `preparednessTips`
   - `warnings`
   - `summary`
3. For each field, identify mentions of physical tools/equipment
4. Filter out natural materials and excluded items
5. For each identified tool:
   a. Check if it matches an existing tool in the `tools` table (by name similarity)
   b. If match: use the existing tool's canonical `name`, `category`, and `description`
   c. If no match: define a new canonical `name`, `category`, and `description`
6. Determine `optional` vs. required for this guide
7. Write a guide-specific `context` sentence
8. Deduplicate and order by importance
9. Append the `tools` array to the guide JSON
10. Save as `guide-with-tools.json`

## Persisting to Supabase

After extraction, persist the tools to the database:

1. For each tool in the extracted list:
   - If it doesn't exist in `tools` table: `INSERT INTO tools (name, category, description) VALUES (...)`
   - Note the `id` (either from existing row or newly inserted)
2. For each tool-guide link:
   - `INSERT INTO guide_version_tools (guide_version_id, tool_id, optional, context, sort_order) VALUES (...)`
   - Use `ON CONFLICT (guide_version_id, tool_id) DO UPDATE` to handle re-runs

## Example output

For a guide about purifying water by boiling:

```json
{
  "tools": [
    {
      "name": "Metal pot",
      "category": "Cooking",
      "description": "A heat-resistant metal container used for boiling water or cooking food over an open flame",
      "optional": false,
      "context": "Required to hold water over a heat source for boiling"
    },
    {
      "name": "Matches",
      "category": "Fire",
      "description": "Friction-ignited sticks used to start fires for warmth, cooking, or signaling",
      "optional": false,
      "context": "Needed to ignite fuel and create heat for boiling water"
    },
    {
      "name": "Water bottle",
      "category": "Storage",
      "description": "A sealed container for carrying and storing drinking water",
      "optional": true,
      "context": "For storing purified water after boiling and cooling"
    },
    {
      "name": "Cloth filter",
      "category": "General",
      "description": "A piece of tightly woven fabric used to strain sediment and debris from water",
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
- **Tool already exists with different category**: Use the existing category. Consistency across guides is paramount.
