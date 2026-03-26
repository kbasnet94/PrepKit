-- Add Amazon affiliate fields + display metadata to canonical tools table
ALTER TABLE tools
  ADD COLUMN amazon_search_keywords text,
  ADD COLUMN amazon_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN icon text,
  ADD COLUMN use_cases text[] NOT NULL DEFAULT '{}';

-- No RLS changes needed: existing anon/authenticated policies cover new columns automatically
