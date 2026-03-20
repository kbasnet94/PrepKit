# Onboarding, IAP & Analytics Design

## Overview

Add an onboarding flow to NorthKeep mobile to capture user profile data for marketing/analytics, implement guide view tracking for content prioritization, and architect a lifetime IAP for unlocking offline AI chat (launching later as "Coming Soon").

## Goals

- Capture user type, experience level, and household size on first launch
- Optionally collect email for marketing and future identity linking
- Track guide views (simple counters) to understand content usage patterns
- Design IAP entitlement architecture for a lifetime "Offline AI Chat" unlock
- Store all data in Supabase with local-first offline resilience

## Non-Goals

- Personalization based on profile data (marketing/analytics only for now)
- Family Sharing (deferred — can be toggled in App Store Connect later with no code change)
- Custom family plan system
- Per-session or timestamped view event logging (simple counters only)
- Android support (designed to be platform-agnostic, but iOS-first)
- Implementing the AI chat feature itself

---

## Section 1: Onboarding Flow

### Screen Sequence

1. **Welcome screen** — App name, tagline, "Get Started" button
2. **Profile screen** — Three questions:
   - **User type** (multi-select): Doomsday Prepper, Survivalist, Outdoors Enthusiast, First Responder/Medical, Military/Veteran, Parent/Family Preparedness, Other
   - **Experience level** (single-select): Beginner, Intermediate, Expert
   - **Household size** (single-select): Just me, 2 people, 3-5 people, 6+
3. **Email screen** — Optional email input with "why we ask" explainer + clear skip option ("Maybe Later")
4. **Done** → Redirect to Knowledge tab, begin guide sync in background

### Behavior

- Onboarding shows once on first launch. Completion state stored in AsyncStorage (`northkeep_onboarding_completed`).
- "Skip" button visible on every screen — skipping stores a minimal profile (device UUID only, all fields null) and marks onboarding complete.
- Profile answers stored locally immediately (AsyncStorage under `northkeep_user_profile`), then synced to Supabase `user_profiles` table when online.
- Users can edit all profile fields later from Settings → "Your Profile" section.

### Navigation Pattern

Onboarding uses a **conditional initial route** in `app/_layout.tsx`. On launch, check `northkeep_onboarding_completed` from AsyncStorage. If false/missing, render the onboarding stack (`app/onboarding/`) as the initial route. Once complete, replace with the main tab navigator. No modal — this avoids back-navigation issues and deep-linking conflicts.

### Interrupted Onboarding

