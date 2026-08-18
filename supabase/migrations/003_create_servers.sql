-- Servers table
CREATE TABLE IF NOT EXISTS servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon_url TEXT,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Server members table
CREATE TABLE IF NOT EXISTS server_members (
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (server_id, user_id)
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  permissions INTEGER DEFAULT 0,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'base64'),
  created_by UUID REFERENCES auth.users(id),
  uses INTEGER DEFAULT 0,
  max_uses INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS server_members_user_id_idx ON server_members(user_id);
CREATE INDEX IF NOT EXISTS server_members_server_id_idx ON server_members(server_id);
CREATE INDEX IF NOT EXISTS roles_server_id_idx ON roles(server_id);
CREATE INDEX IF NOT EXISTS invitations_code_idx ON invitations(code);
CREATE INDEX IF NOT EXISTS invitations_server_id_idx ON invitations(server_id);

-- RLS Policies
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Servers policies
CREATE POLICY "Servers are viewable by everyone"
ON servers FOR SELECT USING (true);

CREATE POLICY "Users can create servers"
ON servers FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their servers"
ON servers FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their servers"
ON servers FOR DELETE USING (auth.uid() = owner_id);

-- Server members policies
CREATE POLICY "Server members are viewable by everyone"
ON server_members FOR SELECT USING (true);

CREATE POLICY "Users can join servers"
ON server_members FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own membership"
ON server_members FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can leave servers"
ON server_members FOR DELETE USING (auth.uid() = user_id);

-- Roles policies
CREATE POLICY "Roles are viewable by everyone"
ON roles FOR SELECT USING (true);

CREATE POLICY "Server members can create roles for their server"
ON roles FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM server_members
    WHERE server_members.server_id = roles.server_id
    AND server_members.user_id = auth.uid()
    AND server_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Server members can update roles for their server"
ON roles FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM server_members
    WHERE server_members.server_id = roles.server_id
    AND server_members.user_id = auth.uid()
    AND server_members.role IN ('owner', 'admin')
  )
);

-- Invitations policies
CREATE POLICY "Invitations are viewable by everyone"
ON invitations FOR SELECT USING (true);

CREATE POLICY "Server members can create invitations"
ON invitations FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM server_members
    WHERE server_members.server_id = invitations.server_id
    AND server_members.user_id = auth.uid()
    AND server_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Anyone can use a valid invitation"
ON invitations FOR UPDATE USING (true);
