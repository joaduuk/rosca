import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navigation() {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <nav style={{
      background: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      padding: '0.75rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#667eea' }}>
          🔄 ROSCA
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
        <Link to="/groups/create" style={linkStyle}>Create Group</Link>
        <Link to="/reports" style={linkStyle}>Reports</Link>

        {isSuperAdmin && (
          <>
            <Link to="/admin" style={linkStyle}>Admin</Link>
            <Link to="/admin/users" style={linkStyle}>Users</Link>
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
          {user?.fullName || user?.email}
          <span style={{
            marginLeft: '0.5rem',
            padding: '0.1rem 0.5rem',
            background: isSuperAdmin ? '#667eea' : '#48bb78',
            color: 'white',
            borderRadius: '9999px',
            fontSize: '0.7rem',
            textTransform: 'uppercase'
          }}>
            {user?.role}
          </span>
        </span>
        <button
          onClick={logout}
          style={{
            padding: '0.4rem 1rem',
            background: '#f56565',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

const linkStyle = {
  color: '#4a5568',
  textDecoration: 'none',
  fontWeight: '500',
  fontSize: '0.95rem',
  padding: '0.25rem 0.5rem',
  borderRadius: '4px',
  transition: 'color 0.2s'
};