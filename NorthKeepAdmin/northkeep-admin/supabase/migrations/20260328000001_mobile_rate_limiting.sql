-- Rate limiting for mobile (anon) write endpoints.
-- Uses a trigger function that counts recent inserts per device_id
-- and rejects if the limit is exceeded within the time window.
-- Service role (admin) operations bypass the limit.

CREATE OR REPLACE FUNCTION check_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count int;
  max_allowed int;
  window_interval interval;
BEGIN
  -- Skip if no device_id (shouldn't happen, but be safe)
  IF NEW.device_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip rate limiting for service_role (admin operations)
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Configure limits per table
  CASE TG_TABLE_NAME
    WHEN 'guide_feedback' THEN
      max_allowed := 20;          -- 20 feedback submissions per hour
      window_interval := '1 hour';
    WHEN 'app_feedback' THEN
      max_allowed := 10;          -- 10 app feedback submissions per hour
      window_interval := '1 hour';
    WHEN 'guide_requests' THEN
      max_allowed := 5;           -- 5 guide requests per hour
      window_interval := '1 hour';
    WHEN 'request_upvotes' THEN
      max_allowed := 30;          -- 30 upvotes per hour
      window_interval := '1 hour';
    ELSE
      max_allowed := 50;
      window_interval := '1 hour';
  END CASE;

  -- Count recent rows from this device
  EXECUTE format(
    'SELECT count(*) FROM %I WHERE device_id = $1 AND created_at > now() - $2',
    TG_TABLE_NAME
  ) INTO recent_count USING NEW.device_id, window_interval;

  IF recent_count >= max_allowed THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please try again later.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables that accept anonymous inserts
CREATE TRIGGER rate_limit_guide_feedback
  BEFORE INSERT ON guide_feedback
  FOR EACH ROW EXECUTE FUNCTION check_rate_limit();

CREATE TRIGGER rate_limit_app_feedback
  BEFORE INSERT ON app_feedback
  FOR EACH ROW EXECUTE FUNCTION check_rate_limit();

CREATE TRIGGER rate_limit_guide_requests
  BEFORE INSERT ON guide_requests
  FOR EACH ROW EXECUTE FUNCTION check_rate_limit();

CREATE TRIGGER rate_limit_request_upvotes
  BEFORE INSERT ON request_upvotes
  FOR EACH ROW EXECUTE FUNCTION check_rate_limit();
