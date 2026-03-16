-- Constraint-aware guide relationship metadata
-- Extends guide_versions with fields for Replit/Supabase sync
-- Preserves existing data; all new columns nullable/optional

-- response_role: role of this guide within its parentTopic cluster
ALTER TABLE guide_versions
  ADD COLUMN IF NOT EXISTS response_role text
  CHECK (response_role IS NULL OR response_role IN ('primary','backup','supporting','reference'));

-- constraint_tags: constraints where this guide should be boosted
ALTER TABLE guide_versions
  ADD COLUMN IF NOT EXISTS constraint_tags jsonb DEFAULT '[]'::jsonb;

-- blocked_by_constraints: constraints that should demote this guide
ALTER TABLE guide_versions
  ADD COLUMN IF NOT EXISTS blocked_by_constraints jsonb DEFAULT '[]'::jsonb;

-- alternative_to_guide_slugs: direct alternatives when another guide's method is unavailable
ALTER TABLE guide_versions
  ADD COLUMN IF NOT EXISTS alternative_to_guide_slugs jsonb DEFAULT '[]'::jsonb;

-- Index for filtering by response_role
CREATE INDEX IF NOT EXISTS idx_guide_versions_response_role ON guide_versions(response_role)
  WHERE response_role IS NOT NULL;
