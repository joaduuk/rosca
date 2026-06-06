import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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

// ── Public nav (logged out) ───────────────────────────
function PublicNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'About', to: '/#about' },
    { label: 'FAQ', to: '/#faq' },
    { label: 'Terms', to: '/#terms' },
    { label: 'Privacy', to: '/#privacy' },
  ];

  return (
    <nav style={pubStyles.nav}>
      <div style={pubStyles.inner}>
        {/* Logo */}
        <Link to="/" style={pubStyles.logo}>
          Rosca<span style={{ color: '#f0a500' }}>App</span>
        </Link>

        {/* Desktop links */}
        <ul style={{ ...pubStyles.links, ...(menuOpen ? pubStyles.linksOpen : {}) }} id="navLinks">
          {navLinks.map(({ label, to }) => (
            <li key={label}>
              <a
                href={to}
                style={pubStyles.link}
                onMouseEnter={e => { e.target.style.background = '#e8f5ef'; e.target.style.color = '#1a6b4a'; }}
                onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#5a5a5a'; }}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA buttons */}
        <div style={pubStyles.cta}>
          <Link to="/login" style={pubStyles.btnOutline}
            onMouseEnter={e => e.target.style.background = '#e8f5ef'}
            onMouseLeave={e => e.target.style.background = 'transparent'}
          >Log in</Link>
          <Link to="/login" style={pubStyles.btnPrimary}
            onMouseEnter={e => e.target.style.background = '#124d35'}
            onMouseLeave={e => e.target.style.background = '#1a6b4a'}
          >Get Started Free</Link>
        </div>

        {/* Hamburger */}
        <button
          style={pubStyles.hamburger}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Menu"
        >
          <span style={pubStyles.bar}></span>
          <span style={pubStyles.bar}></span>
          <span style={pubStyles.bar}></span>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={pubStyles.mobileMenu}>
          {navLinks.map(({ label, to }) => (
            <a key={label} href={to} style={pubStyles.mobileLink} onClick={() => setMenuOpen(false)}>{label}</a>
          ))}
          <Link to="/login" style={{ ...pubStyles.btnPrimary, display: 'block', textAlign: 'center', marginTop: '0.75rem' }} onClick={() => setMenuOpen(false)}>
            Get Started Free
          </Link>
        </div>
      )}
    </nav>
  );
}

