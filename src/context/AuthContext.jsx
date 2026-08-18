import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { uploadAvatar, uploadBanner } from '../utils/storage';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Create profile if it doesn't exist
  const createProfileIfNeeded = useCallback(async (userId, username, email, displayName) => {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingProfile) {
      // Profile doesn't exist, create it
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: username || email.split('@')[0],
          display_name: displayName || username || email.split('@')[0],
          avatar_url: null
        })
        .select()
        .single();

      if (!error) {
        return newProfile;
      }
    }
    return existingProfile;
  }, []);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);

      if (session?.user) {
        // First try to get existing profile
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(async ({ data }) => {
            if (mounted) {
              if (data) {
                setProfile(data);
              } else {
                // Profile doesn't exist, create it
                const username = session.user.user_metadata?.username;
                const displayName = session.user.user_metadata?.display_name || username;
                const email = session.user.email;
                const newProfile = await createProfileIfNeeded(session.user.id, username, email, displayName);
                if (newProfile) {
                  setProfile(newProfile);
                }
              }
              setLoading(false);
            }
          })
          .catch(async () => {
            // Error fetching, try to create profile
            if (mounted) {
              const username = session.user.user_metadata?.username;
              const displayName = session.user.user_metadata?.display_name || username;
              const email = session.user.email;
              const newProfile = await createProfileIfNeeded(session.user.id, username, email, displayName);
              if (newProfile) {
                setProfile(newProfile);
              }
              setLoading(false);
            }
          });
      } else {
        if (mounted) setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);

        if (session?.user) {
          supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            .then(async ({ data }) => {
              if (mounted) {
                if (data) {
                  setProfile(data);
                } else {
                  const username = session.user.user_metadata?.username;
                  const displayName = session.user.user_metadata?.display_name || username;
                  const email = session.user.email;
                  const newProfile = await createProfileIfNeeded(session.user.id, username, email, displayName);
                  if (newProfile) {
                    setProfile(newProfile);
                  }
                }
              }
            })
            .catch(() => {});
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [createProfileIfNeeded]);

  const signUp = useCallback(async (email, password, username, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: displayName || username }
      }
    });
    return { data, error };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const resetPassword = useCallback(async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    return { data, error };
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data);
    }

    return { data, error };
  }, [user]);

  const updateAvatar = useCallback(async (file) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data: url, error: uploadError } = await uploadAvatar(file, user.id);
    if (uploadError) return { error: uploadError };

    return updateProfile({ avatar_url: url });
  }, [user, updateProfile]);

  const updateBanner = useCallback(async (file) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data: url, error: uploadError } = await uploadBanner(file, user.id);
    if (uploadError) return { error: uploadError };

    return updateProfile({ banner_url: url });
  }, [user, updateProfile]);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    updateAvatar,
    updateBanner,
  }), [user, profile, loading, signUp, signIn, signOut, resetPassword, updateProfile, updateAvatar, updateBanner]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
