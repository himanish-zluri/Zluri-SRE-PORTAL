-- Add slack_id column to users table for Slack DM integration
ALTER TABLE users ADD COLUMN IF NOT EXISTS slack_id VARCHAR(50);
