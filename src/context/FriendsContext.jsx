import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../supabase/client';

const FriendsContext = createContext(null);

export const useFriends = () => {
  const context = useContext(FriendsContext);
  if (!context) {
    throw new Error('useFriends must be used within FriendsProvider');
  }
  return context;
};

export const FriendsProvider = ({ children }) => {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch friends list
  const fetchFriends = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setFriends([]);
        return;
      }

      // Get accepted friendships where user is either user_id or friend_id
      const { data, error } = await supabase
        .from('friendships')
        .select('id, user_id, friend_id, status, created_at, profiles!friendships_friend_id_fkey(id, username, display_name, avatar_url)')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to always show friend info
      const transformedFriends = (data || []).map(f => ({
        id: f.id,
        friend_id: f.user_id === user.id ? f.friend_id : f.user_id,
        username: f.profiles.username,
        display_name: f.profiles.display_name,
        avatar_url: f.profiles.avatar_url,
        created_at: f.created_at
      }));

      setFriends(transformedFriends);
    } catch (err) {
      console.error('Error fetching friends:', err);
    }
  }, []);

  // Fetch pending friend requests
  const fetchPendingRequests = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPendingRequests([]);
        return;
      }

      // Get pending requests where current user is the friend_id (recipient)
      const { data, error } = await supabase
        .from('friendships')
        .select('id, user_id, friend_id, created_at, profiles!friendships_user_id_fkey(id, username, display_name, avatar_url)')
        .eq('friend_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedRequests = (data || []).map(f => ({
        request_id: f.id,
        from_user_id: f.user_id,
        username: f.profiles.username,
        display_name: f.profiles.display_name,
        avatar_url: f.profiles.avatar_url,
        created_at: f.created_at
      }));

      setPendingRequests(transformedRequests);
    } catch (err) {
      console.error('Error fetching pending requests:', err);
    }
  }, []);

  // Add friend by username
  const addFriend = useCallback(async (username) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: new Error('Not authenticated') };

      // Find user by username
      const { data: targetUser, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (userError || !targetUser) {
        return { error: new Error('User not found') };
      }

      if (targetUser.id === user.id) {
        return { error: new Error('Cannot add yourself as a friend') };
      }

      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status, user_id')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'accepted') {
          return { error: new Error('Already friends') };
        } else if (existing.status === 'pending') {
          return { error: new Error('Friend request already pending') };
        } else if (existing.status === 'declined') {
          // Re-send the request by updating the declined one
          const { error: updateError } = await supabase
            .from('friendships')
            .update({ status: 'pending', updated_at: new Date().toISOString() })
            .eq('id', existing.id);

          if (updateError) throw updateError;
          return { error: null };
        }
      }

      // Create friendship request
      const { error: insertError } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: targetUser.id,
          status: 'pending'
        });

      if (insertError) throw insertError;

      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }, []);

  // Accept friend request
  const acceptRequest = useCallback(async (requestId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;

      await fetchFriends();
      await fetchPendingRequests();

      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }, [fetchFriends, fetchPendingRequests]);

  // Decline friend request
  const declineRequest = useCallback(async (requestId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'declined' })
        .eq('id', requestId);

      if (error) throw error;

      await fetchPendingRequests();

      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }, [fetchPendingRequests]);

  // Remove friend
  const removeFriend = useCallback(async (friendId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: new Error('Not authenticated') };

      // Delete friendship where user is either user_id or friend_id
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);

      if (error) throw error;

      await fetchFriends();

      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }, [fetchFriends]);

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchFriends(), fetchPendingRequests()]);
      setLoading(false);
    };
    loadData();
  }, [fetchFriends, fetchPendingRequests]);

  // Subscribe to friendship changes
  useEffect(() => {
    let channel;
    let mounted = true;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      // Subscribe to changes where current user is involved
      channel = supabase
        .channel('friendships-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friendships',
            filter: `user_id=eq.${user.id}`
          },
          async () => {
            if (mounted) {
              await Promise.all([fetchFriends(), fetchPendingRequests()]);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friendships',
            filter: `friend_id=eq.${user.id}`
          },
          async () => {
            if (mounted) {
              await Promise.all([fetchFriends(), fetchPendingRequests()]);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIPTION_ERROR') {
            console.error('Realtime subscription error');
          }
        });
    };

    setupSubscription();

    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchFriends, fetchPendingRequests]);

  const value = useMemo(() => ({
    friends,
    pendingRequests,
    loading,
    addFriend,
    acceptRequest,
    declineRequest,
    removeFriend,
    refetch: () => Promise.all([fetchFriends(), fetchPendingRequests()])
  }), [friends, pendingRequests, loading, addFriend, acceptRequest, declineRequest, removeFriend, fetchFriends, fetchPendingRequests]);

  return (
    <FriendsContext.Provider value={value}>
      {children}
    </FriendsContext.Provider>
  );
};
