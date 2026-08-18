import { useEffect, useRef } from 'react';
import { useDM } from '../context/DMContext';
import { useChannel } from '../context/ChannelContext';
import { supabase } from '../supabase/client';
import './UserContextMenu.css';

const UserContextMenu = ({ userId, username, displayName, avatarUrl, position, onClose }) => {
  const menuRef = useRef(null);
  const { startDM } = useDM();
  const { setCurrentChannel } = useChannel();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleSendMessage = async () => {
    const { data, error } = await startDM(userId);
    if (error) {
      console.error('Error starting DM:', error);
      onClose();
      return;
    }
    if (data?.channel_id) {
      // Fetch and set the DM channel
      const { data: channel } = await supabase
        .from('channels')
        .select('*')
        .eq('id', data.channel_id)
        .single();
      if (channel) {
        setCurrentChannel(channel);
      }
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="user-context-menu"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`
      }}
    >
      <div className="context-menu-header">
        <div
          className="context-menu-avatar"
          style={
            avatarUrl
              ? { backgroundImage: `url(${avatarUrl})` }
              : { backgroundColor: getAvatarColor(displayName || username) }
          }
        >
          {!avatarUrl && (displayName || username)?.charAt(0).toUpperCase()}
        </div>
        <div className="context-menu-user-info">
          <div className="context-menu-display-name">{displayName || username}</div>
          <div className="context-menu-username">@{username}</div>
        </div>
      </div>

      <div className="context-menu-divider"></div>

      <div className="context-menu-actions">
        <button className="context-menu-action primary" onClick={handleSendMessage}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Send Message
        </button>
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

export default UserContextMenu;
