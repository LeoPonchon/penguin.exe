import { useState } from 'react';
import { useServer } from '../context/ServerContext';
import './CreateServerModal.css';

const CreateServerModal = ({ onClose }) => {
  const [serverName, setServerName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { createServer } = useServer();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!serverName.trim()) return;

    setLoading(true);
    setError(null);

    const { error } = await createServer(serverName.trim(), description.trim());

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal create-server" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h2>Create a server</h2>
        <p>Your server is where you and your friends hang out.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="serverName">Server name</label>
            <input
              id="serverName"
              type="text"
              value={serverName}
              onChange={e => setServerName(e.target.value)}
              placeholder="My Awesome Server"
              maxLength={100}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's this server about?"
              maxLength={500}
              rows={3}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading || !serverName.trim()}>
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateServerModal;
