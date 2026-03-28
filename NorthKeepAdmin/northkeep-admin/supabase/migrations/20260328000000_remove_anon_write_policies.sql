-- Security hardening: remove anonymous write access from admin tables.
-- The admin dashboard now uses the service role key (bypasses RLS),
-- and all API routes are protected by middleware authentication.
-- Mobile app only needs anon READ access for guide sync.

-- Drop anon write policies from 20260314000001_allow_anon_for_import.sql
DROP POLICY IF EXISTS "Anon write guide_categories" ON guide_categories;
DROP POLICY IF EXISTS "Anon write guide_parent_topics" ON guide_parent_topics;
DROP POLICY IF EXISTS "Anon write guides" ON guides;
DROP POLICY IF EXISTS "Anon write guide_versions" ON guide_versions;
DROP POLICY IF EXISTS "Anon write review_comments" ON review_comments;
DROP POLICY IF EXISTS "Anon write guide_releases" ON guide_releases;
DROP POLICY IF EXISTS "Anon read guide_release_items" ON guide_release_items;
-- ^ note: this was incorrectly created as FOR ALL (read+write) in the original migration

-- Recreate guide_release_items anon read as SELECT only
CREATE POLICY "Anon read guide_release_items"
  ON guide_release_items FOR SELECT TO anon USING (true);

-- Drop anon write policies from 20260321000000_normalized_tools.sql
DROP POLICY IF EXISTS "Anon write tools" ON tools;
DROP POLICY IF EXISTS "Anon write guide_version_tools" ON guide_version_tools;

-- Fix guide_requests: anon should INSERT only, not UPDATE (admin manages status)
DROP POLICY IF EXISTS "Anon update guide_requests" ON guide_requests;

-- Keep these anon policies (mobile app needs them):
--   Anon read guide_categories          (SELECT)
--   Anon read guide_parent_topics       (SELECT)
--   Anon read guides                    (SELECT)
--   Anon read guide_versions            (SELECT)
--   Anon read review_comments           (SELECT)
--   Anon read guide_releases            (SELECT)
--   Anon read guide_release_items       (SELECT) — recreated above
--   Anon read tools                     (SELECT)
--   Anon read guide_version_tools       (SELECT)
--   Anon read guide_requests            (SELECT)
--   Anon write guide_requests           (INSERT only)
--   Anon read request_upvotes           (SELECT)
--   Anon write request_upvotes          (INSERT)
--   Anon delete request_upvotes         (DELETE)
