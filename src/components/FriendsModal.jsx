import { useState } from 'react';
import { useFriends } from '../context/FriendsContext';
import './FriendsModal.css';

const FriendsModal = ({ onClose }) => {
  const { friends, pendingRequests, addFriend, acceptRequest, declineRequest, removeFriend } = useFriends();
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' or 'requests'
  const [addUsername, setAddUsername] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [removingFriendId, setRemovingFriendId] = useState(null);

  const handleAddFriend = async (e) => {
    e.preventDefault();
    if (!addUsername.trim()) return;

    setAdding(true);
    setError(null);
    setSuccess(null);

    const { error } = await addFriend(addUsername.trim());

    setAdding(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Friend request sent!');
      setAddUsername('');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleAccept = async (requestId) => {
    const { error } = await acceptRequest(requestId);
    if (error) setError(error.message);
  };

  const handleDecline = async (requestId) => {
    const { error } = await declineRequest(requestId);
    if (error) setError(error.message);
  };

  const handleRemove = async (friendId) => {
    const { error } = await removeFriend(friendId);
    if (error) {
      setError(error.message);
    } else {
      setRemovingFriendId(null);
    }
  };

  const startRemoveFriend = (friendId) => {
    setRemovingFriendId(friendId);
    setError(null);
  };

  const cancelRemove = () => {
    setRemovingFriendId(null);
  };

  const getAvatarColor = (username) => {
    const colors = ['#5bb3e8', '#3da5d9', '#4db6ac', '#7cb342', '#42a5f5', '#26a69a', '#5c6bc0', '#7e57c2'];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (name) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal friends-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Friends</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="friends-tabs">
          <button
            className={`tab ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            All Friends <span className="count">{friends.length}</span>
          </button>
          <button
            className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Pending <span className="count">{pendingRequests.length}</span>
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'friends' && (
            <div className="friends-content">
              {/* Add friend form */}
              <form onSubmit={handleAddFriend} className="add-friend-form">
                <input
                  type="text"
                  value={addUsername}
                  onChange={e => setAddUsername(e.target.value)}
                  placeholder="Add friend by username"
                  maxLength={32}
                />
                <button type="submit" disabled={adding || !addUsername.trim()}>
                  {adding ? 'Sending...' : 'Add Friend'}
                </button>
              </form>

              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              {/* Friends list */}
              <div className="friends-list">
                {friends.length === 0 ? (
                  <div className="empty-state">
                    <p>No friends yet. Add someone using their username!</p>
                  </div>
                ) : (
                  friends.map(friend => (
                    <div key={friend.id} className="friend-item">
                      <div className="friend-avatar">
                        {friend.avatar_url ? (
                          <img src={friend.avatar_url} alt="" />
                        ) : (
                          <div
                            className="avatar-placeholder"
                            style={{ backgroundColor: getAvatarColor(friend.username) }}
                          >
                            {getInitials(friend.display_name || friend.username)}
                          </div>
                        )}
                      </div>
                      {removingFriendId === friend.friend_id ? (
                        <div className="friend-remove-confirm">
                          <span>Remove {friend.display_name || friend.username}?</span>
                          <div className="remove-actions">
                            <button className="cancel-remove-btn" onClick={cancelRemove}>Cancel</button>
                            <button className="confirm-remove-btn" onClick={() => handleRemove(friend.friend_id)}>Remove</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="friend-info">
                            <span className="friend-name">
                              {friend.display_name || friend.username}
                            </span>
                            <span className="friend-username">@{friend.username}</span>
                          </div>
                          <button
                            className="remove-btn"
                            onClick={() => startRemoveFriend(friend.friend_id)}
                            title="Remove friend"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="requests-content">
              {pendingRequests.length === 0 ? (
                <div className="empty-state">
                  <p>No pending friend requests.</p>
                </div>
              ) : (
                <div className="requests-list">
                  {pendingRequests.map(request => (
                    <div key={request.request_id} className="request-item">
                      <div className="request-avatar">
                        {request.avatar_url ? (
                          <img src={request.avatar_url} alt="" />
                        ) : (
                          <div
                            className="avatar-placeholder"
                            style={{ backgroundColor: getAvatarColor(request.username) }}
                          >
                            {getInitials(request.display_name || request.username)}
                          </div>
                        )}
                      </div>
                      <div className="request-info">
                        <span className="request-name">
                          {request.display_name || request.username}
                        </span>
                        <span className="request-username">@{request.username}</span>
                      </div>
                      <div className="request-actions">
                        <button
                          className="accept-btn"
                          onClick={() => handleAccept(request.request_id)}
                          title="Accept"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </button>
                        <button
                          className="decline-btn"
                          onClick={() => handleDecline(request.request_id)}
                          title="Decline"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsModal;
