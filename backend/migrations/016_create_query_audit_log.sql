-- =========================
-- QUERY AUDIT LOG
-- Tracks all query activity for admin oversight
-- =========================
CREATE TABLE query_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_request_id UUID NOT NULL REFERENCES query_requests(id),
  action TEXT NOT NULL CHECK (action IN ('SUBMITTED', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED')),
  performed_by UUID NOT NULL REFERENCES users(id),
  details JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_audit_log_query_id ON query_audit_log(query_request_id);
CREATE INDEX idx_audit_log_action ON query_audit_log(action);
CREATE INDEX idx_audit_log_created_at ON query_audit_log(created_at);
