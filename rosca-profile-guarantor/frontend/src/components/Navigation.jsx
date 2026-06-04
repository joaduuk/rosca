import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const ICONS = {
  contribution_paid: '💰',
  payout_processed: '🎉',
  member_joined: '👋',
  payment_due: '⏰',
};

function timeAgo(isoString) {
  const diff = (Date.now() - new Date(isoString)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function Navigation() {
  const { user, logout, isSuperAdmin } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications() || {};
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  return (
    <nav style={styles.nav}>
      {/* Logo */}
      <div style={styles.logo}>
        <span style={styles.logoText}>🔄 ROSCA</span>
      </div>

      {/* Nav links */}
      <div style={styles.links}>
        <Link to="/dashboard" style={styles.link}>Dashboard</Link>
        <Link to="/groups/create" style={styles.link}>Create Group</Link>
        <Link to="/reports" style={styles.link}>Reports</Link>
        {isSuperAdmin && (
          <>
            <Link to="/admin" style={styles.link}>Admin</Link>
            <Link to="/admin/users" style={styles.link}>Users</Link>
          </>
        )}
      </div>

      {/* Right side */}
      <div style={styles.right}>
        {/* User info — clickable to profile */}
        <Link to="/profile" style={{ ...styles.userInfo, textDecoration: 'none' }}>
          {user?.fullName || user?.email}
          <span style={{ ...styles.roleBadge, background: isSuperAdmin ? '#667eea' : '#48bb78' }}>
            {user?.role}
          </span>
        </Link>

        {/* 🔔 Bell */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button onClick={() => setOpen(o => !o)} style={styles.bellBtn} title="Notifications">
            🔔
            {unreadCount > 0 && (
              <span style={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>

          {open && (
            <div style={styles.dropdown}>
              {/* Header */}
              <div style={styles.dropdownHeader}>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>
                  Notifications {unreadCount > 0 && <span style={styles.unreadTag}>{unreadCount} new</span>}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} style={styles.actionBtn}>Mark all read</button>
                  )}
                  {notifications?.length > 0 && (
                    <button onClick={clearAll} style={{ ...styles.actionBtn, color: '#dc2626' }}>Clear</button>
                  )}
                </div>
              </div>

              {/* List */}
              <div style={styles.dropdownList}>
                {!notifications?.length ? (
                  <div style={styles.emptyNotif}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔔</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No notifications yet</div>
                  </div>
                ) : notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && markRead(n.id)}
                    style={{
                      ...styles.notifItem,
                      background: n.is_read ? 'white' : '#f0f4ff',
                      cursor: n.is_read ? 'default' : 'pointer',
                    }}
                  >
                    <div style={styles.notifIcon}>{ICONS[n.type] || '🔔'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.notifTitle}>{n.title}</div>
                      <div style={styles.notifMsg}>{n.message}</div>
                      <div style={styles.notifTime}>{timeAgo(n.created_at)}</div>
                    </div>
                    {!n.is_read && <div style={styles.unreadDot} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button onClick={logout} style={styles.logoutBtn}>Logout</button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    padding: '0.75rem 2rem', display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', position: 'sticky', top: 0, zIndex: 100,
  },
  logo: { display: 'flex', alignItems: 'center' },
  logoText: { fontWeight: '700', fontSize: '1.1rem', color: '#667eea' },
  links: { display: 'flex', alignItems: 'center', gap: '0.25rem' },
  link: { color: '#4a5568', textDecoration: 'none', fontWeight: '500', fontSize: '0.95rem', padding: '0.25rem 0.6rem', borderRadius: '4px' },
  right: { display: 'flex', alignItems: 'center', gap: '1rem' },
  userInfo: { fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' },
  roleBadge: { color: 'white', borderRadius: '9999px', fontSize: '0.65rem', padding: '0.1rem 0.45rem', textTransform: 'uppercase', fontWeight: '600' },
  bellBtn: {
    position: 'relative', background: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: 'pointer', fontSize: '1.1rem',
    display: 'flex', alignItems: 'center',
  },
  badge: {
    position: 'absolute', top: '-6px', right: '-6px',
    background: '#ef4444', color: 'white', borderRadius: '9999px',
    fontSize: '0.6rem', fontWeight: '700', minWidth: '18px', height: '18px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
  },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
    width: '360px', background: 'white', borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0',
    zIndex: 999, overflow: 'hidden',
  },
  dropdownHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0.875rem 1rem', borderBottom: '1px solid #f1f5f9',
  },
  unreadTag: { background: '#667eea', color: 'white', borderRadius: '9999px', fontSize: '0.65rem', padding: '0.1rem 0.4rem', marginLeft: '0.4rem', fontWeight: '600' },
  actionBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#667eea', fontSize: '0.75rem', fontWeight: '600', padding: '0.1rem 0.3rem' },
  dropdownList: { maxHeight: '380px', overflowY: 'auto' },
  emptyNotif: { padding: '2.5rem', textAlign: 'center' },
  notifItem: {
    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
    padding: '0.875rem 1rem', borderBottom: '1px solid #f8fafc', transition: 'background 0.1s',
  },
  notifIcon: { fontSize: '1.25rem', flexShrink: 0, marginTop: '2px' },
  notifTitle: { fontWeight: '600', fontSize: '0.825rem', color: '#0f172a', marginBottom: '2px' },
  notifMsg: { fontSize: '0.775rem', color: '#64748b', lineHeight: '1.4' },
  notifTime: { fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' },
  unreadDot: { width: '8px', height: '8px', background: '#667eea', borderRadius: '50%', flexShrink: 0, marginTop: '6px' },
  logoutBtn: { padding: '0.4rem 1rem', background: '#f56565', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' },
};
