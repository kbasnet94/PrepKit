# PrepKit Admin

Internal web app for managing survival guides and publishing them to Supabase. The mobile (Android/iOS) offline app consumes published guide bundles from this backend.

## Stack

- **Next.js** (App Router), **TypeScript**, **Tailwind**, **shadcn/ui** (preset acJqYi)
- **Supabase**: Auth, Postgres, Storage (optional for release bundles)

## Setup

1. **Clone / open the project**
   ```bash
   cd prepkit-admin
   ```

2. **Install dependencies** (already done if you ran the generator)
   ```bash
   npm install
   ```

3. **Supabase**
   - Create a project at [supabase.com](https://supabase.com).
   - Copy `.env.local.example` to `.env.local` and set:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - (Optional) `SUPABASE_SERVICE_ROLE_KEY` for the import script.

4. **Run the schema migrations**
   - In Supabase Dashboard → SQL Editor, run in order:
     1. `supabase/migrations/20260314000000_guide_management_schema.sql`
     2. `supabase/migrations/20260314000001_allow_anon_for_import.sql` (if using anon for import)
     3. `supabase/migrations/20260314000002_constraint_aware_fields.sql` (constraint metadata)
   - Or use the Supabase CLI: `supabase db push` (if linked).

5. **Seed data (import from normalized JSON)**
   - Place `guides_master_export.normalized.json` in the `data/` folder, or pass its path:
   ```bash
   npm run import-guides
   # Or with a custom path:
   npx tsx scripts/import-from-normalized.ts "C:\path\to\guides_master_export.normalized.json"
   ```
   - The script creates categories, parent topics, guides, initial guide versions (v1), and a release `v1.0.0` with all imported guides.

6. **Run the app**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Schema (summary)

- **guide_categories** – Category (e.g. communication, core_skills).
- **guide_parent_topics** – Topic under a category (e.g. Land Rescue Signaling).
- **guides** – Stable identity (id, slug, title, category_id, parent_topic_id, current_published_version_id).
- **guide_versions** – Versioned content (metadata, steps, warnings, red flags, sources, review_status, etc.). Also includes constraint-aware fields: `response_role`, `constraint_tags`, `blocked_by_constraints`, `alternative_to_guide_slugs`.
- **review_comments** – Comments on a version.
- **guide_releases** – A release (semantic_version, status, release_notes, manifest_path, bundle_path).
- **guide_release_items** – Which guide version is in which release (release_id, guide_id, guide_version_id).

Drafts are edited as guide_versions without changing the published version. Publishing is done by creating a **release**, adding approved guide versions to it, generating the bundle, then marking the release as published.

## Import steps

1. Run the migration SQL in Supabase.
2. Put `guides_master_export.normalized.json` in `data/` (or pass path to the script).
3. Run `npm run import-guides` (uses `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. The script creates categories and parent topics from the JSON, then one guide and one version per guide, and a release `v1.0.0` containing all of them.

## Release flow

1. **Create a release** (Releases → Create release): name, semantic version (e.g. `v1.0.0`), optional notes.
2. **Add guides**: open the release → “Add guides” → pick approved guide versions.
3. **Generate bundle**: “Generate bundle” downloads a JSON file with all guides in the release in app-ready format.
4. **Publish**: “Publish release” sets the release status to `published` and `published_at`.

Optional: upload the manifest and bundle to Supabase Storage and set `manifest_path` / `bundle_path` on the release so the mobile app can fetch them by URL.

## How the mobile app consumes updates

1. **Manifest**: The app fetches a small manifest (e.g. from Storage or your API) containing:
   - `semantic_version`
   - `published_at`
   - `total_guides`
   - `bundle_url` (or `bundle_path`)
   - Optional: checksum, release notes.

2. **Compare**: If the manifest’s `semantic_version` is newer than the cached one, the app downloads the bundle.

3. **Bundle**: The bundle JSON contains all published guide versions in a single array (or keyed by slug), in the same shape as “app-ready” (e.g. slug, title, quickAnswer, steps, warnings, etc.).

4. **Cache**: The app stores the bundle locally and uses it offline.

The “Generate bundle” action in PrepKit Admin returns the same structure you can host or upload; you can add a public API route or Storage bucket that serves the latest manifest and bundle to the app.

## Constraint-aware metadata

Guide versions support relationship metadata for constraint-aware ranking and alternatives:

| Field | Meaning |
|-------|---------|
| `response_role` | Role within parent topic cluster: `primary`, `backup`, `supporting`, `reference` |
| `constraint_tags` | Situations where this guide becomes more relevant (e.g. `no-power`, `outdoors`) |
| `blocked_by_constraints` | Situations where this guide should be demoted |
| `alternative_to_guide_slugs` | Direct alternatives when another guide's method is unavailable |

**Migration**: Run `supabase/migrations/20260314000002_constraint_aware_fields.sql` after the main schema.

**Edit in admin**: Guide detail → Edit tab → "Constraint-aware metadata" card.

**Import/export**: JSON import and release bundle generation include these fields. Backward compatible if absent.

**Backfill from Replit**: Use the backfill script to sync annotations from local JSON into Supabase without overwriting other content:

```bash
npm run backfill-constraint-metadata [path-to-json]
# Or: npx tsx scripts/backfill-constraint-metadata.ts [path-to-json]
```

JSON format: `{ "guides": [ { "slug": "...", "responseRole": "primary", "constraintTags": [...], ... } ] }` or a bare array. Matches guides by slug, updates only the latest version's metadata.

## Scripts

- `npm run dev` – Start dev server.
- `npm run build` – Build for production.
- `npm run import-guides` – Import from `data/guides_master_export.normalized.json` (or pass path as first arg).
- `npm run backfill-constraint-metadata [path] [--dry-run]` – Backfill constraint metadata from JSON. Default path: `data/constraint_metadata_patch.json`. Validates tags against registry. See `docs/CONSTRAINT_METADATA_SYNC.md`.

## Auth and permissions

The app uses Supabase Auth. RLS is enabled with permissive policies for authenticated users. For production, restrict write/delete to specific roles (e.g. editor, reviewer, publisher) and add a `roles` or `user_roles` table and policy checks.
