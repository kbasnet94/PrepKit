-- Normalized tools schema
-- Replaces the embedded tools JSONB array in guide_versions with proper relational tables.
-- A single canonical tool definition is shared across all guides that reference it.

-- 1. tools (canonical tool definitions, deduplicated by name)
CREATE TABLE IF NOT EXISTS tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. guide_version_tools (join table: guide_versions <-> tools)
CREATE TABLE IF NOT EXISTS guide_version_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_version_id uuid NOT NULL REFERENCES guide_versions(id) ON DELETE CASCADE,
  tool_id uuid NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  optional boolean NOT NULL DEFAULT false,
  context text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (guide_version_id, tool_id)
);

-- Indexes
CREATE INDEX idx_tools_category ON tools(category);
CREATE INDEX idx_guide_version_tools_guide_version_id ON guide_version_tools(guide_version_id);
CREATE INDEX idx_guide_version_tools_tool_id ON guide_version_tools(tool_id);

-- RLS
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_version_tools ENABLE ROW LEVEL SECURITY;

-- Authenticated access
CREATE POLICY "Auth read tools" ON tools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write tools" ON tools FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth read guide_version_tools" ON guide_version_tools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write guide_version_tools" ON guide_version_tools FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anon access (matches existing pattern — restrict in production)
CREATE POLICY "Anon read tools" ON tools FOR SELECT TO anon USING (true);
CREATE POLICY "Anon write tools" ON tools FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon read guide_version_tools" ON guide_version_tools FOR SELECT TO anon USING (true);
CREATE POLICY "Anon write guide_version_tools" ON guide_version_tools FOR ALL TO anon USING (true) WITH CHECK (true);
