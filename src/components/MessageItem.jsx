import { useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import UserContextMenu from './UserContextMenu';
import './MessageItem.css';

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

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Aujourd'hui: afficher l'heure
    return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays < 7) {
    return formatDistanceToNow(date, { addSuffix: true, locale: fr });
  } else {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

const MessageItem = ({ group, isFirstMessage, isOwnGroup }) => {
  const { userId, username, avatarUrl, timestamp, messages } = group;
  const [contextMenu, setContextMenu] = useState(null);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    setContextMenu({
      userId,
      username,
      displayName: username, // Using username since display_name is the same in this context
      avatarUrl,
      x: e.clientX,
      y: e.clientY
    });
  }, [userId, username, avatarUrl]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  return (
    <div className={`message-item ${isOwnGroup ? 'own-message' : ''}`}>
      <div className="message-avatar" onContextMenu={handleContextMenu}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={username} className="avatar-image" />
        ) : (
          <div
            className="avatar-placeholder"
            style={{ backgroundColor: getAvatarColor(username) }}
          >
            {getInitials(username)}
          </div>
        )}
      </div>
      <div className="message-content-wrapper">
        <div className="message-header">
          <span className="message-username">{username}</span>
          <span className="message-timestamp">{formatTimestamp(timestamp)}</span>
        </div>
        {messages.map((msg, idx) => (
          <div key={msg.id} className="message-text">
            {msg.content}
          </div>
        ))}
      </div>
      {contextMenu && (
        <UserContextMenu
          userId={contextMenu.userId}
          username={contextMenu.username}
          displayName={contextMenu.displayName}
          avatarUrl={contextMenu.avatarUrl}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
};

export default MessageItem;