If the app is killed mid-onboarding, profile answers already entered are persisted in AsyncStorage (saved on each screen's "Next"), but `northkeep_onboarding_completed` remains false. On next launch, onboarding restarts from the beginning but pre-fills any saved answers. This is simpler than resuming mid-flow and avoids partial state bugs.

### Email Validation

Client-side format validation on the email field (basic regex: must contain `@` and a dot in the domain). No server-side validation. Invalid formats are rejected with inline error text before the user can proceed.

---

## Section 2: Data Architecture

### New Supabase Tables

#### `user_profiles`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| device_id | text (unique) | Existing device UUID from `lib/device-id.ts` |
| email | text (nullable) | Optional, user-provided |
| user_types | text[] | Array of selected types |
| experience_level | text (nullable) | `beginner` / `intermediate` / `expert` |
| household_size | text (nullable) | `just_me` / `2` / `3_to_5` / `6_plus` |
| ai_chat_unlocked | boolean | Default false. Only writable by Edge Function (service role). |
| created_at | timestamptz | First onboarding |
| updated_at | timestamptz | Last profile edit |

#### `guide_view_counts`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| device_id | text | References device UUID |
| guide_slug | text | Which guide was viewed |
| view_count | integer | Accumulated views from this device |
| last_viewed_at | timestamptz | Last time this guide was opened |
| synced_at | timestamptz | Last successful sync |

Composite unique constraint on `(device_id, guide_slug)` for upsert.

### Local Storage (On-Device)

- **AsyncStorage**:
  - `northkeep_onboarding_completed` — boolean
  - `northkeep_user_profile` — JSON blob of profile answers
  - `northkeep_ai_chat_unlocked` — boolean entitlement flag
- **SQLite** — `guide_views` table:
  - `guide_slug` (text, PK)
  - `view_count` (integer)
  - `last_viewed_at` (text, ISO timestamp)
  - `needs_sync` (integer, 0 or 1) — set to 1 on each local increment, reset to 0 after successful Supabase sync

### Sync Strategy

- **Profile sync**: Push to Supabase immediately after onboarding completes (if online), otherwise queue and push on next connectivity.
- **View counts**: Batch-sync during the guide data sync cycle (inside `GuideStoreContext` when `deltaSync()` or initial sync runs — the same code path that fetches release data from Supabase). Only rows with `needs_sync = 1` in local SQLite are pushed. Client sends total `view_count` per slug (not deltas). After successful upsert, reset `needs_sync = 0` locally.

### RLS Policies

- **`user_profiles`**: Devices can INSERT and UPDATE their own row (matched by `device_id`). Since RLS is row-level (not column-level), protecting `ai_chat_unlocked` from client writes requires a **database trigger**: a `BEFORE UPDATE` trigger that resets `ai_chat_unlocked` to its current value on any non-service-role update. This ensures clients can update profile fields freely but cannot flip the entitlement flag. Only the Edge Function (using service role key, which bypasses RLS and triggers marked `SECURITY DEFINER`) can set it.
- **`guide_view_counts`**: INSERT/UPDATE own rows only (matched by `device_id`).
- **Existing tables** (guides, releases, etc.): No changes needed. Current read-only anon policies remain.

### Web Platform Note

The mobile app's SQLite layer uses a web mock that no-ops all database operations. Guide view tracking in SQLite will similarly no-op on web. This is acceptable — the web build is for development only, not production.

---

## Section 3: IAP & Entitlement Architecture

### Status Phases

The AI chat feature goes through three phases:

1. **Coming Soon** (launch) — UI shows "Offline AI Chat — Coming Soon". No purchase flow.
2. **Available** (future) — Purchase flow enabled for compatible devices.
3. **Unlocked** (after purchase) — AI chat accessible.

### Purchase Flow (Phase 2)

Uses **StoreKit 2** (requires iOS 15+, which the app already targets). StoreKit 2 provides JWS-signed transactions that the Edge Function validates with Apple's App Store Server API v2.

1. User taps "Unlock Offline AI Chat" (in chat screen or Settings)
2. App calls StoreKit 2 `Product.purchase()` → Apple handles payment UI
3. On success, app receives a `Transaction` with a JWS-signed token
4. App sends the signed transaction to Supabase Edge Function (`/functions/v1/validate-receipt`)
5. Edge Function verifies the JWS signature against Apple's public certificates and calls App Store Server API v2 to confirm transaction status
6. If valid → Edge Function sets `ai_chat_unlocked = true` on `user_profiles` row (service role key)
7. Edge Function stores `originalTransactionId` in a `validated_transactions` table to prevent replay attacks
8. Edge Function returns `{ success: true, deviceId, unlockedAt }` → app stores `northkeep_ai_chat_unlocked = true` in AsyncStorage
9. AI chat unlocked immediately

### Error Handling

- **Network failure during validation**: App shows "Purchase saved. We'll verify it when you're back online." The StoreKit 2 transaction is durable — it persists in `Transaction.currentEntitlements` and can be re-sent on next app launch.
- **Apple server downtime**: Edge Function returns a retryable error. App queues the transaction and retries on next sync cycle.
- **Invalid/tampered receipt**: Edge Function returns `{ success: false, reason: "invalid_receipt" }`. App shows "Verification failed. Please contact support." Does NOT unlock locally.
- **No optimistic unlocking** — the app never grants access until server validation succeeds. This prevents entitlement fraud.

### Restore Flow (New Device)

1. User taps "Restore Purchases" in Settings
2. App calls StoreKit restore API → Apple returns prior transactions
3. Same validation flow (steps 4-8 above)
4. If device doesn't have a `user_profiles` row yet, Edge Function creates one with `device_id` + `ai_chat_unlocked = true`

### Offline Entitlement Check

- App reads `northkeep_ai_chat_unlocked` from AsyncStorage on launch
- No periodic revalidation needed — lifetime purchase, once verified it stays unlocked
- If user clears app data, they tap "Restore Purchases" (requires internet)

### Device Compatibility Gate

- Abstract capability check function: `getAIChatCapability()` → returns `compatible`, `incompatible`, or `unknown`
- Implementation details (chip detection, framework requirements) filled in when AI framework is chosen
- If **incompatible**: Settings shows "Offline AI Chat — Requires [device threshold]". No purchase button rendered.
- If **compatible + coming soon**: Shows "Offline AI Chat — Coming Soon"
- If **compatible + launched**: Shows purchase/unlock flow
- Prevents users from buying something their device can't run

### IAP Product Configuration

- **Type**: Non-consumable (lifetime, one-time purchase)
- **Family Sharing**: Deferred. Can be toggled in App Store Connect at any time with no code change.

---

## Section 4: Guide View Tracking

### Recording Views

- When user opens a guide detail screen (`guides/[slug]`), increment `view_count` by 1 and update `last_viewed_at` in the local SQLite `guide_views` table.
- No duration tracking, no scroll depth. Simple counter.

### Syncing to Supabase

- Piggyback on existing guide sync events (foreground or manual refresh)
- Upsert to `guide_view_counts` by `(device_id, guide_slug)`
- After successful sync, update local tracking so unchanged rows aren't re-pushed
- If offline, counts accumulate locally and sync on next connectivity

### Queryable Analytics

From Supabase you can query:
- Most viewed guides across all devices
- View distribution per category/parent topic
- How many unique devices have viewed a specific guide
- Correlation between user type and guide views via JOIN on `device_id`

---

## Section 5: Settings Integration

### New "Your Profile" Section

Appears above the existing "Appearance" section in Settings:

- **Email** — Shows current email or "Not provided" with an "Add" button
- **User Type** — Shows selected types, tappable to edit (same multi-select as onboarding)
- **Experience Level** — Shows current level, tappable to edit
- **Household Size** — Shows current value, tappable to edit
- **Offline AI Chat** — State-dependent display:
  - Coming Soon phase: "Offline AI Chat — Coming Soon"
  - Incompatible device: "Offline AI Chat — Requires [device threshold]"
  - Compatible + launched: "Locked" with "Unlock" button + "Restore Purchases" link
  - Purchased: "Unlocked" with checkmark

### Behavior

- Editing any profile field saves locally immediately, syncs to Supabase when online
- Users who skipped onboarding see all fields as empty/editable — this is their second chance
- No "complete your profile" nagging — fields are just there, no banners or badges

---

## Security Considerations

- **Device UUID spoofing**: Low risk at current stage (marketing data only). UUIDs are hard to guess but not secret. Acceptable for now. Note: if a user clears app data, they get a new device UUID and their analytics history starts fresh. Aggregate data (total views per guide) remains accurate; per-device longitudinal tracking breaks. Acceptable tradeoff for offline-first without auth.
- **Entitlement protection**: `ai_chat_unlocked` column protected by a `BEFORE UPDATE` trigger that prevents client-side modification. Only the Edge Function (service role) can set it.
- **Receipt replay prevention**: Edge Function stores validated transaction IDs and rejects duplicates.
- **Rate limiting**: Consider adding Supabase rate limits on profile upsert endpoint eventually. Not urgent for launch.
- **Existing table policies**: No changes needed. Current read-only anon policies for guides/releases remain intact.

---

## Key Files to Modify/Create (Mobile App)

- `app/_layout.tsx` — Add onboarding gate before main navigation
- `app/onboarding/` — New screen group (welcome, profile, email)
- `app/(tabs)/settings.tsx` — Add "Your Profile" section
- `lib/device-id.ts` — Already exists, reuse for `device_id`
- `lib/user-profile.ts` — New: profile storage, sync logic
- `lib/guide-views.ts` — New: view counter, sync logic
- `lib/database.ts` — Add `guide_views` table to SQLite schema
- `lib/ai-chat-capability.ts` — New: device compatibility check (stub for now)
- `contexts/UserProfileContext.tsx` — New: profile state provider

## Key Files to Create (Supabase)

- Edge Function: `validate-receipt` — Apple receipt validation + entitlement grant
- Migration: Create `user_profiles` and `guide_view_counts` tables with RLS policies