// ── Auth nav (logged in) ──────────────────────────────
function AuthNav() {
  const { user, logout, isSuperAdmin } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications() || {};
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <nav style={authStyles.nav}>
      {/* Logo */}
      <div style={authStyles.logo}>
        <Link to="/dashboard" style={authStyles.logoText}>
          Rosca<span style={{ color: '#f0a500' }}>App</span>
        </Link>
      </div>

      {/* Nav links */}
      <div style={{ ...authStyles.links, ...(mobileOpen ? authStyles.linksOpen : {}) }}>
        <Link to="/dashboard" style={authStyles.link}>Dashboard</Link>
        <Link to="/groups/create" style={authStyles.link}>Create Group</Link>
        <Link to="/reports" style={authStyles.link}>Reports</Link>
        {isSuperAdmin && (
          <>
            <Link to="/admin" style={authStyles.link}>Admin</Link>
            <Link to="/admin/users" style={authStyles.link}>Users</Link>
          </>
        )}
      </div>

      {/* Right side */}
      <div style={authStyles.right}>
        <Link to="/profile" style={{ ...authStyles.userInfo, textDecoration: 'none' }}>
          {user?.fullName || user?.email}
          <span style={{ ...authStyles.roleBadge, background: isSuperAdmin ? '#1a6b4a' : '#f0a500' }}>
            {user?.role}
          </span>
        </Link>

        {/* Bell */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button onClick={() => setOpen(o => !o)} style={authStyles.bellBtn} title="Notifications">
            🔔
            {unreadCount > 0 && (
              <span style={authStyles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>

          {open && (
            <div style={authStyles.dropdown}>
              <div style={authStyles.dropdownHeader}>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>
                  Notifications {unreadCount > 0 && <span style={authStyles.unreadTag}>{unreadCount} new</span>}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} style={authStyles.actionBtn}>Mark all read</button>
                  )}
                  {notifications?.length > 0 && (
                    <button onClick={clearAll} style={{ ...authStyles.actionBtn, color: '#dc2626' }}>Clear</button>
                  )}
                </div>
              </div>
              <div style={authStyles.dropdownList}>
                {!notifications?.length ? (
                  <div style={authStyles.emptyNotif}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔔</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No notifications yet</div>
                  </div>
                ) : notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && markRead(n.id)}
                    style={{
                      ...authStyles.notifItem,
                      background: n.is_read ? 'white' : '#f0f9f4',
                      cursor: n.is_read ? 'default' : 'pointer',
                    }}
                  >
                    <div style={authStyles.notifIcon}>{ICONS[n.type] || '🔔'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={authStyles.notifTitle}>{n.title}</div>
                      <div style={authStyles.notifMsg}>{n.message}</div>
                      <div style={authStyles.notifTime}>{timeAgo(n.created_at)}</div>
                    </div>
                    {!n.is_read && <div style={authStyles.unreadDot} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button onClick={logout} style={authStyles.logoutBtn}>Logout</button>

        {/* Mobile hamburger */}
        <button style={authStyles.hamburger} onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
          <span style={authStyles.bar}></span>
          <span style={authStyles.bar}></span>
          <span style={authStyles.bar}></span>
        </button>
      </div>
    </nav>
  );
}

// ── Main export ───────────────────────────────────────
export function Navigation() {
  const { user } = useAuth();
  return user ? <AuthNav /> : <PublicNav />;
}

// ── Public nav styles ─────────────────────────────────
const pubStyles = {
  nav: {
    background: 'white',
    borderBottom: '1px solid #e0e0e0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
  },
  inner: {
    maxWidth: '1140px',
    margin: '0 auto',
    padding: '0 1.5rem',
    display: 'flex',
    alignItems: 'center',
    height: '64px',
    gap: '2rem',
    position: 'relative',
  },
  logo: {
    fontFamily: 'DM Serif Display, Georgia, serif',
    fontSize: '1.5rem',
    color: '#1a6b4a',
    textDecoration: 'none',
    flexShrink: 0,
    fontWeight: '400',
  },
  links: {
    display: 'flex',
    gap: '0.25rem',
    listStyle: 'none',
    flex: 1,
    margin: 0,
    padding: 0,
  },
  linksOpen: {},
  link: {
    padding: '0.4rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#5a5a5a',
    textDecoration: 'none',
    background: 'transparent',
    transition: 'background 0.15s, color 0.15s',
    display: 'block',
  },
  cta: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    flexShrink: 0,
  },
  btnOutline: {
    border: '1.5px solid #1a6b4a',
    color: '#1a6b4a',
    padding: '0.45rem 1.1rem',
    borderRadius: '6px',
    fontSize: '0.88rem',
    fontWeight: '500',
    background: 'transparent',
    textDecoration: 'none',
    transition: 'background 0.15s',
    display: 'inline-block',
  },
  btnPrimary: {
    background: '#1a6b4a',
    color: 'white',
    padding: '0.5rem 1.2rem',
    borderRadius: '6px',
    fontSize: '0.88rem',
    fontWeight: '500',
    textDecoration: 'none',
    display: 'inline-block',
    transition: 'background 0.15s',
  },
  hamburger: {
    display: 'none',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.5rem',
    marginLeft: 'auto',
  },
  bar: {
    display: 'block',
    width: '22px',
    height: '2px',
    background: '#1c1c1c',
    margin: '5px 0',
    borderRadius: '2px',
  },
  mobileMenu: {
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem 1.5rem',
    borderTop: '1px solid #e0e0e0',
    background: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.07)',
  },
  mobileLink: {
    padding: '0.6rem 0',
    color: '#1c1c1c',
    fontWeight: '500',
    fontSize: '0.95rem',
    textDecoration: 'none',
    borderBottom: '1px solid #f0f0f0',
  },
};

// ── Auth nav styles ───────────────────────────────────
const authStyles = {
  nav: {
    background: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    padding: '0.75rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  logo: { display: 'flex', alignItems: 'center' },
  logoText: {
    fontFamily: 'DM Serif Display, Georgia, serif',
    fontWeight: '400',
    fontSize: '1.3rem',
    color: '#1a6b4a',
    textDecoration: 'none',
  },
  links: { display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' },
  linksOpen: {},
  link: { color: '#4a5568', textDecoration: 'none', fontWeight: '500', fontSize: '0.95rem', padding: '0.25rem 0.6rem', borderRadius: '4px' },
  right: { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
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
  unreadTag: { background: '#1a6b4a', color: 'white', borderRadius: '9999px', fontSize: '0.65rem', padding: '0.1rem 0.4rem', marginLeft: '0.4rem', fontWeight: '600' },
  actionBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#1a6b4a', fontSize: '0.75rem', fontWeight: '600', padding: '0.1rem 0.3rem' },
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
  unreadDot: { width: '8px', height: '8px', background: '#1a6b4a', borderRadius: '50%', flexShrink: 0, marginTop: '6px' },
  logoutBtn: { padding: '0.4rem 1rem', background: '#1a6b4a', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' },
  hamburger: { display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' },
  bar: { display: 'block', width: '22px', height: '2px', background: '#1c1c1c', margin: '5px 0', borderRadius: '2px' },
};
