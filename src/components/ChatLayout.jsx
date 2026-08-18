import { useEffect, useRef, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { useChannel } from '../context/ChannelContext';
import { useServer } from '../context/ServerContext';
import { supabase } from '../supabase/client';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ServerList from './ServerList';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import DMSidebar from './DMSidebar';
import './ChatLayout.css';

const ChatLayout = () => {
  const { messages, loading, error } = useChat();
  const { profile } = useAuth();
  const { currentChannel } = useChannel();
  const { currentServer, setCurrentServer } = useServer();
  const messagesEndRef = useRef(null);
  const [dmPartner, setDmPartner] = useState(null);

  // Check if current channel is a DM
  const isDM = currentChannel?.type === 'dm';

  // Fetch DM partner info when viewing a DM
  useEffect(() => {
    const fetchDMPartner = async () => {
      if (!isDM || !currentChannel || !profile) {
        setDmPartner(null);
        return;
      }

      // Get the DM conversation for this channel
      const { data: dmConv } = await supabase
        .from('dm_conversations')
        .select('user1_id, user2_id')
        .eq('channel_id', currentChannel.id)
        .maybeSingle();

      if (!dmConv) return;

      // Get the other user's profile
      const otherUserId = dmConv.user1_id === profile.id ? dmConv.user2_id : dmConv.user1_id;
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', otherUserId)
        .single();

      setDmPartner(otherProfile);
    };

    fetchDMPartner();
  }, [isDM, currentChannel, profile]);

  // Clear currentServer when switching to a DM channel
  useEffect(() => {
    if (isDM && currentServer) {
      setCurrentServer(null);
    }
  }, [isDM, currentServer, setCurrentServer]);

  // Scroll auto en bas quand nouveaux messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="chat-layout">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-layout">
        <div className="error-container">
          <h3>Erreur</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-layout">
      <ServerList />
      {!currentServer && !isDM ? (
        <Dashboard />
      ) : (
        <>
          {isDM ? <DMSidebar /> : <Sidebar />}
          <div className="chat-main">
            <div className="chat-header">
              <h2>
                {isDM ? (
                  <span className="dm-header">
                    {dmPartner?.avatar_url ? (
                      <img
                        src={dmPartner.avatar_url}
                        alt={dmPartner.display_name || dmPartner.username}
                        className="dm-header-avatar"
                      />
                    ) : (
                      <div
                        className="dm-header-avatar placeholder"
                        style={{
                          backgroundColor: getAvatarColor(dmPartner?.display_name || dmPartner?.username || 'User')
                        }}
                      >
                        {(dmPartner?.display_name || dmPartner?.username || 'U')?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span>{dmPartner?.display_name || dmPartner?.username || 'Unknown'}</span>
                  </span>
                ) : (
                  <span className="server-name">{currentServer?.name}</span>
                )}
                {currentChannel && <span> {isDM ? '' : '#'} {currentChannel.slug}</span>}
              </h2>
            </div>
            <div className="messages-container">
              <MessageList messages={messages} currentUserId={profile?.id} />
              <div ref={messagesEndRef} />
            </div>
            <div className="input-container">
              <MessageInput />
            </div>
          </div>
        </>
      )}
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

export default ChatLayout;
