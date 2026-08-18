-- Enable RLS on dm_conversations
ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;

-- Users can view DM conversations they are part of
CREATE POLICY "Users can view their own DM conversations"
ON dm_conversations FOR SELECT
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can create DM conversations
CREATE POLICY "Users can create DM conversations"
ON dm_conversations FOR INSERT
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can delete their own DM conversations
CREATE POLICY "Users can delete their own DM conversations"
ON dm_conversations FOR DELETE
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS dm_conversations_user1_idx ON dm_conversations(user1_id);
CREATE INDEX IF NOT EXISTS dm_conversations_user2_idx ON dm_conversations(user2_id);
CREATE INDEX IF NOT EXISTS dm_conversations_channel_idx ON dm_conversations(channel_id);

-- Add type column to channels table if not exists (for distinguishing DMs from server channels)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'channels' AND column_name = 'type'
  ) THEN
    ALTER TABLE channels ADD COLUMN type TEXT DEFAULT 'text';
  END IF;
END $$;

-- Update channels RLS to allow users to create DM channels
DROP POLICY IF EXISTS "Users can create DM channels" ON channels;
CREATE POLICY "Users can create DM channels"
ON channels FOR INSERT
WITH CHECK (
  type = 'dm' AND
  server_id IS NULL AND
  -- Only if user is part of the DM conversation
  EXISTS (
    SELECT 1 FROM dm_conversations
    WHERE dm_conversations.channel_id = channels.id
    AND (dm_conversations.user1_id = auth.uid() OR dm_conversations.user2_id = auth.uid())
  )
);

-- Enable realtime for dm_conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'dm_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE dm_conversations;
  END IF;
END $$;
