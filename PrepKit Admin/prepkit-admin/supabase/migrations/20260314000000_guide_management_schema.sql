-- Guide Management Schema for PrepKit Admin
-- Run this in Supabase SQL Editor or via supabase db push

-- 1. guide_categories
CREATE TABLE IF NOT EXISTS guide_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. guide_parent_topics
CREATE TABLE IF NOT EXISTS guide_parent_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES guide_categories(id),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. guides (stable identity)
CREATE TABLE IF NOT EXISTS guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  category_id uuid REFERENCES guide_categories(id),
  parent_topic_id uuid REFERENCES guide_parent_topics(id),
  current_published_version_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. guide_versions (versioned content)
CREATE TABLE IF NOT EXISTS guide_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  title text NOT NULL,
  category_id uuid REFERENCES guide_categories(id),
  parent_topic_id uuid REFERENCES guide_parent_topics(id),
  layer text NOT NULL CHECK (layer IN ('action','scenario','preparedness','reference')),
  guide_type text NOT NULL CHECK (guide_type IN ('action_card','scenario_guide','preparedness_guide','reference_guide')),
  summary text,
  quick_answer text,
  when_to_use jsonb DEFAULT '[]'::jsonb,
  preferred_action text,
  backup_action text,
  step_by_step_actions jsonb DEFAULT '[]'::jsonb,
  warnings jsonb DEFAULT '[]'::jsonb,
  what_not_to_do jsonb DEFAULT '[]'::jsonb,
  red_flags jsonb DEFAULT '[]'::jsonb,
  preparedness_tips jsonb DEFAULT '[]'::jsonb,
  source_quality text CHECK (source_quality IN ('strong','mixed','weak')),
  content_status text,
  integration_decision text,
  upgrades_guide text,
  related_guides jsonb DEFAULT '[]'::jsonb,
  source_references jsonb DEFAULT '[]'::jsonb,
  app_tags jsonb DEFAULT '[]'::jsonb,
  notes text,
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft','in_review','approved','published','archived')),
  change_summary text,
  created_by uuid,
  approved_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (guide_id, version_number)
);

-- FK from guides to current_published_version_id
ALTER TABLE guides
  ADD CONSTRAINT guides_current_published_version_fk
  FOREIGN KEY (current_published_version_id) REFERENCES guide_versions(id);

-- 5. review_comments
CREATE TABLE IF NOT EXISTS review_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_version_id uuid NOT NULL REFERENCES guide_versions(id) ON DELETE CASCADE,
  author_id uuid,
  body text NOT NULL,
  is_resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- 6. guide_releases
CREATE TABLE IF NOT EXISTS guide_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_name text NOT NULL,
  semantic_version text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','deprecated')),
  release_notes text,
  manifest_path text,
  bundle_path text,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. guide_release_items
CREATE TABLE IF NOT EXISTS guide_release_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES guide_releases(id) ON DELETE CASCADE,
  guide_id uuid NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  guide_version_id uuid NOT NULL REFERENCES guide_versions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (release_id, guide_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_guide_versions_guide_id ON guide_versions(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_versions_review_status ON guide_versions(review_status);
CREATE INDEX IF NOT EXISTS idx_guides_category_id ON guides(category_id);
CREATE INDEX IF NOT EXISTS idx_guides_parent_topic_id ON guides(parent_topic_id);
CREATE INDEX IF NOT EXISTS idx_guide_release_items_release_id ON guide_release_items(release_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_guide_version_id ON review_comments(guide_version_id);

-- RLS (enable and add policies as needed; allow all for initial setup, tighten for production)
ALTER TABLE guide_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_parent_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_release_items ENABLE ROW LEVEL SECURITY;

-- Policy: allow authenticated users to read (internal tool)
CREATE POLICY "Authenticated read guide_categories" ON guide_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read guide_parent_topics" ON guide_parent_topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read guides" ON guides FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read guide_versions" ON guide_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read review_comments" ON review_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read guide_releases" ON guide_releases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read guide_release_items" ON guide_release_items FOR SELECT TO authenticated USING (true);

-- Policy: allow authenticated to insert/update/delete (expand with role check later)
CREATE POLICY "Authenticated write guide_categories" ON guide_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write guide_parent_topics" ON guide_parent_topics FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write guides" ON guides FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write guide_versions" ON guide_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write review_comments" ON review_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write guide_releases" ON guide_releases FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write guide_release_items" ON guide_release_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket for release manifests and bundles (create via Dashboard or API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('releases', 'releases', true);
