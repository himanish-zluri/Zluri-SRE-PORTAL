-- Migration: Rename script_path to script_content and change type to TEXT
-- This migration changes from storing file paths to storing script content directly in DB

-- Step 1: Add new column
ALTER TABLE query_requests ADD COLUMN script_content TEXT;

-- Step 2: Copy any existing script content (if files exist, this would need manual handling)
-- For now, we just leave existing script submissions without content
-- They can be re-submitted if needed

-- Step 3: Drop old column
ALTER TABLE query_requests DROP COLUMN IF EXISTS script_path;
