-- Add admin_comment column to users table for admin notes
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_comment TEXT DEFAULT NULL;
