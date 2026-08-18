import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from './AuthContext';

const DMContext = createContext(null);

export const useDM = () => {
  const context = useContext(DMContext);
  if (!context) {
    throw new Error('useDM must be used within DMProvider');
  }
  return context;
};

export const DMProvider = ({ children }) => {
  const { user } = useAuth();
  const [dms, setDMs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all DM conversations for current user
  const fetchDMs = useCallback(async () => {
    if (!user) {
      setDMs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get DMs where user is either user1 or user2
      const { data, error } = await supabase
        .from('dm_conversations')
        .select(`
          id,
          channel_id,
          user1_id,
          user2_id,
          created_at,
          profiles!dm_conversations_user1_id_fkey(id, username, display_name, avatar_url),
          profiles!dm_conversations_user2_id_fkey(id, username, display_name, avatar_url),
          channels(id, name, slug)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to show the other user's info
      const transformedDMs = (data || []).map(dm => {
        const isUser1 = dm.user1_id === user.id;
        const otherUser = isUser1 ? dm.profiles : dm.profiles1;

        return {
          id: dm.id,
          channel_id: dm.channel_id,
          other_user_id: isUser1 ? dm.user2_id : dm.user1_id,
          other_username: otherUser.username,
          other_display_name: otherUser.display_name,
          other_avatar_url: otherUser.avatar_url,
          created_at: dm.created_at
        };
      });

      setDMs(transformedDMs);
    } catch (err) {
      console.error('Error fetching DMs:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Start a DM with a user (find existing or create new)
  const startDM = useCallback(async (otherUserId) => {
    if (!user) return { error: new Error('Not authenticated') };
    if (otherUserId === user.id) return { error: new Error('Cannot DM yourself') };

    try {
      // Check if DM already exists
      const { data: existing, error: checkError } = await supabase
        .from('dm_conversations')
        .select('id, channel_id, channels(*)')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      // If DM exists, return it
      if (existing) {
        return { data: existing, error: null };
      }

      // Create new DM channel
      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .insert({
          name: `DM_${user.id}_${otherUserId}`,
          slug: `dm-${user.id}-${otherUserId}`,
          type: 'dm',
          server_id: null
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Create DM conversation
      const { data: dmConversation, error: dmError } = await supabase
        .from('dm_conversations')
        .insert({
          channel_id: channel.id,
          user1_id: user.id,
          user2_id: otherUserId
        })
        .select(`
          id,
          channel_id,
          user1_id,
          user2_id,
          created_at,
          channels(id, name, slug)
        `)
        .single();

      if (dmError) throw dmError;

      await fetchDMs();

      return { data: dmConversation, error: null };
    } catch (err) {
      console.error('Error starting DM:', err);
      return { data: null, error: err };
    }
  }, [user, fetchDMs]);

  // Get DM channel ID for a specific user
  const getDMChannelId = useCallback(async (otherUserId) => {
    if (!user) return null;

    const { data } = await supabase
      .from('dm_conversations')
      .select('channel_id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
      .maybeSingle();

    return data?.channel_id || null;
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchDMs();
  }, [fetchDMs]);

  // Subscribe to DM conversation changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('dm-conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dm_conversations',
          filter: `user1_id=eq.${user.id}`
        },
        () => fetchDMs()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dm_conversations',
          filter: `user2_id=eq.${user.id}`
        },
        () => fetchDMs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchDMs]);

  const value = useMemo(() => ({
    dms,
    loading,
    startDM,
    getDMChannelId,
    refetch: fetchDMs
  }), [dms, loading, startDM, getDMChannelId, fetchDMs]);

  return (
    <DMContext.Provider value={value}>
      {children}
    </DMContext.Provider>
  );
};
