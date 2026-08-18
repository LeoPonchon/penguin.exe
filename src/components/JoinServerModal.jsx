import { useState } from 'react';
import { useServer } from '../context/ServerContext';
import './CreateServerModal.css';

const JoinServerModal = ({ onClose }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const { joinServer } = useServer();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLoading(true);
    setError(null);

    const { error } = await joinServer(inviteCode.trim());

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    }
  };

  if (success) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal create-server" onClick={e => e.stopPropagation()}>
          <div className="success-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#23a559" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <h2>Joined!</h2>
            <p>You've successfully joined the server.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal create-server" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h2>Join a Server</h2>
        <p>Enter an invite code below to join an existing server.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="inviteCode">Invite Code</label>
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              placeholder="Enter invite code"
              required
              autoFocus
              style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading || !inviteCode.trim()}>
              {loading ? 'Joining...' : 'Join Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinServerModal;
