// frontend/src/pages/GroupReports.jsx
import { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

function GroupReports() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await API.get('/groups/');
      setGroups(response.data);
      if (response.data.length > 0) {
        setSelectedGroup(response.data[0]);
        fetchSummary(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async (groupId) => {
    try {
      const response = await API.get(`/groups/${groupId}/summary`);
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  const handleGroupChange = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    setSelectedGroup(group);
    fetchSummary(groupId);
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  if (groups.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>No Groups Found</h2>
        <p>Create a group to view reports.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Group Reports</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          Select Group
        </label>
        <select
          value={selectedGroup?.id || ''}
          onChange={(e) => handleGroupChange(e.target.value)}
          style={{
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '5px',
            width: '300px'
          }}
        >
          {groups.map(group => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>
      
      {summary && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3>Total Collected</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#48bb78' }}>
                {summary.currency || 'USD'} {summary.total_collected?.toFixed(2) || 0}
              </p>
            </div>
            
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3>Total Paid Out</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f56565' }}>
                {summary.currency || 'USD'} {summary.total_paid_out?.toFixed(2) || 0}
              </p>
            </div>
            
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3>Current Balance</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4299e1' }}>
                {summary.currency || 'USD'} {summary.balance?.toFixed(2) || 0}
              </p>
            </div>
            
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3>Cycles Completed</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                {summary.total_cycles_completed || 0}
              </p>
            </div>
          </div>
          
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3>Current Cycle Status</h3>
            <div style={{ marginTop: '1rem' }}>
              <div>Cycle {summary.current_cycle}</div>
              <div style={{ marginTop: '0.5rem' }}>
                <div>Paid: {summary.current_cycle_paid} / {summary.total_members}</div>
                <div>Pending: {summary.current_cycle_pending}</div>
              </div>
              {summary.next_payout_date && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef5e7', borderRadius: '5px' }}>
                  <strong>Next Payout Date:</strong> {new Date(summary.next_payout_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupReports;