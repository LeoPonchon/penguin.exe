-- Add display_name column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Copy existing usernames to display_name for existing users
UPDATE profiles
SET display_name = username
WHERE display_name IS NULL AND username IS NOT NULL;

-- Make username truly unique (drop if exists first)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_username_key;
  END IF;
END $$;

ALTER TABLE profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);

-- Create index for faster lookups by username
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);

-- Update RLS policies to allow users to update their own display_name
DROP POLICY IF EXISTS "Users can update their own display name" ON profiles;
CREATE POLICY "Users can update their own display name"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
