import { useState, useEffect } from 'react';
import API from '../services/api';

function MemberDashboard() {
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyGroups();
  }, []);

  const fetchMyGroups = async () => {
    try {
      const response = await API.get('/groups/');
      setMyGroups(response.data);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>My Groups</h1>
      {myGroups.length === 0 ? (
        <p>You haven't joined any groups yet.</p>
      ) : (
        <div>
          {myGroups.map(group => (
            <div key={group.id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
              <h3>{group.name}</h3>
              <p>Contribution: {formatCurrency(group.contribution_amount)}</p>
              <p>Next payout: Coming soon</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MemberDashboard;