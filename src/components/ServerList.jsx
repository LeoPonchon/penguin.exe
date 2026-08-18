import { useState, useEffect } from 'react';
import { useServer } from '../context/ServerContext';
import { useAuth } from '../context/AuthContext';
import CreateServerModal from './CreateServerModal';
import JoinServerModal from './JoinServerModal';
import RolesModal from './RolesModal';
import './ServerList.css';

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

const ServerList = () => {
  const { servers, currentServer, setCurrentServer, createInvite, leaveServer, deleteServer, fetchInvites } = useServer();
  const { profile } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showServerMenu, setShowServerMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitesServerId, setInvitesServerId] = useState(null);
  const [invites, setInvites] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [rolesServer, setRolesServer] = useState(null);

  const isOwner = (server) => server?.owner_id === profile?.id;

  // Close server menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.server-menu')) {
        setShowServerMenu(null);
      }
    };
    if (showServerMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showServerMenu]);

  const handleServerClick = (server) => {
    setCurrentServer(server);
    setShowServerMenu(null);
  };

  const handleServerContextMenu = (e, server) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.top,
      left: rect.right + 4
    });
    setShowServerMenu(server.id);
  };

  const handleCreateInvite = async (serverId) => {
    setInvitesServerId(serverId);
    const { data, error } = await fetchInvites(serverId);
    if (!error) {
      setInvites(data || []);
      setShowInviteModal(true);
    }
  };

  const handleLeaveServer = (serverId) => {
    setConfirmDialog({
      title: 'Leave Server',
      message: 'Are you sure you want to leave this server?',
      onConfirm: async () => {
        await leaveServer(serverId);
        setShowServerMenu(null);
        setConfirmDialog(null);
      },
      onCancel: () => {
        setConfirmDialog(null);
      }
    });
    setShowServerMenu(null);
  };

  const handleDeleteServer = (serverId) => {
    setConfirmDialog({
      title: 'Delete Server',
      message: 'Are you sure you want to delete this server? This cannot be undone.',
      onConfirm: async () => {
        await deleteServer(serverId);
        setShowServerMenu(null);
        setConfirmDialog(null);
      },
      onCancel: () => {
        setConfirmDialog(null);
      }
    });
    setShowServerMenu(null);
  };

  return (
    <>
      <div className="server-list">
        {/* Home/DMs button */}
        <div
          className={`server-icon ${!currentServer ? 'active' : ''}`}
          onClick={() => setCurrentServer(null)}
          title="Home"
        >
          <svg width="28" height="20" viewBox="0 0 28 20" fill="currentColor">
            <path d="M23.0212 1.67671C21.3107 0.879656 19.5079 0.318797 17.6584 0H17.5719C17.4571 0 17.3429 0 17.2286 0.00414897C17.1143 0.00829794 16.9429 0.0165958 16.8143 0.0472143C16.6857 0.0778328 16.5571 0.13087 16.4286 0.201571C16.3 0.272272 16.1857 0.360636 16.0714 0.466663C15.9571 0.572689 15.8429 0.69638 15.7429 0.837333L15.7 0.894522L15.6571 0.837333C15.5571 0.69638 15.4429 0.572689 15.3286 0.466663C15.2143 0.360636 15.1 0.272272 14.9714 0.201571C14.8429 0.13087 14.7143 0.0778328 14.5857 0.0472143C14.4571 0.0165958 14.2857 0.00829794 14.1714 0.00414897C14.0571 0 13.9429 0 13.8286 0H13.7421C11.8926 0.318797 10.0898 0.879656 8.37931 1.67671C5.86034 2.85373 3.76922 4.85657 2.42857 7.36452C1.08792 9.87246 0.577832 12.7485 0.971423 15.5657L1 15.7571L1.02857 15.9486C1.57143 19.0857 4.22857 21.4857 7.4 21.4857H23.9857C27.1571 21.4857 29.8143 19.0857 30.3571 15.9486L30.3857 15.7571L30.4143 15.5657C30.8079 12.7485 30.2978 9.87246 28.9571 7.36452C27.6165 4.85657 25.5254 2.85373 23.0064 1.67671H23.0212ZM23.4143 15.2C23.0857 17.1571 21.4286 18.4857 19.4429 18.4857H11.9429C9.95714 18.4857 8.3 17.1571 7.97143 15.2C7.68571 13.5286 8.04286 11.8 8.98571 10.3714C9.92857 8.94286 11.3571 7.9 13 7.52857V11.4857H18.3857V7.52857C20.0286 7.9 21.4571 8.94286 22.4 10.3714C23.3429 11.8 23.7 13.5286 23.4143 15.2Z" />
          </svg>
        </div>

        <div className="server-separator" />

        {/* Server icons */}
        {servers.map((server) => (
          <div
            key={server.id}
            className={`server-icon ${currentServer?.id === server.id ? 'active' : ''}`}
            onClick={() => handleServerClick(server)}
            onContextMenu={(e) => handleServerContextMenu(e, server)}
            style={
              server.icon_url
                ? { backgroundImage: `url(${server.icon_url})` }
                : { backgroundColor: getServerColor(server.name) }
            }
            title={server.name}
          >
            {!server.icon_url && server.name.charAt(0).toUpperCase()}
          </div>
        ))}

        {/* Add server button */}
        <div
          className="server-icon add-server"
          onClick={() => setShowCreateModal(true)}
          title="Add a Server"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Join server button */}
        <div
          className="server-icon join-server"
          onClick={() => setShowJoinModal(true)}
          title="Join a Server"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 3 11.11 3.59 12.59 4.57 13.73L4.29 14H3.5C2.12 14 1 15.12 1 16.5V19c0 1.38 1.12 2.5 2.5 2.5h11c1.38 0 2.5-1.12 2.5-2.5v-2.5c0-1.38-1.12-2.5-2.5-2.5zM9.5 7c1.38 0 2.5 1.12 2.5 2.5S10.88 12 9.5 12 7 10.88 7 9.5 7 9.5 7 7 8.62 7 9.5 7zm3 4H8v-1h4.5v1zm1-2H8V8h5.5v1z" />
          </svg>
        </div>
      </div>

      {/* Server menu (rendered at root level with fixed position) */}
      {showServerMenu && (
        <div
          className="server-menu fixed"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`
          }}
        >
          <button onClick={() => handleCreateInvite(showServerMenu)}>
            Invite People
          </button>
          {isOwner(servers.find(s => s.id === showServerMenu)) && (
            <button onClick={() => {
              setRolesServer(servers.find(s => s.id === showServerMenu));
              setShowRolesModal(true);
              setShowServerMenu(null);
            }}>
              Roles
            </button>
          )}
          {isOwner(servers.find(s => s.id === showServerMenu)) && (
            <button onClick={() => handleDeleteServer(showServerMenu)} className="danger">
              Delete Server
            </button>
          )}
          {!isOwner(servers.find(s => s.id === showServerMenu)) && (
            <button onClick={() => handleLeaveServer(showServerMenu)} className="danger">
              Leave Server
            </button>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateServerModal onClose={() => setShowCreateModal(false)} />
      )}

      {showJoinModal && (
        <JoinServerModal onClose={() => setShowJoinModal(false)} />
      )}

      {showInviteModal && (
        <div className="modal-overlay" onClick={() => {
          setShowInviteModal(false);
          setCopiedCode(null);
        }}>
          <div className="modal invites-modal" onClick={e => e.stopPropagation()}>
            <h3>Server Invites</h3>
            <p className="invite-hint">Click any code to copy it</p>
            <button className="modal-close" onClick={() => {
              setShowInviteModal(false);
              setCopiedCode(null);
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="invites-list">
              {invites.length === 0 ? (
                <p className="no-invites">No invites yet. Create one below!</p>
              ) : (
                invites.map((invite) => (
                  <div key={invite.id} className="invite-item">
                    <div
                      className={`invite-item-code ${copiedCode === invite.code ? 'copied' : ''}`}
                      onClick={() => {
                        navigator.clipboard.writeText(invite.code);
                        setCopiedCode(invite.code);
                        setTimeout(() => setCopiedCode(null), 2000);
                      }}
                    >
                      {copiedCode === invite.code ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        invite.code
                      )}
                    </div>
                    <div className="invite-item-info">
                      <span className="invite-uses">{invite.uses} uses</span>
                      {invite.max_uses && <span> / {invite.max_uses}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="invites-actions">
              <button className="btn-secondary" onClick={() => {
                setShowInviteModal(false);
                setCopiedCode(null);
              }}>
                Close
              </button>
              <button className="btn-primary" onClick={async () => {
                const { data } = await createInvite(invitesServerId);
                if (data) {
                  setInvites(prev => [data, ...prev]);
                }
              }}>
                Create New Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="modal-overlay" onClick={confirmDialog.onCancel}>
          <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
            <h3>{confirmDialog.title}</h3>
            <p>{confirmDialog.message}</p>
            <div className="confirm-actions">
              <button className="btn-secondary" onClick={confirmDialog.onCancel}>
                Cancel
              </button>
              <button className="btn-primary danger" onClick={confirmDialog.onConfirm}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showRolesModal && rolesServer && (
        <RolesModal
          onClose={() => {
            setShowRolesModal(false);
            setRolesServer(null);
          }}
          server={rolesServer}
        />
      )}
    </>
  );
};

export default ServerList;
