-- Allow anon role to read and write for import script and unauthenticated dashboard access.
-- For production, remove these and use Supabase Auth + authenticated policies only.
-- Import script can alternatively use SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).

CREATE POLICY "Anon read guide_categories" ON guide_categories FOR SELECT TO anon USING (true);
CREATE POLICY "Anon write guide_categories" ON guide_categories FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read guide_parent_topics" ON guide_parent_topics FOR SELECT TO anon USING (true);
CREATE POLICY "Anon write guide_parent_topics" ON guide_parent_topics FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read guides" ON guides FOR SELECT TO anon USING (true);
CREATE POLICY "Anon write guides" ON guides FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read guide_versions" ON guide_versions FOR SELECT TO anon USING (true);
CREATE POLICY "Anon write guide_versions" ON guide_versions FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read review_comments" ON review_comments FOR SELECT TO anon USING (true);
CREATE POLICY "Anon write review_comments" ON review_comments FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read guide_releases" ON guide_releases FOR SELECT TO anon USING (true);
CREATE POLICY "Anon write guide_releases" ON guide_releases FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read guide_release_items" ON guide_release_items FOR ALL TO anon USING (true) WITH CHECK (true);
