import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../supabase/client';

const ServerContext = createContext(null);

export const useServer = () => {
  const context = useContext(ServerContext);
  if (!context) {
    throw new Error('useServer must be used within ServerProvider');
  }
  return context;
};

export const ServerProvider = ({ children }) => {
  const [servers, setServers] = useState([]);
  const [currentServer, setCurrentServer] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's servers
  const fetchServers = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setServers([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('server_members')
        .select('server_id, servers(*)')
        .eq('user_id', user.id);

      if (error) throw error;

      const serverList = data?.map(m => m.servers).filter(Boolean) || [];
      setServers(serverList);
    } catch (err) {
      console.error('Error fetching servers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new server
  const createServer = useCallback(async (name, description) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: new Error('Not authenticated') };

      // Create server
      const { data: server, error: serverError } = await supabase
        .from('servers')
        .insert({
          name,
          description
        })
        .select()
        .single();

      if (serverError) throw serverError;

      // Add owner as member
      const { error: memberError } = await supabase
        .from('server_members')
        .insert({
          server_id: server.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) throw memberError;

      // Create default channels
      await supabase.from('channels').insert([
        { server_id: server.id, slug: 'general', name: 'General', type: 'text' },
        { server_id: server.id, slug: 'random', name: 'Random', type: 'text' }
      ]);

      await fetchServers();
      setCurrentServer(server);

      return { data: server, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }, [fetchServers]);

  // Join a server via invite code
  const joinServer = useCallback(async (code) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: new Error('Not authenticated') };

      // Get invitation
      const { data: invite, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('code', code)
        .single();

      if (inviteError || !invite) {
        return { error: new Error('Invalid invite code') };
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('server_members')
        .select('*')
        .eq('server_id', invite.server_id)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        setCurrentServer(existing.servers);
        return { data: existing, error: null };
      }

      // Join server
      const { error: joinError } = await supabase
        .from('server_members')
        .insert({
          server_id: invite.server_id,
          user_id: user.id,
          role: 'member'
        });

      if (joinError) throw joinError;

      // Update invitation uses
      await supabase
        .from('invitations')
        .update({ uses: invite.uses + 1 })
        .eq('id', invite.id);

      await fetchServers();

      return { data: null, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }, [fetchServers]);

  // Leave a server
  const leaveServer = useCallback(async (serverId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: new Error('Not authenticated') };

      const { error } = await supabase
        .from('server_members')
        .delete()
        .eq('server_id', serverId)
        .eq('user_id', user.id);

      if (error) throw error;

      if (currentServer?.id === serverId) {
        setCurrentServer(null);
      }

      await fetchServers();
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }, [currentServer, fetchServers]);

  // Create invite code
  const createInvite = useCallback(async (serverId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: new Error('Not authenticated') };

      const { data, error } = await supabase
        .from('invitations')
        .insert({
          server_id: serverId,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }, []);

  // Fetch invites for a server
  const fetchInvites = useCallback(async (serverId) => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('server_id', serverId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }, []);

  // Delete a server
  const deleteServer = useCallback(async (serverId) => {
    try {
      const { error } = await supabase
        .from('servers')
        .delete()
        .eq('id', serverId);

      if (error) throw error;

      if (currentServer?.id === serverId) {
        setCurrentServer(null);
      }

      await fetchServers();
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }, [currentServer, fetchServers]);

  // Fetch roles for current server
  const fetchRoles = useCallback(async (serverId) => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('server_id', serverId)
        .order('position', { ascending: true });

      if (error) throw error;

      setRoles(data || []);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }, []);

  // Create a new role
  const createRole = useCallback(async (serverId, name, color, permissions = 0) => {
    try {
      // Get highest position
      const { data: existingRoles } = await supabase
        .from('roles')
        .select('position')
        .eq('server_id', serverId)
        .order('position', { ascending: false })
        .limit(1);

      const position = existingRoles && existingRoles.length > 0 ? existingRoles[0].position + 1 : 0;

      const { data, error } = await supabase
        .from('roles')
        .insert({
          server_id: serverId,
          name,
          color,
          permissions,
          position
        })
        .select()
        .single();

      if (error) throw error;

      await fetchRoles(serverId);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }, [fetchRoles]);

  // Update a role
  const updateRole = useCallback(async (roleId, updates) => {
    try {
      const { error } = await supabase
        .from('roles')
        .update(updates)
        .eq('id', roleId);

      if (error) throw error;

      if (currentServer) {
        await fetchRoles(currentServer.id);
      }

      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }, [currentServer, fetchRoles]);

  // Delete a role
  const deleteRole = useCallback(async (roleId) => {
    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      if (currentServer) {
        await fetchRoles(currentServer.id);
      }

      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }, [currentServer, fetchRoles]);

  // Fetch server members with their profiles
  const fetchMembers = useCallback(async (serverId) => {
    try {
      const { data, error } = await supabase
        .from('server_members')
        .select('user_id, nickname, role, joined_at, profiles(user_id, username, display_name, avatar_url)')
        .eq('server_id', serverId);

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }, []);

  // Update member role
  const updateMemberRole = useCallback(async (serverId, userId, newRole) => {
    try {
      const { error } = await supabase
        .from('server_members')
        .update({ role: newRole })
        .eq('server_id', serverId)
        .eq('user_id', userId);

      if (error) throw error;

      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  // Fetch roles when server changes
  useEffect(() => {
    if (currentServer) {
      fetchRoles(currentServer.id);
    } else {
      setRoles([]);
    }
  }, [currentServer, fetchRoles]);

  // Subscribe to server membership changes
  useEffect(() => {
    const channel = supabase
      .channel('server-members-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'server_members'
        },
        () => fetchServers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchServers]);

  const value = useMemo(() => ({
    servers,
    currentServer,
    setCurrentServer,
    roles,
    createServer,
    joinServer,
    leaveServer,
    deleteServer,
    createInvite,
    fetchInvites,
    fetchRoles,
    createRole,
    updateRole,
    deleteRole,
    fetchMembers,
    updateMemberRole,
    loading
  }), [servers, currentServer, roles, createServer, joinServer, leaveServer, deleteServer, createInvite, fetchInvites, fetchRoles, createRole, updateRole, deleteRole, fetchMembers, updateMemberRole, loading]);

  return (
    <ServerContext.Provider value={value}>
      {children}
    </ServerContext.Provider>
  );
};
