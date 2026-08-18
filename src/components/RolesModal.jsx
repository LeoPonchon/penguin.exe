import { useState, useEffect } from 'react';
import { useServer } from '../context/ServerContext';
import { useAuth } from '../context/AuthContext';
import './RolesModal.css';

// Permission flags
const PERMISSIONS = {
  MANAGE_SERVER: 1 << 0,      // Manage server settings
  MANAGE_ROLES: 1 << 1,       // Manage roles
  MANAGE_CHANNELS: 1 << 2,    // Create/edit/delete channels
  KICK_MEMBERS: 1 << 3,       // Kick members
  BAN_MEMBERS: 1 << 4,        // Ban members
  MENTION_EVERYONE: 1 << 5,   // @everyone
  SEND_MESSAGES: 1 << 6,      // Send messages
  READ_MESSAGES: 1 << 7,      // Read messages
};

const PERMISSION_LABELS = {
  MANAGE_SERVER: 'Manage Server',
  MANAGE_ROLES: 'Manage Roles',
  MANAGE_CHANNELS: 'Manage Channels',
  KICK_MEMBERS: 'Kick Members',
  BAN_MEMBERS: 'Ban Members',
  MENTION_EVERYONE: 'Mention @everyone',
  SEND_MESSAGES: 'Send Messages',
  READ_MESSAGES: 'Read Messages',
};

const ROLE_COLORS = [
  '#5865f2', '#57f287', '#fee75c', '#eb459e',
  '#ed4245', '#9b59b6', '#3498db', '#1abc9c',
  '#f39c12', '#e74c3c', '#8e44ad', '#2ecc71',
  '#95a5a6', '#34495e', '#16a085', '#27ae60',
];

const RolesModal = ({ onClose, server }) => {
  const { roles, createRole, updateRole, deleteRole, fetchMembers } = useServer();
  const { profile } = useAuth();
  const [editingRole, setEditingRole] = useState(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState(ROLE_COLORS[0]);
  const [selectedPermissions, setSelectedPermissions] = useState(0);
  const [members, setMembers] = useState([]);
  const [showMembers, setShowMembers] = useState(false);

  const isOwner = server?.owner_id === profile?.id;

  useEffect(() => {
    if (showMembers) {
      loadMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMembers]);

  const loadMembers = async () => {
    const { data } = await fetchMembers(server.id);
    if (data) {
      setMembers(data);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;

    const { error } = await createRole(server.id, newRoleName, newRoleColor, selectedPermissions);
    if (!error) {
      setNewRoleName('');
      setNewRoleColor(ROLE_COLORS[0]);
      setSelectedPermissions(0);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;

    const { error } = await updateRole(editingRole.id, {
      name: editingRole.name,
      color: editingRole.color,
      permissions: editingRole.permissions,
    });
    if (!error) {
      setEditingRole(null);
    }
  };

  const handleDeleteRole = async (roleId) => {
    const { error } = await deleteRole(roleId);
    if (!error) {
      setEditingRole(null);
    }
  };

  const togglePermission = (perm) => {
    setSelectedPermissions(prev => prev ^ perm);
  };

  const toggleEditPermission = (perm) => {
    if (!editingRole) return;
    setEditingRole(prev => ({
      ...prev,
      permissions: prev.permissions ^ perm
    }));
  };

  const hasPermission = (perms, perm) => (perms & perm) === perm;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal roles-modal" onClick={e => e.stopPropagation()}>
        <div className="roles-modal-header">
          <h2>Roles - {server?.name}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="roles-content">
          {/* Create new role */}
          {isOwner && (
            <div className="role-create">
              <h3>Create Role</h3>
              <div className="role-form">
                <input
                  type="text"
                  placeholder="Role name"
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                />
                <div className="color-picker">
                  {ROLE_COLORS.map(color => (
                    <button
                      key={color}
                      className={`color-btn ${newRoleColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewRoleColor(color)}
                    />
                  ))}
                </div>
                <div className="permissions-list">
                  {Object.entries(PERMISSIONS).map(([key, value]) => (
                    <label key={key} className="permission-item">
                      <input
                        type="checkbox"
                        checked={hasPermission(selectedPermissions, value)}
                        onChange={() => togglePermission(value)}
                      />
                      <span>{PERMISSION_LABELS[key]}</span>
                    </label>
                  ))}
                </div>
                <button className="btn-primary" onClick={handleCreateRole}>
                  Create Role
                </button>
              </div>
            </div>
          )}

          {/* Roles list */}
          <div className="roles-list">
            <h3>Roles</h3>
            {roles.length === 0 ? (
              <p className="no-roles">No roles yet</p>
            ) : (
              roles.map(role => (
                <div key={role.id} className="role-item">
                  <div className="role-info">
                    <div
                      className="role-dot"
                      style={{ backgroundColor: role.color || '#99aab5' }}
                    />
                    <span className="role-name">{role.name}</span>
                  </div>
                  <div className="role-actions">
                    <button onClick={() => setEditingRole(role)} className="btn-secondary">
                      Edit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Members list */}
          <div className="members-section">
            <button
              className="btn-secondary"
              onClick={() => {
                setShowMembers(!showMembers);
                if (!showMembers) loadMembers();
              }}
            >
              {showMembers ? 'Hide' : 'Show'} Members
            </button>

            {showMembers && (
              <div className="members-list">
                {members.map(member => (
                  <div key={member.user_id} className="member-item">
                    <div className="member-avatar">
                      {member.profiles?.avatar_url ? (
                        <img src={member.profiles.avatar_url} alt="" />
                      ) : (
                        <div className="avatar-placeholder">
                          {(member.profiles?.display_name || member.profiles?.username)?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <span className="member-name">
                      {member.nickname || member.profiles?.display_name || member.profiles?.username || 'Unknown'}
                    </span>
                    <span className="member-role">{member.role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit role modal */}
        {editingRole && (
          <div className="edit-role-overlay">
            <div className="edit-role-modal">
              <h3>Edit Role</h3>
              <div className="role-form">
                <input
                  type="text"
                  value={editingRole.name}
                  onChange={e => setEditingRole(prev => ({ ...prev, name: e.target.value }))}
                />
                <div className="color-picker">
                  {ROLE_COLORS.map(color => (
                    <button
                      key={color}
                      className={`color-btn ${editingRole.color === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditingRole(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
                <div className="permissions-list">
                  {Object.entries(PERMISSIONS).map(([key, value]) => (
                    <label key={key} className="permission-item">
                      <input
                        type="checkbox"
                        checked={hasPermission(editingRole.permissions, value)}
                        onChange={() => toggleEditPermission(value)}
                      />
                      <span>{PERMISSION_LABELS[key]}</span>
                    </label>
                  ))}
                </div>
                <div className="edit-role-actions">
                  <button onClick={() => setEditingRole(null)} className="btn-secondary">
                    Cancel
                  </button>
                  <button onClick={handleUpdateRole} className="btn-primary">
                    Save
                  </button>
                  <button
                    onClick={() => handleDeleteRole(editingRole.id)}
                    className="btn-primary danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RolesModal;
