-- Add variants JSONB column for tool subtypes (e.g., Hand-Crank Radio, Solar Radio)
-- Each variant: { "label": string, "description": string, "amazonSearchKeywords": string }
ALTER TABLE tools
  ADD COLUMN variants jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Enforce max 4 variants per tool at the DB level
ALTER TABLE tools
  ADD CONSTRAINT tools_variants_max_4
  CHECK (jsonb_array_length(variants) <= 4);
