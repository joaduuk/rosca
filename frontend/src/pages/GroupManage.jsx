import { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import CycleManager from './CycleManager';

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try { return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return 'Invalid date'; }
}

export default function GroupManage() {
  const { user } = useAuth();
  const mobile = useIsMobile();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    try {
      const res = await API.get('/groups/');
      setGroups(res.data);
      if (res.data.length > 0) {
        setSelectedGroup(res.data[0]);
        fetchMembers(res.data[0].id);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchMembers = async (id) => {
    try { const r = await API.get(`/groups/${id}/members`); setMembers(r.data); }
    catch { setMembers([]); }
  };

  const refreshGroup = async (groupId) => {
    try {
      const res = await API.get(`/groups/${groupId}`);
      setSelectedGroup(res.data);
      setGroups(prev => prev.map(g => g.id === res.data.id ? res.data : g));
      await fetchMembers(groupId);
    } catch (e) { console.error(e); }
  };

  const handleGroupChange = (groupId) => {
    const g = groups.find(g => g.id === groupId);
    if (g) { setSelectedGroup(g); fetchMembers(g.id); }
  };

  const isCurrentUserAdmin = members.some(m => m.user_id === user?.id && m.is_admin);

  const handleRemoveMember = async (membershipId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await API.delete(`/groups/${selectedGroup.id}/members/${membershipId}`);
      await fetchMembers(selectedGroup.id);
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleReorder = async (membershipId, direction) => {
    try {
      await API.put(`/groups/${selectedGroup.id}/members/${membershipId}/reorder?direction=${direction}`);
      await fetchMembers(selectedGroup.id);
    } catch (err) {
      alert('Failed to reorder: ' + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading…</div>;

  if (groups.length === 0) return (
    <div style={{ padding: '3rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚙️</div>
      <h2 style={{ color: '#124d35' }}>No Groups Yet</h2>
      <p style={{ color: '#64748b' }}>Create a group from the Dashboard first.</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>⚙️ Manage</h1>
        <select
          value={selectedGroup?.id || ''}
          onChange={e => handleGroupChange(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', color: '#0f172a', background: 'white', cursor: 'pointer', minWidth: '200px' }}
        >
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {[
            { key: 'members', label: '👥 Members' },
            { key: 'cycle', label: '🔄 Cycle Control' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer',
              fontWeight: '500', fontSize: '0.875rem',
              background: activeTab === tab.key ? '#1a6b4a' : 'white',
              color: activeTab === tab.key ? 'white' : '#64748b',
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Members */}
        {activeTab === 'members' && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                Members <span style={{ fontWeight: '400', color: '#64748b' }}>({members.length})</span>
              </h3>
              {isCurrentUserAdmin && (
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>↑↓ Arrows reorder payout sequence</span>
              )}
            </div>

            {members.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No members yet. Add members from the Dashboard.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Order', 'Name', 'Email', 'Joined', 'Role', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '0.65rem 0.875rem', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...members].sort((a, b) => (a.payout_order || 0) - (b.payout_order || 0)).map((m, index, sorted) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.65rem 0.875rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ display: 'inline-block', minWidth: '28px', textAlign: 'center', background: '#1a6b4a', color: 'white', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700', padding: '0.1rem 0.4rem' }}>
                              #{m.payout_order || '—'}
                            </span>
                            {isCurrentUserAdmin && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <button onClick={() => handleReorder(m.id, 'up')} disabled={index === 0}
                                  style={{ padding: '0 5px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '3px', cursor: 'pointer', fontSize: '0.6rem', opacity: index === 0 ? 0.3 : 1 }}>▲</button>
                                <button onClick={() => handleReorder(m.id, 'down')} disabled={index === sorted.length - 1}
                                  style={{ padding: '0 5px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '3px', cursor: 'pointer', fontSize: '0.6rem', opacity: index === sorted.length - 1 ? 0.3 : 1 }}>▼</button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.875rem', fontWeight: '500', color: '#334155' }}>
                          {m.user_name || m.name}
                          {m.member_status === 'offline' && (
                            <span style={{ marginLeft: '0.4rem', background: '#f1f5f9', color: '#64748b', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: '600', padding: '0.1rem 0.5rem', verticalAlign: 'middle' }}>
                              Offline
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.65rem 0.875rem', color: '#64748b', fontSize: '0.82rem' }}>{m.user_email || m.email || '—'}</td>
                        <td style={{ padding: '0.65rem 0.875rem', color: '#64748b' }}>{formatDate(m.joined_at)}</td>
                        <td style={{ padding: '0.65rem 0.875rem' }}>
                          <span style={{ background: m.is_admin ? '#e8f5ef' : '#f0fdf4', color: m.is_admin ? '#1a6b4a' : '#166534', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '600', padding: '0.2rem 0.6rem' }}>
                            {m.is_admin ? 'Admin' : 'Member'}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.875rem' }}>
                          <span style={{
                            background: m.membership_status === 'exit_requested' ? '#fff8e6' : m.membership_status === 'exited' ? '#fee2e2' : '#f0fdf4',
                            color: m.membership_status === 'exit_requested' ? '#854d0e' : m.membership_status === 'exited' ? '#991b1b' : '#166534',
                            borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '600', padding: '0.2rem 0.6rem', textTransform: 'capitalize'
                          }}>
                            {m.membership_status?.replace('_', ' ') || 'active'}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.875rem' }}>
                          {!m.is_admin && isCurrentUserAdmin && (
                            <button onClick={() => handleRemoveMember(m.id)} style={{ padding: '0.25rem 0.7rem', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}>
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Cycle Control */}
        {activeTab === 'cycle' && selectedGroup && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '1.25rem' }}>Cycle Control</h3>
            <CycleManager
              group={selectedGroup}
              members={members}
              currentUser={user}
              onUpdate={() => refreshGroup(selectedGroup.id)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
