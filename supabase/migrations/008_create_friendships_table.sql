-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique friendships (one direction only)
  -- A friendship between A and B can exist with either A as user_id and B as friend_id
  -- We'll handle both directions in queries
  UNIQUE (user_id, friend_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS friendships_user_id_idx ON friendships(user_id);
CREATE INDEX IF NOT EXISTS friendships_friend_id_idx ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS friendships_status_idx ON friendships(status);
CREATE INDEX IF NOT EXISTS friendships_user_status_idx ON friendships(user_id, status);

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- RLS Policies:
-- Users can see all friendships where they are either user_id or friend_id
CREATE POLICY "Users can view their own friendships"
ON friendships FOR SELECT
USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);

-- Users can insert friendships where they are the user_id (sending requests)
CREATE POLICY "Users can create friendships"
ON friendships FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update friendships where they are the recipient (accepting/declining)
-- or where they are the sender (cancelling)
CREATE POLICY "Users can update their friendships"
ON friendships FOR UPDATE
USING (
  auth.uid() = user_id OR auth.uid() = friend_id
)
WITH CHECK (
  auth.uid() = user_id OR auth.uid() = friend_id
);

-- Users can delete friendships where they are involved
CREATE POLICY "Users can delete their friendships"
ON friendships FOR DELETE
USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);

-- Function to get friends list (returns accepted friendships)
CREATE OR REPLACE FUNCTION get_friends(user_param UUID)
RETURNS TABLE (
  friend_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as friend_id,
    p.username,
    p.display_name,
    p.avatar_url,
    f.status,
    f.created_at
  FROM friendships f
  JOIN profiles p ON (
    -- If current user is user_id, friend is friend_id
    -- If current user is friend_id, friend is user_id
    (f.user_id = user_param AND f.friend_id = p.id) OR
    (f.friend_id = user_param AND f.user_id = p.id)
  )
  WHERE f.status = 'accepted'
    AND (f.user_id = user_param OR f.friend_id = user_param);
END;
$$ LANGUAGE plpgsql;

-- Function to get pending friend requests
CREATE OR REPLACE FUNCTION get_friend_requests(user_param UUID)
RETURNS TABLE (
  request_id UUID,
  from_user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id as request_id,
    f.user_id as from_user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    f.created_at
  FROM friendships f
  JOIN profiles p ON f.user_id = p.id
  WHERE f.friend_id = user_param
    AND f.status = 'pending';
END;
$$ LANGUAGE plpgsql;
