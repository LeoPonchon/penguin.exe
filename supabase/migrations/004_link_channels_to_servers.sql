-- Add server_id to channels (nullable for now for backwards compatibility)
ALTER TABLE channels ADD COLUMN IF NOT EXISTS server_id UUID REFERENCES servers(id) ON DELETE CASCADE;

-- Add category field
ALTER TABLE channels ADD COLUMN IF NOT EXISTS category TEXT;

-- Add channel type (text, voice)
ALTER TABLE channels ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';

-- Update index
CREATE INDEX IF NOT EXISTS channels_server_id_idx ON channels(server_id);

-- Enable RLS on channels if not already enabled
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- Update policies to work with servers
CREATE POLICY "Channels are viewable by everyone"
ON channels FOR SELECT USING (true);

CREATE POLICY "Server members can create channels"
ON channels FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM server_members
    WHERE server_members.server_id = channels.server_id
    AND server_members.user_id = auth.uid()
    AND server_members.role IN ('owner', 'admin', 'moderator')
  )
);

CREATE POLICY "Server members can update channels"
ON channels FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM server_members
    WHERE server_members.server_id = channels.server_id
    AND server_members.user_id = auth.uid()
    AND server_members.role IN ('owner', 'admin', 'moderator')
  )
);

CREATE POLICY "Server members can delete channels"
ON channels FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM server_members
    WHERE server_members.server_id = channels.server_id
    AND server_members.user_id = auth.uid()
    AND server_members.role IN ('owner', 'admin')
  )
);
