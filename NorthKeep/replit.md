# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── survival-app/       # NorthKeep - Expo React Native survival app
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/survival-app` (`@workspace/survival-app`)

**NorthKeep** — An offline-first survival/emergency preparedness mobile app for iOS and Android built with Expo React Native.

#### Architecture
- **Local-first**: All data stored in SQLite via `expo-sqlite` — no backend or login required
- **On-device AI**: Uses `navigator.ml` (Chrome Gemini Nano) for AI chat; graceful fallback shows knowledge excerpts when AI unavailable
- **4 tab screens**: Chat, Knowledge, Inventory, Settings
- **Tab navigation**: NativeTabs with liquid glass on iOS 26+, classic Tabs with BlurView fallback

#### Guide Library (lib/guides/)
- **137-guide library** — 5 sources merged in `seed-data.ts` at build time:
  - `merged-pack.json`: 57 base guides (20 reference · 18 scenario · 19 action)
  - `batch-pack.json`: Natural Disasters + Medical Safety — 16 upgraded, 13 new (→ 70 guides)
  - `batch-pack-2.json`: Navigation, Rescue, Signaling + Water, Food, Sanitation — 2 upgraded, 21 new (→ 91 guides)
  - `batch-pack-3.json`: Preparedness, Kits, and Home Readiness — 0 upgraded, 19 new (→ 110 guides)
  - `batch-pack-4.json`: Shelter, Fire, and Warmth — 3 upgraded, 27 new (→ 137 guides)
  - Final breakdown: 31 Reference · 43 Scenario · 42 Action · 21 Preparedness
- **GuideLayer** includes `"preparedness"` (navy #3D5A80) alongside action_card, scenario_guide, reference_guide
- **Categories** (snake_case keys): natural_disasters, medical_safety, water_food, preparedness, communication, navigation, shelter_fire_warmth, weather_environment, core_skills
- **New guide schema fields**: `layer` (action_card | scenario_guide | reference_guide), `sourceQuality`, `contentStatus`, `whatNotToDo`, `redFlags`, `preparednessTips`, `parentTopic`, `sourceReferences[]`, `derivedFrom[]`
- **`topicMap`**: maps topic keys to guide ID arrays for related-guide lookup
- **Layer-aware matching**: action_card ranked first for urgent/practical; needs_source_review demoted (-10); metadata_only heavily demoted (-20)
- **`repository.ts`**: adds `getGuidesByLayer()`, `getGuidesByTopic()`, `getRelatedGuides()`, `getTopicMap()`
- **Knowledge screen**: category cards with snake_case→human label mapping; guide rows show Action/Scenario/Reference layer badge; Planned/Review status badges for special content statuses
- **Guide detail screen**: new sections for Red Flags (red bordered box), Warnings, What Not To Do (amber), Preparedness Tips (green), Sources (with organization + whyUseful), Related Guides; review/planned notice banners

#### Key Files
- `app/_layout.tsx` — Root layout with providers (Chat, Knowledge, Inventory) + font loading
- `app/(tabs)/_layout.tsx` — Tab navigation with NativeTabs/classic fallback
- `app/(tabs)/index.tsx` — Chat sessions list
- `app/(tabs)/knowledge.tsx` — Knowledge library with search, category sections, download
- `app/(tabs)/inventory.tsx` — Inventory with collapsible categories, stats, expiry warnings
- `app/(tabs)/settings.tsx` — Storage info, data management, about
- `app/chat/[id].tsx` — Chat detail with inverted FlatList, KeyboardAvoidingView
- `app/knowledge/[id].tsx` — Article reader with formatted paragraphs
- `app/inventory/add.tsx` — Add item form sheet
- `app/inventory/edit/[id].tsx` — Edit item form sheet with delete
- `app/inventory/kit.tsx` — Create kit form sheet
- `contexts/ChatContext.tsx` — Chat sessions/messages CRUD, AI integration
- `contexts/KnowledgeContext.tsx` — Wikipedia download/storage/search
- `contexts/InventoryContext.tsx` — Items/kits CRUD, category/expiry tracking
- `lib/database.ts` — SQLite schema (5 tables), connection management
- `lib/ai-service.ts` — AI capability check, knowledge search, response generation
- `lib/knowledge-data.ts` — 20 survival topic catalog with Wikipedia URLs
- `constants/colors.ts` — Rugged outdoor palette (forest green, warm sand, charcoal)
- `constants/theme.ts` — Typography, spacing, border radius constants

#### Design
- Rugged outdoor aesthetic: deep forest green (#2D6A4F) accent, warm sand (#F5F0EB) background, charcoal text
- Inter font throughout (400-700 weights)
- Inventory: categories (Food/Water/Tools/Medical/Shelter/Comms/Other), conditions (Good/Fair/Poor/Expired), expiry warnings (amber ≤30 days, red = expired)
- ID generation: `Date.now() + Math.random()` (no uuid package)

#### Dependencies
- expo-sqlite (~16.0.10), expo-crypto (~15.0.8), expo-haptics
- react-native-keyboard-controller (KeyboardAvoidingView for chat)
- Metro config includes wasm asset extension for expo-sqlite web support

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
