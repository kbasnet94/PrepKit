---
name: northkeep-import-staging
description: >
  Use this skill to stage a validated NorthKeep guide into the admin workflow as a draft version in Supabase. Trigger whenever the user asks to import a guide, stage a guide for review, push a guide to the admin app, or submit a guide draft to Supabase. Also trigger when a validated guide-annotated.json needs to enter the admin review queue. This is step 6 of the pipeline: Planning → Research → Writing → Constraint Annotation → Validation → **Import/Staging** → Human Review → Release.
---

# NorthKeep Import / Staging Skill

You are submitting a validated guide into the admin workflow. This creates a draft version in Supabase that appears in the admin app's Review Queue for human approval. You do NOT publish anything — staging is explicitly non-destructive and non-live.

## Prerequisites

Before importing, confirm:
1. A `validation-report.json` exists with `overallResult` of `"pass"` or `"pass_with_warnings"`
2. The `guide-annotated.json` is the validated version (has constraint metadata)
3. The admin app is running (needed for API access)

If the validation report shows `"fail"`, do NOT proceed. Tell the user which issues need fixing first.

## How the import API works

The admin app has an import endpoint at `POST /api/guides/import` that accepts NormalizedGuide JSON. It supports two modes:

### Preview mode (always do this first)
```
POST /api/guides/import?action=preview
Body: { "guide": <NormalizedGuide JSON> }
```

Returns a diff showing:
- Whether the guide is new or an update to an existing slug
- Field-by-field comparison (incoming vs. current) for every text and array field
- Which fields have changed

### Save mode (only after user confirms the preview)
```
POST /api/guides/import?action=save
Body: {
  "guide": <NormalizedGuide JSON>,
  "changeSummary": "Description of what changed and why"
}
```

The API handles:
- Creating the guide record if it's new
- Auto-creating category and parentTopic records if they don't exist
- Creating a new `guide_version` with `review_status: "draft"`
- Validating constraint tags against the canonical registry (filters invalid ones)
- Validating alternativeToGuideSlugs against existing slugs
- Incrementing version numbers automatically

## Process

1. **Load the validated guide** from `guide-annotated.json`

2. **Call preview mode** and present the diff to the user:
   - Is this a new guide or an update?
   - If updating: which fields changed? Were any warnings or redFlags removed?
   - If new: confirm slug, category, parentTopic
   - Show any validation warnings from `validation-report.json`

3. **Wait for user confirmation.** Do not call save mode without explicit approval.

4. **Call save mode** with a descriptive `changeSummary`. Build the summary from:
   - The research packet's `recommendation` field (if available)
   - The validation report's warnings (if any)
   - Whether this is a new guide or an upgrade

5. **Report the result:**
   - slug, version ID, version number
   - Any API warnings (invalid constraint tags that were filtered, broken alt slugs)
   - Confirm the guide is now in the Review Queue at `review_status: "draft"`

## Making the API call

The admin app runs at `http://localhost:3000`. Use fetch or curl:

```javascript
// Preview
const previewRes = await fetch('http://localhost:3000/api/guides/import?action=preview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ guide: annotatedGuide })
});
const preview = await previewRes.json();

// Save (after user confirms)
const saveRes = await fetch('http://localhost:3000/api/guides/import?action=save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    guide: annotatedGuide,
    changeSummary: 'Upgraded with 4 new sourced warnings and improved step-by-step actions'
  })
});
const result = await saveRes.json();
```

## Output

Produce `import-receipt.json`:

```json
{
  "slug": "guide-slug",
  "guideId": "uuid",
  "versionId": "uuid",
  "versionNumber": 3,
  "reviewStatus": "draft",
  "isNew": false,
  "changeSummary": "What was provided to the API",
  "apiWarnings": ["Invalid constraint tags filtered: custom_tag"],
  "validationWarnings": ["redFlags array is empty"],
  "importedAt": "ISO timestamp",
  "reviewUrl": "http://localhost:3000/review?filter=draft"
}
```

## What "staged" means

After a successful import:
- The guide version exists in Supabase with `review_status: "draft"`
- It appears in the admin app's Review Queue at `/review?filter=draft`
- It is NOT visible to mobile app users
- It is NOT included in any release
- It CANNOT be added to a release until a human changes its status to `"approved"`
- The human reviewer can edit, approve, reject, or archive it

## What not to do

- Don't call save mode without showing the preview first
- Don't call save mode without explicit user confirmation
- Don't set review_status yourself — the API always sets it to "draft"
- Don't modify the guide content during import — if something needs fixing, go back to the upstream skill
- Don't import a guide that failed validation
