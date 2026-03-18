-- Guide images: each guide version can have 0–8 AI-recommended + admin-uploaded images.
--
-- images JSONB stores an array of GuideImage objects:
-- {
--   key:                  string  — unique within guide, used as storage filename
--   description:          string  — AI-authored sourcing brief (admin-facing only, NOT shown to users)
--   caption:              string  — short display label shown under image on mobile
--   altText:              string  — accessibility text
--   associatedStepIndex:  int | null — null = gallery section; 0-based = renders next to that step
--   storageUrl:           string | null — null until admin uploads; populated by image upload API
-- }

ALTER TABLE guide_versions
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN guide_versions.images IS
  'Array of GuideImage objects. description field is admin-facing only (AI sourcing brief). storageUrl is null until admin uploads the image.';
