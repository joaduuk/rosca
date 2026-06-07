import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

function PublicNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const mobile = useIsMobile();

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'About', href: '/#about' },
    { label: 'FAQ', href: '/#faq' },
    { label: 'Terms', href: '/#terms' },
    { label: 'Privacy', href: '/#privacy' },
  ];

  return (
    <>
      <nav style={{ background: 'white', borderBottom: '1px solid #e0e0e0', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
        <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', height: '64px', justifyContent: 'space-between' }}>
          
          {/* Logo */}
          <Link to="/" style={{ fontFamily: "Georgia, serif", fontSize: '1.5rem', color: '#1a6b4a', textDecoration: 'none', flexShrink: 0 }}>
            Rosca<span style={{ color: '#f0a500' }}>App</span>
          </Link>

          {/* Desktop links */}
          {!mobile && (
            <ul style={{ display: 'flex', gap: '0.25rem', listStyle: 'none', margin: 0, padding: 0, flex: 1, marginLeft: '2rem' }}>
              {navLinks.map(({ label, to, href }) => (
                <li key={label}>
                  {to ? (
                    <Link to={to} style={linkStyle}>{label}</Link>
                  ) : (
                    <a href={href} style={linkStyle}>{label}</a>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Desktop CTA */}
          {!mobile && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Link to="/login" style={btnOutline}>Log in</Link>
              <Link to="/login" style={btnPrimary}>Get Started Free</Link>
            </div>
          )}

          {/* Mobile hamburger */}
          {mobile && (
            <button onClick={() => setMenuOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ display: 'block', width: '24px', height: '2px', background: menuOpen ? '#1a6b4a' : '#1c1c1c', borderRadius: '2px', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none', transition: '0.2s' }} />
              <span style={{ display: 'block', width: '24px', height: '2px', background: '#1c1c1c', borderRadius: '2px', opacity: menuOpen ? 0 : 1, transition: '0.2s' }} />
              <span style={{ display: 'block', width: '24px', height: '2px', background: menuOpen ? '#1a6b4a' : '#1c1c1c', borderRadius: '2px', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none', transition: '0.2s' }} />
            </button>
          )}
        </div>

        {/* Mobile dropdown menu */}
        {mobile && menuOpen && (
          <div style={{ background: 'white', borderTop: '1px solid #e0e0e0', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            {navLinks.map(({ label, to, href }) => (
              to ? (
                <Link key={label} to={to} style={mobileLinkStyle} onClick={() => setMenuOpen(false)}>{label}</Link>
              ) : (
                <a key={label} href={href} style={mobileLinkStyle} onClick={() => setMenuOpen(false)}>{label}</a>
              )
            ))}
            <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '0.75rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link to="/login" style={{ ...btnOutline, textAlign: 'center' }} onClick={() => setMenuOpen(false)}>Log in</Link>
              <Link to="/login" style={{ ...btnPrimary, textAlign: 'center' }} onClick={() => setMenuOpen(false)}>Get Started Free</Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

function AuthNav() {
  const { user, logout, isSuperAdmin } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications() || {};
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const mobile = useIsMobile();
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navLinks = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Create Group', to: '/groups/create' },
    { label: 'Reports', to: '/reports' },
    ...(isSuperAdmin ? [{ label: 'Admin', to: '/admin' }, { label: 'Users', to: '/admin/users' }] : []),
  ];

  return (
    <nav style={{ background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ padding: '0 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>
        
        {/* Logo — clickable to home/dashboard */}
        <Link to="/dashboard" style={{ fontFamily: "Georgia, serif", fontSize: '1.3rem', color: '#1a6b4a', textDecoration: 'none', flexShrink: 0 }}>
          Rosca<span style={{ color: '#f0a500' }}>App</span>
        </Link>

        {/* Desktop nav links */}
        {!mobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1, marginLeft: '2rem' }}>
            {navLinks.map(({ label, to }) => (
              <Link key={label} to={to} style={authLinkStyle}>{label}</Link>
            ))}
          </div>
        )}

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* User info — desktop only */}
          {!mobile && (
            <Link to="/profile" style={{ fontSize: '0.875rem', color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {user?.fullName || user?.email}
              <span style={{ background: isSuperAdmin ? '#1a6b4a' : '#f0a500', color: 'white', borderRadius: '9999px', fontSize: '0.65rem', padding: '0.1rem 0.45rem', textTransform: 'uppercase', fontWeight: '600' }}>
                {user?.role}
              </span>
            </Link>
          )}

          {/* Bell */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button onClick={() => setBellOpen(o => !o)} style={{ position: 'relative', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>
              🔔
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', borderRadius: '9999px', fontSize: '0.6rem', fontWeight: '700', minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {bellOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: mobile ? '320px' : '360px', background: 'white', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', zIndex: 999, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>
                    Notifications {unreadCount > 0 && <span style={{ background: '#1a6b4a', color: 'white', borderRadius: '9999px', fontSize: '0.65rem', padding: '0.1rem 0.4rem', marginLeft: '0.4rem' }}>{unreadCount} new</span>}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {unreadCount > 0 && <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a6b4a', fontSize: '0.75rem', fontWeight: '600' }}>Mark all read</button>}
                    {notifications?.length > 0 && <button onClick={clearAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '0.75rem', fontWeight: '600' }}>Clear</button>}
                  </div>
                </div>
                <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                  {!notifications?.length ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>🔔 No notifications yet</div>
                  ) : notifications.map(n => (
                    <div key={n.id} onClick={() => !n.is_read && markRead(n.id)}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.875rem 1rem', borderBottom: '1px solid #f8fafc', background: n.is_read ? 'white' : '#f0f9f4', cursor: n.is_read ? 'default' : 'pointer' }}>
                      <div style={{ fontSize: '1.25rem', flexShrink: 0 }}>{ICONS[n.type] || '🔔'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.825rem', color: '#0f172a' }}>{n.title}</div>
                        <div style={{ fontSize: '0.775rem', color: '#64748b' }}>{n.message}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>{timeAgo(n.created_at)}</div>
                      </div>
                      {!n.is_read && <div style={{ width: '8px', height: '8px', background: '#1a6b4a', borderRadius: '50%', flexShrink: 0, marginTop: '6px' }} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Logout — desktop */}
          {!mobile && (
            <button onClick={logout} style={{ padding: '0.4rem 1rem', background: '#1a6b4a', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>
              Logout
            </button>
          )}

          {/* Hamburger — mobile */}
          {mobile && (
            <button onClick={() => setMenuOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ display: 'block', width: '24px', height: '2px', background: '#1c1c1c', borderRadius: '2px', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none', transition: '0.2s' }} />
              <span style={{ display: 'block', width: '24px', height: '2px', background: '#1c1c1c', borderRadius: '2px', opacity: menuOpen ? 0 : 1, transition: '0.2s' }} />
              <span style={{ display: 'block', width: '24px', height: '2px', background: '#1c1c1c', borderRadius: '2px', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none', transition: '0.2s' }} />
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobile && menuOpen && (
        <div style={{ background: 'white', borderTop: '1px solid #e0e0e0', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
            Signed in as <strong style={{ color: '#1a6b4a' }}>{user?.fullName || user?.email}</strong>
          </div>
          {navLinks.map(({ label, to }) => (
            <Link key={label} to={to} style={mobileLinkStyle} onClick={() => setMenuOpen(false)}>{label}</Link>
          ))}
          <Link to="/profile" style={mobileLinkStyle} onClick={() => setMenuOpen(false)}>Profile</Link>
          <button onClick={() => { logout(); setMenuOpen(false); }} style={{ marginTop: '0.5rem', padding: '0.7rem', background: '#1a6b4a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', textAlign: 'center' }}>
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

export function Navigation() {
  const { user } = useAuth();
  return user ? <AuthNav /> : <PublicNav />;
}

const linkStyle = { padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '500', color: '#5a5a5a', textDecoration: 'none' };
const authLinkStyle = { padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '500', color: '#4a5568', textDecoration: 'none' };
const mobileLinkStyle = { padding: '0.7rem 0', color: '#1c1c1c', fontWeight: '500', fontSize: '0.95rem', textDecoration: 'none', borderBottom: '1px solid #f0f0f0', display: 'block' };
const btnOutline = { border: '1.5px solid #1a6b4a', color: '#1a6b4a', padding: '0.45rem 1.1rem', borderRadius: '6px', fontSize: '0.88rem', fontWeight: '500', background: 'transparent', textDecoration: 'none', display: 'inline-block' };
const btnPrimary = { background: '#1a6b4a', color: 'white', padding: '0.5rem 1.2rem', borderRadius: '6px', fontSize: '0.88rem', fontWeight: '500', textDecoration: 'none', display: 'inline-block' };
