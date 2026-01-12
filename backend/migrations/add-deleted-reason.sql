-- Add deleted_reason column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_reason TEXT DEFAULT NULL;
