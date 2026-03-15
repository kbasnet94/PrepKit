---
name: prepkit-research
description: >
  Use this skill to research a specific emergency topic and produce a structured research packet for the PrepKit guide pipeline. Trigger whenever the user asks to research a guide topic, find sources for a guide, investigate a specific emergency scenario, or produce a research packet. Also trigger when a planning-packet work item needs to be researched before writing. This is step 2 of the pipeline: Planning → **Research** → Writing → Constraint Annotation → Validation → Import/Staging → Human Review → Release.
---

# PrepKit Research Skill

You are researching an emergency guidance topic and producing a structured research packet. Your output feeds directly into the Writing skill, so every claim you include must be traceable to a specific source.

## Core principle

**Never fabricate sources or claims.** If you cannot find a reliable source for a claim, say so in `conflictsOrWeakClaims`. An honest gap is infinitely better than an invented citation — this content will be used by real people in real emergencies.

## Inputs

You need one of these to start:
- A work item from `planning-packet.json` (includes category, parentTopic, evidenceTier, action type)
- A direct request from the user specifying a topic to research

If upgrading an existing guide, fetch the current version from Supabase first so you can identify what's missing or outdated.

## Evidence tiers

The evidence tier determines what sources you may use. Respect it strictly.

### authoritative_only
Government agencies, established medical/safety organizations, peer-reviewed clinical guidelines only.

Accepted sources include: FEMA, CDC, WHO, Red Cross/Red Crescent, NWS, NOAA, NPS, AHA (American Heart Association), ACEP (American College of Emergency Physicians), EPA, OSHA, state emergency management agencies, peer-reviewed journals (NEJM, Lancet, JAMA, Wilderness & Environmental Medicine).

Do NOT use: blog posts, forums, YouTube videos, outdated field manuals, news articles, social media, personal websites, AI-generated content.

### authoritative_plus_field_practice
Everything above, plus established field-practice sources.

Additional accepted sources: US military survival manuals (FM 21-76, TM 10-286), Wilderness Medical Society practice guidelines, NOLS Wilderness Medicine curriculum, established outdoor education organizations (BSA, WFA/WAFA curricula), published survival/bushcraft references with named credentialed authors.

### authoritative_plus_examples
Everything above, plus documented real-world examples.

Additional accepted sources: NTSB/incident investigation reports, after-action reports from major agencies, well-sourced investigative journalism from established outlets, published case studies with verifiable details.

## Research process

1. **Understand the scope.** What layer and guideType is this for? An action_card needs concrete steps; a reference_guide needs background knowledge; a preparedness_guide needs pre-event planning.

2. **Search for sources.** Use web search within the allowed source tiers. Prioritize the most authoritative source available. If a government agency covers the topic, start there.

3. **Extract claims.** For each piece of actionable guidance you find, record:
   - The exact claim (what to do, what not to do, what warning to include)
   - Which source it comes from (title, organization, URL)
   - How strong the evidence is

4. **Flag conflicts.** If two authoritative sources disagree, record both positions and recommend which to use (preferring the more recent, more specific, or more authoritative source).

5. **Identify gaps.** If the topic needs warnings or red flags that you can't find sourced support for, flag them as gaps rather than inventing them.

6. **Suggest sub-guides.** If the research reveals that the topic is too broad for a single guide (e.g., "first aid" spans dozens of scenarios), suggest breaking it into focused sub-guides.

## Output format

Produce `research-packet.json`:

```json
{
  "workItemRef": {
    "action": "upgrade | new",
    "targetSlug": "existing-slug or null",
    "category": "medical_safety",
    "parentTopic": "Bleeding Control"
  },
  "evidenceTier": "authoritative_only",
  "topicSourceQuality": "strong | mixed | weak",
  "suggestedLayer": "action",
  "suggestedGuideType": "action_card",
  "existingGuideUpgradeTarget": "slug or null",
  "researchFindings": [
    {
      "claim": "Apply direct pressure with a clean cloth for at least 15 minutes without lifting to check",
      "sourceTitle": "First Aid/CPR/AED Participant's Manual",
      "sourceOrganization": "American Red Cross",
      "sourceUrl": "https://www.redcross.org/...",
      "evidenceStrength": "authoritative",
      "fieldRelevance": "Core step-by-step action for bleeding control"
    }
  ],
  "suggestedSubGuides": [
    {
      "slug": "tourniquet-application",
      "layer": "action",
      "guideType": "action_card",
      "reason": "Tourniquet use is a separate skill level requiring distinct training"
    }
  ],
  "conflictsOrWeakClaims": [
    {
      "claim": "Elevate the wound above heart level",
      "issue": "Red Cross 2020 guidelines removed elevation; older AHA materials still include it",
      "sourceA": "Red Cross 2020 First Aid Guidelines",
      "sourceB": "AHA 2015 First Aid Update",
      "resolution": "Omit — follow most recent authoritative guidance"
    }
  ],
  "identifiedGaps": [
    {
      "area": "Specific guidance for bleeding in children",
      "impact": "Current research covers adult scenarios; pediatric pressure amounts may differ",
      "suggestion": "Flag for separate pediatric guide or add a note in warnings"
    }
  ],
  "recommendation": "Summary of what the Writing skill should produce based on this research"
}
```

## Quality standards for topicSourceQuality

- **strong**: Multiple authoritative sources agree, no significant conflicts, recent guidelines available
- **mixed**: Some authoritative sources available but with gaps or minor conflicts; some claims rely on field-practice sources
- **weak**: Limited authoritative coverage, significant reliance on field-practice or anecdotal sources, outdated guidelines

## What not to do

- Don't include claims you can't attribute to a specific source
- Don't use sources outside the allowed tier
- Don't silently resolve conflicts — always flag them in `conflictsOrWeakClaims`
- Don't produce a research packet with zero `researchFindings` — if you can't find sources, say so and recommend the user provide source material
- Don't hallucinate URLs — if you can't find the exact URL, set it to null and note the source title/organization so it can be verified
