---
name: prepkit-release
description: >
  Use this skill to bundle approved PrepKit guide versions into a release for the mobile app to download. Trigger whenever the user asks to create a release, publish guides to mobile, bundle approved guides, generate a release manifest, or push a new version to the app. This is the final step of the pipeline: Planning → Research → Writing → Constraint Annotation → Validation → Import/Staging → Human Review → **Release**. This skill is conservative by design — it requires explicit confirmation before publishing.
---

# PrepKit Release / Publish Skill

You are bundling approved guide versions into a release that the mobile app can download. This is the most production-adjacent step in the pipeline, so every action requires explicit user confirmation.

## Prerequisites

- One or more guide versions with `review_status: "approved"` in Supabase
- The admin app running at `http://localhost:3000`
- A release name and semantic version from the user

## Process

### Step 1: Identify what's ready to release

Query approved versions that aren't already in a published release:

```
GET /api/guides/approved
```

This returns all guide versions with `review_status: "approved"`. Present the list to the user:
- Guide title, slug, version number
- How many total approved guides are available
- Whether this is a new guide or an update to an existing one

Ask: "Which of these should be included in this release? All of them, or a subset?"

### Step 2: Create a draft release

```
POST /api/releases
Body: {
  "release_name": "User-provided name",
  "semantic_version": "User-provided version (e.g., 1.2.0)",
  "release_notes": "Summary of what's in this release",
  "status": "draft"
}
```

Confirm the release was created and show the release ID.

### Step 3: Add approved guides to the release

For each selected guide version:

```
POST /api/releases/{releaseId}/items
Body: {
  "guide_id": "guide UUID",
  "guide_version_id": "version UUID"
}
```

Report progress: "Added 12/15 guides to release..."

After all are added, present a summary:
- Release name and version
- Total guides in release
- List of guide titles included

### Step 4: Generate the bundle

```
POST /api/releases/{releaseId}/generate
```

This produces:
- A **manifest** (metadata: version, name, guide count, release notes, published timestamp)
- A **bundle** (the actual guide JSON data the mobile app downloads, in camelCase app-ready format)

Present the manifest to the user for review. Show:
- Semantic version
- Total guide count
- Release notes

### Step 5: Publish (requires explicit confirmation)

**Do not publish without asking.** Present a clear confirmation prompt:

"Release **{release_name}** (v{version}) contains {count} guides. Publishing will make these available to mobile app users. Do you want to publish?"

Only after the user explicitly confirms:

```
POST /api/releases/{releaseId}/publish
```

This sets the release status to `"published"` and records the published timestamp.

### Step 6: Post-publish verification

After publishing, confirm:
- Release status is `"published"`
- Published timestamp is set
- The bundle JSON is accessible

Report the final state to the user.

## Semantic versioning guidance

Help the user choose the right version number:
- **Patch** (1.0.x): Small fixes to existing guides (typos, clarifications, source updates)
- **Minor** (1.x.0): New guides added, or significant content improvements to existing guides
- **Major** (x.0.0): Major restructuring, large batches of new content, changes to guide schema

## What not to do

- Don't publish without explicit user confirmation — this is the most critical rule
- Don't add guide versions that aren't `"approved"` to a release
- Don't create a release with zero guides
- Don't skip the generate step — the bundle must be generated before publishing
- Don't auto-suggest "publish immediately" — always default to creating a draft release and letting the user decide when to publish
- Don't modify guide content during the release process — if something needs fixing, it goes back through the pipeline
- Don't publish a release without showing the user the manifest first

## API reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/releases` | POST | Create a new release |
| `/api/guides/approved` | GET | List approved guide versions |
| `/api/guides/approved?releaseId={id}` | GET | List approved versions NOT already in a specific release |
| `/api/releases/{id}/items` | POST | Add a guide version to a release |
| `/api/releases/{id}/generate` | POST | Generate manifest + bundle JSON |
| `/api/releases/{id}/publish` | POST | Set release to published |
