import { useState, useEffect } from 'react';
import API from '../services/api';

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes, groupsRes] = await Promise.all([
        API.get('/admin/stats'),
        API.get('/admin/users'),
        API.get('/admin/groups')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setGroups(groupsRes.data);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Platform Admin Dashboard</h1>
      
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div style={{ background: '#667eea', color: 'white', padding: '1.5rem', borderRadius: '8px' }}>
          <h3>Total Users</h3>
          <p style={{ fontSize: '2rem' }}>{stats.total_users}</p>
        </div>
        <div style={{ background: '#48bb78', color: 'white', padding: '1.5rem', borderRadius: '8px' }}>
          <h3>Active Groups</h3>
          <p style={{ fontSize: '2rem' }}>{stats.total_groups}</p>
        </div>
        <div style={{ background: '#fbbf24', color: 'white', padding: '1.5rem', borderRadius: '8px' }}>
          <h3>Total Contributions</h3>
          <p style={{ fontSize: '2rem' }}>£{stats.total_contributions.toLocaleString()}</p>
        </div>
        <div style={{ background: '#f56565', color: 'white', padding: '1.5rem', borderRadius: '8px' }}>
          <h3>Today's Active</h3>
          <p style={{ fontSize: '2rem' }}>{stats.active_groups_today}</p>
        </div>
      </div>

      {/* User Management Table */}
      <div style={{ marginTop: '2rem', background: 'white', padding: '1.5rem', borderRadius: '8px' }}>
        <h2>User Management</h2>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.full_name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.is_active ? 'Active' : 'Suspended'}</td>
                <td>
                  <button>Suspend</button>
                  <button>Reset Password</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminDashboard;