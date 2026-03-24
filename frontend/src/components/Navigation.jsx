// frontend/src/components/Navigation.jsx
import { useAuth } from '../context/AuthContext';

export function Navigation() {
  const { user, logout, isSuperAdmin, isGroupAdmin } = useAuth();

  return (
    <nav>
      {/* Common links for all users */}
      <a href="/dashboard">Dashboard</a>
      
      {/* Group Admin links */}
      {isGroupAdmin && (
        <>
          <a href="/groups/create">Create Group</a>
          <a href="/reports">Reports</a>
        </>
      )}
      
      {/* Super Admin links */}
      {isSuperAdmin && (
        <>
          <a href="/admin/users">Manage Users</a>
          <a href="/admin/stats">Platform Stats</a>
        </>
      )}
      
      {/* User info */}
      <span>{user?.fullName} ({user?.role})</span>
      <button onClick={logout}>Logout</button>
    </nav>
  );
}