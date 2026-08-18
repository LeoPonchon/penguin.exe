-- Add additional fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'online';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activity TEXT;

-- Add index on status for faster queries
CREATE INDEX IF NOT EXISTS profiles_status_idx ON profiles(status);
