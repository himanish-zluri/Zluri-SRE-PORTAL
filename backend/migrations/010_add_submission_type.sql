ALTER TYPE submission_type ADD VALUE 'SCRIPT';
ALTER TABLE query_requests
ADD COLUMN script_path TEXT;
