import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AvatarUploader from './AvatarUploader';
import BannerUploader from './BannerUploader';
import './ProfileSettingsModal.css';

const STATUSES = [
  { value: 'online', label: 'Online', color: '#23a559' },
  { value: 'idle', label: 'Idle', color: '#f0b232' },
  { value: 'dnd', label: 'Do Not Disturb', color: '#f23f43' },
  { value: 'invisible', label: 'Invisible', color: '#80848e' }
];

const ProfileSettingsModal = ({ onClose }) => {
  const { profile, updateProfile, updateAvatar, updateBanner } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState('online');
  const [activity, setActivity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setStatus(profile.status || 'online');
      setActivity(profile.activity || '');
    }
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const { error } = await updateProfile({
      username: username.trim(),
      display_name: displayName.trim(),
      bio: bio.trim(),
      status,
      activity: activity.trim()
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const handleAvatarUpload = async (file) => {
    if (!file) return updateProfile({ avatar_url: null });
    return updateAvatar(file);
  };

  const handleBannerUpload = async (file) => {
    if (!file) return updateProfile({ banner_url: null });
    return updateBanner(file);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal profile-settings" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Profile Settings</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <BannerUploader
            currentBanner={profile?.banner_url}
            onUpload={handleBannerUpload}
          />

          <div className="profile-content">
            <AvatarUploader
              currentAvatar={profile?.avatar_url}
              onUpload={handleAvatarUpload}
              size={80}
            />

            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Unique username (e.g., user123)"
                  maxLength={32}
                  required
                />
                <span className="char-count">{username.length}/32</span>
                <span className="input-hint">Your unique identifier for adding friends</span>
              </div>

              <div className="form-group">
                <label htmlFor="displayName">Display Name</label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Display name (e.g., Alex)"
                  maxLength={32}
                  required
                />
                <span className="char-count">{displayName.length}/32</span>
                <span className="input-hint">What others will see (can be changed anytime)</span>
              </div>

              <div className="form-group">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell us about yourself"
                  maxLength={190}
                  rows={3}
                />
                <span className="char-count">{bio.length}/190</span>
              </div>

              <div className="form-group">
                <label>Status</label>
                <div className="status-selector">
                  {STATUSES.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      className={`status-option ${status === s.value ? 'active' : ''}`}
                      onClick={() => setStatus(s.value)}
                      title={s.label}
                    >
                      <span className="status-indicator" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="activity">Activity</label>
                <input
                  id="activity"
                  type="text"
                  value={activity}
                  onChange={e => setActivity(e.target.value)}
                  placeholder="e.g., Playing Minecraft"
                  maxLength={100}
                />
                <span className="char-count">{activity.length}/100</span>
              </div>

              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">Profile updated!</div>}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsModal;
