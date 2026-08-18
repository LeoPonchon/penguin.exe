-- Drop the old global unique constraint on slug
ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_slug_key;

-- Add a composite unique constraint on (server_id, slug)
-- This allows the same slug in different servers, but not in the same server
ALTER TABLE channels ADD CONSTRAINT channels_server_slug_key UNIQUE (server_id, slug);

-- Note: For DM channels (server_id is NULL), this allows unique slugs across all DMs
-- If you want DMs to also be unique, you might want a different approach
