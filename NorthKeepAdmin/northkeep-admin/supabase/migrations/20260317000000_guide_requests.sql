-- Guide Requests: let mobile users request guide topics and upvote existing ones.
-- Admin team can triage via status workflow: pending → planned → completed.

CREATE TABLE guide_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  description text,
  upvote_count integer NOT NULL DEFAULT 0,
  device_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'planned', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE request_upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES guide_requests(id) ON DELETE CASCADE,
  device_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, device_id)
);

-- Keep upvote_count in sync automatically
CREATE OR REPLACE FUNCTION increment_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE guide_requests
  SET upvote_count = upvote_count + 1,
      updated_at   = now()
  WHERE id = NEW.request_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE guide_requests
  SET upvote_count = GREATEST(upvote_count - 1, 0),
      updated_at   = now()
  WHERE id = OLD.request_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_upvote_insert
  AFTER INSERT ON request_upvotes
  FOR EACH ROW EXECUTE FUNCTION increment_upvote_count();

CREATE TRIGGER after_upvote_delete
  AFTER DELETE ON request_upvotes
  FOR EACH ROW EXECUTE FUNCTION decrement_upvote_count();

-- RLS: allow anon read/write (consistent with existing guide_feedback policy)
ALTER TABLE guide_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon read guide_requests"
  ON guide_requests FOR SELECT TO anon USING (true);

CREATE POLICY "Anon write guide_requests"
  ON guide_requests FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon update guide_requests"
  ON guide_requests FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read request_upvotes"
  ON request_upvotes FOR SELECT TO anon USING (true);

CREATE POLICY "Anon write request_upvotes"
  ON request_upvotes FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon delete request_upvotes"
  ON request_upvotes FOR DELETE TO anon USING (true);
