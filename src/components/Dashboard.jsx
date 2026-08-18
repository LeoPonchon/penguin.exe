import { useState, useCallback } from 'react';
import { useServer } from '../context/ServerContext';
import { useAuth } from '../context/AuthContext';
import { useFriends } from '../context/FriendsContext';
import { useDM } from '../context/DMContext';
import { useChannel } from '../context/ChannelContext';
import { supabase } from '../supabase/client';
import CreateServerModal from './CreateServerModal';
import JoinServerModal from './JoinServerModal';
import './Dashboard.css';

const Dashboard = () => {
  const { servers } = useServer();
  const { profile } = useAuth();
  const { friends } = useFriends();
  const { startDM } = useDM();
  const { setCurrentChannel } = useChannel();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Start a DM with a friend
  const handleStartDM = useCallback(async (friendId) => {
    const { data, error } = await startDM(friendId);
    if (error) {
      console.error('Error starting DM:', error);
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
  }, [startDM, setCurrentChannel]);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {profile?.display_name || profile?.username || 'User'}!</h1>
        <p>Here's what's happening with your servers</p>
      </div>

      <div className="dashboard-content">
        {/* Quick actions */}
        <div className="dashboard-section quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <button className="action-btn primary" onClick={() => setShowCreateModal(true)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Create a Server
            </button>
            <button className="action-btn secondary" onClick={() => setShowJoinModal(true)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 3 11.11 3.59 12.59 4.57 13.73L4.29 14H3.5C2.12 14 1 15.12 1 16.5V19c0 1.38 1.12 2.5 2.5 2.5h11c1.38 0 2.5-1.12 2.5-2.5v-2.5c0-1.38-1.12-2.5-2.5-2.5z" />
              </svg>
              Join a Server
            </button>
          </div>
        </div>

        {/* Friends */}
        <div className="dashboard-section">
          <h2>Friends</h2>
          {friends.length === 0 ? (
            <div className="empty-state">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#5865f2" strokeWidth="1">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <h3>No friends yet</h3>
              <p>Add friends to start private conversations!</p>
            </div>
          ) : (
            <div className="friends-grid">
              {friends.map(friend => (
                <div key={friend.id} className="friend-card">
                  <div
                    className="friend-avatar"
                    style={
                      friend.avatar_url
                        ? { backgroundImage: `url(${friend.avatar_url})` }
                        : { backgroundColor: getAvatarColor(friend.display_name || friend.username) }
                    }
                  >
                    {!friend.avatar_url && (friend.display_name || friend.username)?.charAt(0).toUpperCase()}
                  </div>
                  <div className="friend-info">
                    <h3>{friend.display_name || friend.username}</h3>
                    <p>@{friend.username}</p>
                  </div>
                  <button
                    className="message-btn"
                    onClick={() => handleStartDM(friend.friend_id)}
                    title="Send message"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Message
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Your servers */}
        <div className="dashboard-section">
          <h2>Your Servers</h2>
          {servers.length === 0 ? (
            <div className="empty-state">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#5865f2" strokeWidth="1">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
              </svg>
              <h3>No servers yet</h3>
              <p>Create your first server or join one with an invite code!</p>
            </div>
          ) : (
            <div className="servers-grid">
              {servers.map(server => (
                <div key={server.id} className="server-card">
                  <div
                    className="server-card-icon"
                    style={
                      server.icon_url
                        ? { backgroundImage: `url(${server.icon_url})` }
                        : { backgroundColor: getServerColor(server.name) }
                    }
                  >
                    {!server.icon_url && server.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="server-card-info">
                    <h3>{server.name}</h3>
                    <p>{server.description || 'No description'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Getting started */}
        {servers.length === 0 && (
          <div className="dashboard-section getting-started">
            <h2>Getting Started</h2>
            <div className="steps-list">
              <div className="step-item">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>Create a Server</h3>
                  <p>Make your own server and invite friends to hang out.</p>
                </div>
              </div>
              <div className="step-item">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>Join a Server</h3>
                  <p>Have an invite code? Join an existing server.</p>
                </div>
              </div>
              <div className="step-item">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>Start Chatting</h3>
                  <p>Join channels and start conversations with your community.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateServerModal onClose={() => setShowCreateModal(false)} />
      )}

      {showJoinModal && (
        <JoinServerModal onClose={() => setShowJoinModal(false)} />
      )}
    </div>
  );
};

const getServerColor = (name) => {
  const colors = [
    '#5865f2', '#57f287', '#fee75c', '#eb459e',
    '#ed4245', '#9b59b6', '#3498db', '#1abc9c',
    '#f39c12', '#e74c3c', '#8e44ad', '#2ecc71'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
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

export default Dashboard;
