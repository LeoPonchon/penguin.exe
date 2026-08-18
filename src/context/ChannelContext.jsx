import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from './AuthContext';
import { useServer } from './ServerContext';

const ChannelContext = createContext(null);

export const useChannel = () => {
  const context = useContext(ChannelContext);
  if (!context) {
    throw new Error('useChannel must be used within ChannelProvider');
  }
  return context;
};

export const ChannelProvider = ({ children }) => {
  const { user } = useAuth();
  const { currentServer } = useServer();
  const [channels, setChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch channels for current server
  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from('channels').select('*');

      // Filter by server if one is selected
      if (currentServer) {
        query = query.eq('server_id', currentServer.id);
      } else {
        // Show only channels without a server (DMs, etc.)
        query = query.is('server_id', null);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;

      setChannels(data || []);

      // Auto-select first channel if none selected and we have channels
      if (data && data.length > 0 && !currentChannel) {
        setCurrentChannel(data[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentServer, currentChannel]);

  // Create a new channel
  const createChannel = useCallback(async (name, slug, description) => {
    try {
      const channelData = {
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description,
        created_by: user?.id
      };

      // Add server_id if in a server
      if (currentServer) {
        channelData.server_id = currentServer.id;
      }

      const { data, error } = await supabase
        .from('channels')
        .insert(channelData)
        .select()
        .single();

      if (error) throw error;

      setChannels(prev => [...prev, data]);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }, [user?.id, currentServer]);

  // Join a channel (for private channels)
  const joinChannel = useCallback(async (channelId) => {
    try {
      const { error } = await supabase
        .from('channel_members')
        .insert({
          channel_id: channelId,
          user_id: user?.id
        });

      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }, [user?.id]);

  // Load channels on mount and when server changes
  useEffect(() => {
    if (user) {
      fetchChannels();
    } else {
      setChannels([]);
      setCurrentChannel(null);
      setLoading(false);
    }
  }, [user, currentServer, fetchChannels]);

  // Reset channels and current channel immediately when server changes
  useEffect(() => {
    setChannels([]);
    setCurrentChannel(null);
  }, [currentServer?.id]);

  // Subscribe to realtime channel changes
  useEffect(() => {
    const serverId = currentServer?.id;
    if (!serverId) return;

    const channel = supabase
      .channel(`channels:${serverId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channels',
          filter: `server_id=eq.${serverId}`
        },
        () => {
          fetchChannels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentServer?.id, fetchChannels]);

  const value = useMemo(() => ({
    channels,
    currentChannel,
    loading,
    error,
    setCurrentChannel,
    createChannel,
    joinChannel,
    refetchChannels: fetchChannels
  }), [channels, currentChannel, loading, error, createChannel, joinChannel, fetchChannels]);

  return (
    <ChannelContext.Provider value={value}>
      {children}
    </ChannelContext.Provider>
  );
};
