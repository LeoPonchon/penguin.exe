import { useMemo } from 'react';
import MessageItem from './MessageItem';
import './MessageList.css';

/**
 * Groupe les messages consécutifs du même utilisateur
 * Style Discord: pas de répétition d'avatar/nom pour les messages consécutifs
 */
const groupMessages = (messages) => {
  const groups = [];
  let currentGroup = null;

  messages.forEach((message, index) => {
    const prevMessage = messages[index - 1];
    const prevTime = prevMessage ? new Date(prevMessage.created_at).getTime() : 0;
    const currentTime = new Date(message.created_at).getTime();
    const FIVE_MINUTES = 5 * 60 * 1000;

    const isSameUser = prevMessage && prevMessage.user_id === message.user_id;
    const isRecent = (currentTime - prevTime) < FIVE_MINUTES;

    if (isSameUser && isRecent && currentGroup) {
      // Ajouter au groupe existant
      currentGroup.messages.push(message);
    } else {
      // Nouveau groupe
      if (currentGroup) {
        groups.push(currentGroup);
      }
      currentGroup = {
        userId: message.user_id,
        username: message.profiles?.display_name || message.profiles?.username || 'Unknown',
        avatarUrl: message.profiles?.avatar_url,
        timestamp: message.created_at,
        messages: [message]
      };
    }
  });

  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
};

const MessageList = ({ messages, currentUserId }) => {
  const groupedMessages = useMemo(() => groupMessages(messages), [messages]);

  return (
    <div className="message-list">
      {groupedMessages.length === 0 ? (
        <div className="empty-state">
          <p>No messages yet. Say hello! 👋</p>
        </div>
      ) : (
        groupedMessages.map((group, groupIndex) => (
          <div key={`group-${groupIndex}`} className="message-group">
            <MessageItem
              group={group}
              isFirstMessage={groupIndex === 0}
              isOwnGroup={group.userId === currentUserId}
            />
          </div>
        ))
      )}
    </div>
  );
};

export default MessageList;
