import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from './AuthContext';
import { useChannel } from './ChannelContext';

const ChatContext = createContext(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { currentChannel } = useChannel();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all profiles for a set of user IDs
  const fetchProfiles = useCallback(async (userIds) => {
    if (userIds.length === 0) return {};

    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds);

    const profileMap = {};
    data?.forEach(profile => {
      profileMap[profile.id] = profile;
    });
    return profileMap;
  }, []);

  // Fetch messages for current channel
  const fetchMessages = useCallback(async (channelId) => {
    if (!channelId) return;

    try {
      setLoading(true);
      setError(null);

      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Get unique user IDs from messages
      const userIds = [...new Set(messages.map(m => m.user_id))];
      const profiles = await fetchProfiles(userIds);

      // Combine messages with profiles
      const combinedMessages = messages.map(msg => ({
        ...msg,
        profiles: profiles[msg.user_id] || { username: 'Unknown', display_name: 'Unknown', avatar_url: null }
      }));

      setMessages(combinedMessages);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchProfiles]);

  // Send a message
  const sendMessage = useCallback(async (content) => {
    if (!user || !currentChannel || !content.trim()) {
      return { error: { message: 'Not authenticated or no channel selected' } };
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          channel_id: currentChannel.id,
          content: content.trim(),
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Get user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', user.id)
        .single();

      const messageWithProfile = {
        ...data,
        profiles: profileData || { username: 'Unknown', display_name: 'Unknown', avatar_url: null }
      };

      return { data: messageWithProfile, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }, [user, currentChannel]);

  // Subscribe to realtime messages for current channel
  useEffect(() => {
    if (!currentChannel) return;

    // Fetch initial messages
    fetchMessages(currentChannel.id);

    // Set up realtime subscription
    const channel = supabase
      .channel(`messages:${currentChannel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${currentChannel.id}`
        },
        async (payload) => {
          // Fetch the profile for this message
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          const newMessage = {
            ...payload.new,
            profiles: profileData || { username: 'Unknown', display_name: 'Unknown', avatar_url: null }
          };
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${currentChannel.id}`
        },
        (payload) => {
          setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChannel, fetchMessages]);

  const value = useMemo(() => ({
    messages,
    loading,
    error,
    sendMessage,
  }), [messages, loading, error, sendMessage]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
