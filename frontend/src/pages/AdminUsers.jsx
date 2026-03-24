// frontend/src/pages/AdminUsers.jsx
import { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await API.get('/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      // ✅ FIX: Send as query parameter
      await API.put(`/admin/users/${userId}/role?new_role=${newRole}`);
      alert('User role updated successfully!');
      fetchUsers(); // Refresh list
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update user role: ' + (error.response?.data?.detail || error.message));
    }
  };

  const suspendUser = async (userId) => {
    if (!window.confirm('Are you sure you want to suspend this user?')) return;
    
    try {
      await API.put(`/admin/users/${userId}/suspend`);
      alert('User suspended successfully!');
      fetchUsers();
    } catch (error) {
      console.error('Failed to suspend user:', error);
      alert('Failed to suspend user');
    }
  };

  const activateUser = async (userId) => {
    try {
      await API.put(`/admin/users/${userId}/activate`);
      alert('User activated successfully!');
      fetchUsers();
    } catch (error) {
      console.error('Failed to activate user:', error);
      alert('Failed to activate user');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading users...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>User Management</h1>
      
      <div style={{ overflowX: 'auto', marginTop: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Role</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Actions</th>
             </tr>
          </thead>
          <tbody>
            {users.map((userItem) => (
              <tr key={userItem.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '1rem' }}>{userItem.full_name}</td>
                <td style={{ padding: '1rem' }}>{userItem.email}</td>
                <td style={{ padding: '1rem' }}>
                  <select
                    value={userItem.role}
                    onChange={(e) => updateUserRole(userItem.id, e.target.value)}
                    disabled={userItem.id === user?.id}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '5px',
                      border: '1px solid #d1d5db',
                      background: userItem.id === user?.id ? '#f3f4f6' : 'white',
                      cursor: userItem.id === user?.id ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="GROUP_ADMIN">Group Admin</option>
                    <option value="GROUP_MEMBER">Group Member</option>
                  </select>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    background: userItem.is_active ? '#48bb78' : '#f56565',
                    color: 'white',
                    fontSize: '0.875rem'
                  }}>
                    {userItem.is_active ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  {userItem.id !== user?.id && (
                    <>
                      {userItem.is_active ? (
                        <button
                          onClick={() => suspendUser(userItem.id)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#f56565',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            marginRight: '0.5rem'
                          }}
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => activateUser(userItem.id)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#48bb78',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            marginRight: '0.5rem'
                          }}
                        >
                          Activate
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminUsers;