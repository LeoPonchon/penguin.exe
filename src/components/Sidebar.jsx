import { useState } from 'react';
import { useChannel } from '../context/ChannelContext';
import { useAuth } from '../context/AuthContext';
import { useFriends } from '../context/FriendsContext';
import ProfileSettingsModal from './ProfileSettingsModal';
import FriendsModal from './FriendsModal';
import './Sidebar.css';

const getAvatarColor = (username) => {
  const colors = [
    '#5bb3e8', '#3da5d9', '#4db6ac', '#7cb342',
    '#42a5f5', '#26a69a', '#5c6bc0', '#7e57c2',
    '#64b5f6', '#81c784', '#4dd0e1', '#4fc3f7'
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (username) => {
  return username
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const Sidebar = () => {
  const { channels, currentChannel, setCurrentChannel, createChannel } = useChannel();
  const { profile, signOut } = useAuth();
  const { pendingRequests } = useFriends();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    setCreating(true);
    const { error } = await createChannel(newChannelName.trim());

    if (error) {
      alert('Error creating channel: ' + error.message);
    } else {
      setShowCreateModal(false);
      setNewChannelName('');
    }
    setCreating(false);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>🐧 Penguin.chat</h2>
      </div>

      <div className="sidebar-section">
        <div className="section-header">
          <h3>Channels</h3>
          <button
            className="add-channel-btn"
            onClick={() => setShowCreateModal(true)}
            title="Create channel"
          >
            +
          </button>
        </div>
        <div className="channels-list">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className={`channel-item ${currentChannel?.id === channel.id ? 'active' : ''}`}
              onClick={() => setCurrentChannel(channel)}
            >
              <span className="channel-icon">#</span>
              <span className="channel-name">{channel.slug}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="section-header clickable" onClick={() => setShowFriendsModal(true)}>
          <h3>Friends</h3>
          {pendingRequests.length > 0 && (
            <span className="pending-badge">{pendingRequests.length}</span>
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="current-user" onClick={() => setShowProfileModal(true)}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.display_name || profile.username} className="user-avatar small" />
          ) : (
            <div
              className="user-avatar-placeholder small"
              style={{ backgroundColor: getAvatarColor(profile?.username || 'User') }}
            >
              {getInitials(profile?.display_name || profile?.username || 'User')}
            </div>
          )}
          <div className="current-user-info">
            <span className="current-user-name">{profile?.display_name || profile?.username || 'User'}</span>
            <button className="logout-button" onClick={(e) => { e.stopPropagation(); signOut(); }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create Channel</h3>
            <form onSubmit={handleCreateChannel}>
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="Channel name"
                autoFocus
              />
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" disabled={creating || !newChannelName.trim()}>
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProfileModal && (
        <ProfileSettingsModal onClose={() => setShowProfileModal(false)} />
      )}

      {showFriendsModal && (
        <FriendsModal onClose={() => setShowFriendsModal(false)} />
      )}
    </div>
  );
};

export default Sidebar;
