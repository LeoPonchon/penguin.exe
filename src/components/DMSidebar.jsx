import { useState, useCallback } from 'react';
import { useDM } from '../context/DMContext';
import { useChannel } from '../context/ChannelContext';
import { supabase } from '../supabase/client';
import './Sidebar.css';

const DMSidebar = () => {
  const { dms, loading } = useDM();
  const { currentChannel, setCurrentChannel } = useChannel();
  const [loadingChannel, setLoadingChannel] = useState(null);

  const handleBackToDashboard = () => {
    setCurrentChannel(null);
  };

  const handleDMClick = useCallback(async (channelId) => {
    try {
      setLoadingChannel(channelId);
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .single();

      if (error) throw error;
      if (data) {
        setCurrentChannel(data);
      }
    } catch (err) {
      console.error('Error loading DM channel:', err);
    } finally {
      setLoadingChannel(null);
    }
  }, [setCurrentChannel]);

  if (loading) {
    return (
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Direct Messages</h2>
        </div>
        <div className="sidebar-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <button className="back-button" onClick={handleBackToDashboard}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h2>Direct Messages</h2>
      </div>

      <div className="sidebar-sections">
        <div className="sidebar-section">
          {dms.length === 0 ? (
            <div className="empty-dms">
              <p>No DMs yet</p>
              <p className="empty-dms-hint">Message a friend from the Dashboard!</p>
            </div>
          ) : (
            <div className="channel-list">
              {dms.map(dm => (
                <div
                  key={dm.id}
                  className={`channel-item ${currentChannel?.id === dm.channel_id ? 'active' : ''}${loadingChannel === dm.channel_id ? ' loading' : ''}`}
                  onClick={() => handleDMClick(dm.channel_id)}
                >
                  <div
                    className="dm-avatar"
                    style={
                      dm.other_avatar_url
                        ? { backgroundImage: `url(${dm.other_avatar_url})` }
                        : { backgroundColor: getAvatarColor(dm.other_display_name || dm.other_username) }
                    }
                  >
                    {!dm.other_avatar_url && (dm.other_display_name || dm.other_username)?.charAt(0).toUpperCase()}
                  </div>
                  <span className="channel-name">
                    {dm.other_display_name || dm.other_username}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const getAvatarColor = (name) => {
  const colors = [
    '#5bb3e8', '#3da5d9', '#4db6ac', '#7cb342',
    '#42a5f5', '#26a69a', '#5c6bc0', '#7e57c2',
    '#64b5f6', '#81c784', '#4dd0e1', '#4fc3f7'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default DMSidebar;
