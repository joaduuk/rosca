import { useState, useEffect } from 'react';
import API from '../services/api';

function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // New state for contributions and payouts
  const [currentCycleStatus, setCurrentCycleStatus] = useState(null);
  const [payoutSchedule, setPayoutSchedule] = useState([]);
  const [contributionSummary, setContributionSummary] = useState(null);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_method: 'cash',
    transaction_reference: '',
    notes: ''
  });

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    contribution_amount: 100,
    contribution_period: 'weekly',
    member_count: 5,
    rosca_type: 'random'
  });

  // Fetch groups on component mount
  useEffect(() => {
    fetchGroups();
  }, []);

  // Fetch members and contribution data when a group is selected
  useEffect(() => {
    if (selectedGroup) {
      fetchMembers(selectedGroup.id);
      fetchContributions(selectedGroup.id);
      fetchCycleStatus(selectedGroup.id, (selectedGroup.current_cycle || 0) + 1);
      fetchPayoutSchedule(selectedGroup.id);
      fetchContributionSummary(selectedGroup.id);
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    try {
      console.log('Fetching groups...');
      const response = await API.get('/groups/');
      console.log('Groups fetched:', response.data);
      setGroups(response.data);
      if (response.data.length > 0) {
        setSelectedGroup(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
      alert('Failed to load groups: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (groupId) => {
    try {
      console.log('Fetching members for group:', groupId);
      const response = await API.get(`/groups/${groupId}/members`);
      console.log('Members fetched:', response.data);
      setMembers(response.data);
    } catch (error) {
      console.error('Failed to fetch members:', error);
      setMembers([]);
    }
  };

  const fetchContributions = async (groupId) => {
    try {
      const response = await API.get(`/groups/${groupId}/contributions`);
      console.log('Contributions fetched:', response.data);
      setContributions(response.data);
    } catch (error) {
      console.error('Failed to fetch contributions:', error);
      setContributions([]);
    }
  };

  // New fetch functions for contribution data
  const fetchCycleStatus = async (groupId, cycleNumber) => {
    try {
      const response = await API.get(`/groups/${groupId}/cycle-status?cycle_number=${cycleNumber}`);
      setCurrentCycleStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch cycle status:', error);
    }
  };

  const fetchPayoutSchedule = async (groupId) => {
    try {
      const response = await API.get(`/groups/${groupId}/payout-schedule`);
      setPayoutSchedule(response.data);
    } catch (error) {
      console.error('Failed to fetch payout schedule:', error);
    }
  };

  const fetchContributionSummary = async (groupId) => {
    try {
      const response = await API.get(`/groups/${groupId}/summary`);
      setContributionSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch contribution summary:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchEmail.trim()) {
      alert('Please enter an email to search');
      return;
    }
    
    setIsSearching(true);
    try {
      console.log('Searching for users with email:', searchEmail);
      const response = await API.get(`/users/search?email=${encodeURIComponent(searchEmail)}`);
      console.log('Users found:', response.data);
      
      const memberUserIds = members.map(m => m.user_id);
      const available = response.data.filter(user => 
        !memberUserIds.includes(user.id)
      );
      
      setAvailableUsers(available);
      
      if (available.length === 0) {
        alert('No new users found with that email. They might already be members.');
      }
    } catch (error) {
      console.error('Failed to search users:', error);
      alert('Failed to search users. Make sure the backend users router is set up.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      console.log('Creating group with data:', newGroup);
      
      const groupData = {
        name: newGroup.name,
        description: newGroup.description || "",
        contribution_amount: Number(newGroup.contribution_amount),
        contribution_period: newGroup.contribution_period,
        member_count: Number(newGroup.member_count),
        rosca_type: newGroup.rosca_type
      };
      
      console.log('Sending to backend:', groupData);
      
      const response = await API.post('/groups/', groupData);
      console.log('Success! Response:', response.data);
      
      setGroups([...groups, response.data]);
      setSelectedGroup(response.data);
      setShowCreateForm(false);
      
      setNewGroup({
        name: '',
        description: '',
        contribution_amount: 100,
        contribution_period: 'weekly',
        member_count: 5,
        rosca_type: 'random'
      });
      
      alert('Group created successfully!');
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      
      if (error.response?.status === 422) {
        const validationErrors = error.response?.data?.detail;
        console.error('Validation errors:', validationErrors);
        
        let errorMessage = 'Validation failed:\n';
        if (Array.isArray(validationErrors)) {
          validationErrors.forEach(err => {
            errorMessage += `- ${err.loc.join('.')}: ${err.msg}\n`;
          });
        } else {
          errorMessage = 'Failed to create group: ' + JSON.stringify(validationErrors);
        }
        
        alert(errorMessage);
      } else {
        alert('Failed to create group: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleAddMember = async (userId) => {
    try {
      console.log('Adding member:', userId, 'to group:', selectedGroup.id);
      
      const response = await API.post(`/groups/${selectedGroup.id}/members/${userId}?is_admin=false`);
      
      console.log('Add member response:', response.data);
      
      await fetchMembers(selectedGroup.id);
      
      setShowAddMemberForm(false);
      setSearchEmail('');
      setAvailableUsers([]);
      
      alert('Member added successfully!');
    } catch (error) {
      console.error('Failed to add member:', error);
      alert('Failed to add member: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) {
      return;
    }
    
    try {
      console.log('Removing member:', userId, 'from group:', selectedGroup.id);
      
      await API.delete(`/groups/${selectedGroup.id}/members/${userId}`);
      
      await fetchMembers(selectedGroup.id);
      
      alert('Member removed successfully!');
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  // New function to handle recording payment
  const handleRecordPayment = (member) => {
    setSelectedMember(member);
    setPaymentData({
      ...paymentData,
      amount: selectedGroup?.contribution_amount || 0
    });
    setShowRecordPaymentModal(true);
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!selectedGroup || !selectedMember) return;

    try {
      const currentCycle = (selectedGroup.current_cycle || 0) + 1;
      const response = await API.post(`/groups/${selectedGroup.id}/contributions`, {
        membership_id: selectedMember.membership_id || selectedMember.id,
        cycle_number: currentCycle,
        amount: paymentData.amount,
        currency: 'USD',
        due_date: new Date().toISOString(),
        payment_method: paymentData.payment_method,
        notes: paymentData.notes,
        transaction_reference: paymentData.transaction_reference
      });

      alert('Payment recorded successfully!');
      setShowRecordPaymentModal(false);
      setSelectedMember(null);
      setPaymentData({
        amount: 0,
        payment_method: 'cash',
        transaction_reference: '',
        notes: ''
      });
      
      // Refresh all data
      fetchMembers(selectedGroup.id);
      fetchContributions(selectedGroup.id);
      fetchCycleStatus(selectedGroup.id, currentCycle);
      fetchPayoutSchedule(selectedGroup.id);
      fetchContributionSummary(selectedGroup.id);
    } catch (error) {
      console.error('Failed to record payment:', error);
      alert('Failed to record payment: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Loading your groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Header */}
      <nav style={{
        background: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>
          ROSCA Dashboard
        </h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              padding: '0.5rem 1rem',
              background: '#48bb78',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            + New Group
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              background: '#f56565',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ display: 'flex', padding: '2rem', gap: '2rem' }}>
        {/* Sidebar - Groups List */}
        <div style={{
          width: '300px',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '1rem'
        }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Your Groups ({groups.length})
          </h2>
          {groups.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
              No groups yet. Create one!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  style={{
                    padding: '1rem',
                    background: selectedGroup?.id === group.id ? '#667eea' : '#f7fafc',
                    color: selectedGroup?.id === group.id ? 'white' : '#333',
                    border: '1px solid #e2e8f0',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{group.name}</div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: selectedGroup?.id === group.id ? '#e2e8f0' : '#718096'
                  }}>
                    {formatCurrency(group.contribution_amount)} • {group.contribution_period}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Panel - Group Details */}
        {selectedGroup ? (
          <div style={{ flex: 1 }}>
            {/* Group Header */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    {selectedGroup.name}
                  </h2>
                  <p style={{ color: '#666', marginBottom: '1rem' }}>
                    {selectedGroup.description || 'No description'}
                  </p>
                  
                  {/* Group Details Grid */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '1rem',
                    background: '#f8fafc',
                    padding: '1.25rem',
                    borderRadius: '8px',
                    marginTop: '0.5rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
                        Contribution
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#0f172a' }}>
                        {formatCurrency(selectedGroup.contribution_amount)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
                        Frequency
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#0f172a', textTransform: 'capitalize' }}>
                        {selectedGroup.contribution_period || 'Not set'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
                        ROSCA Type
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#0f172a', textTransform: 'capitalize' }}>
                        {selectedGroup.rosca_type || 'Not set'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
                        Members
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#0f172a' }}>
                        {members.length} / {selectedGroup.member_count}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
                        Created
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#0f172a' }}>
                        {formatDate(selectedGroup.created_at)}
                      </div>
                    </div>

                    {contributionSummary && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
                          Current Cycle
                        </div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#0f172a' }}>
                          {contributionSummary.current_cycle || 1}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setShowAddMemberForm(true);
                    setSearchEmail('');
                    setAvailableUsers([]);
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                    marginLeft: '1rem',
                    whiteSpace: 'nowrap',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#764ba2'}
                  onMouseOut={(e) => e.target.style.background = '#667eea'}
                >
                  + Add Member
                </button>
              </div>
            </div>

            {/* Current Cycle Status Section - NEW */}
            {currentCycleStatus && (
              <div style={{
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                padding: '1.5rem',
                marginBottom: '2rem'
              }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                  Current Cycle #{currentCycleStatus.cycle_number} Status
                </h3>
                
                {/* Progress Bar */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Progress: {currentCycleStatus.paid_count} of {currentCycleStatus.total_members} paid</span>
                    <span>{currentCycleStatus.completion_percentage?.toFixed(0) || 0}%</span>
                  </div>
                  <div style={{
                    height: '10px',
                    background: '#e2e8f0',
                    borderRadius: '5px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${currentCycleStatus.completion_percentage || 0}%`,
                      height: '100%',
                      background: currentCycleStatus.completion_percentage === 100 ? '#48bb78' : '#667eea',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '8px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Expected</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {formatCurrency(currentCycleStatus.expected_total || 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Paid</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#48bb78' }}>
                      {formatCurrency(currentCycleStatus.total_paid || 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Remaining</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#f56565' }}>
                      {formatCurrency(currentCycleStatus.remaining_amount || 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Payout Status</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', textTransform: 'capitalize' }}>
                      {currentCycleStatus.payout_status || 'pending'}
                    </div>
                  </div>
                </div>

                {/* Member Payment Status Table */}
                <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                  Member Payment Status
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Member</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Payout Order</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Paid Date</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentCycleStatus.members?.map(member => (
                        <tr key={member.member_id}>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            {member.name}
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            {member.payout_order}
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              background: member.has_paid ? '#48bb78' : '#f56565',
                              color: 'white',
                              borderRadius: '9999px',
                              fontSize: '0.75rem'
                            }}>
                              {member.has_paid ? 'Paid' : 'Pending'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            {member.paid_date ? formatDate(member.paid_date) : '-'}
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            {!member.has_paid && (
                              <button
                                onClick={() => handleRecordPayment(member)}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  background: '#48bb78',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '3px',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Record Payment
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Members Section */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                Members ({members.length})
              </h3>
              {members.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
                  No members yet. Click "Add Member" to add someone!
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f7fafc' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Name</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Email</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Joined</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Payout Order</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map(member => (
                        <tr key={member.membership_id || member.id}>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            {member.user_name || member.name}
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            {member.user_email || member.email}
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            {member.joined_at ? formatDate(member.joined_at) : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            {member.payout_order || 'Not set'}
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              background: member.is_admin ? '#9f7aea' : '#48bb78',
                              color: 'white',
                              borderRadius: '9999px',
                              fontSize: '0.75rem'
                            }}>
                              {member.is_admin ? 'Admin' : 'Member'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            {!member.is_admin && (
                              <button
                                onClick={() => handleRemoveMember(member.user_id)}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  background: '#f56565',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '3px',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer'
                                }}
                              >
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

            {/* Payout Schedule Section - NEW */}
            {payoutSchedule.length > 0 && (
              <div style={{
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                padding: '1.5rem',
                marginBottom: '2rem'
              }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                  Payout Schedule
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Cycle</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Recipient</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Amount</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Date</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Contributions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payoutSchedule.map(schedule => (
                        <tr key={schedule.id}>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            Cycle {schedule.cycle_number}
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            {schedule.recipient_name}
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            {formatCurrency(schedule.amount)}
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            {formatDate(schedule.payout_date)}
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              background: schedule.status === 'paid' ? '#48bb78' : 
                                         schedule.status === 'scheduled' ? '#fbbf24' : '#f56565',
                              color: 'white',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              textTransform: 'capitalize'
                            }}>
                              {schedule.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            {schedule.paid_count}/{schedule.contributions_count} paid
                            {schedule.all_paid && ' ✅'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Contributions Section */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              padding: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                Recent Contributions
              </h3>
              {contributions.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
                  No contributions yet. The cycle hasn't started.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f7fafc' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Date</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Member</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Amount</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contributions.slice(0, 5).map(contribution => (
                        <tr key={contribution.id}>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            {formatDate(contribution.paid_date || contribution.due_date)}
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            {contribution.member_name}
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            {formatCurrency(contribution.amount)}
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              background: contribution.status === 'paid' ? '#48bb78' : '#f56565',
                              color: 'white',
                              borderRadius: '9999px',
                              fontSize: '0.75rem'
                            }}>
                              {contribution.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Financial Summary Section - NEW */}
            {contributionSummary && (
              <div style={{
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                padding: '1.5rem',
                marginTop: '2rem'
              }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                  Financial Summary
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1.5rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Total Collected</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>
                      {formatCurrency(contributionSummary.total_collected || 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Total Paid Out</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>
                      {formatCurrency(contributionSummary.total_paid_out || 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Current Balance</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
                      {formatCurrency(contributionSummary.balance || 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Cycles Completed</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>
                      {contributionSummary.total_cycles_completed || 0}
                    </div>
                  </div>
                </div>
                
                {/* Currency Breakdown */}
                {contributionSummary.contributions_by_currency && 
                 Object.keys(contributionSummary.contributions_by_currency).length > 0 && (
                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                      Contributions by Currency
                    </h4>
                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                      {Object.entries(contributionSummary.contributions_by_currency).map(([currency, amount]) => (
                        <div key={currency}>
                          <span style={{ fontWeight: 'bold' }}>{currency}:</span>{' '}
                          {formatCurrency(amount)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            flex: 1,
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '3rem',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '1.5rem', color: '#666', marginBottom: '1rem' }}>
              Welcome to ROSCA Dashboard!
            </h2>
            <p style={{ color: '#999', marginBottom: '2rem' }}>
              Select a group from the sidebar or create a new one to get started.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              style={{
                padding: '1rem 2rem',
                background: '#48bb78',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '1.1rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Create Your First Group
            </button>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90%'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Create New Group
            </h3>
            <form onSubmit={handleCreateGroup}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }}
                  required
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>
                  Description
                </label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    minHeight: '80px'
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>
                  Contribution Amount ($)
                </label>
                <input
                  type="number"
                  value={newGroup.contribution_amount}
                  onChange={(e) => setNewGroup({...newGroup, contribution_amount: parseFloat(e.target.value)})}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }}
                  required
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>
                  Contribution Period
                </label>
                <select
                  value={newGroup.contribution_period}
                  onChange={(e) => setNewGroup({...newGroup, contribution_period: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>
                  Number of Members
                </label>
                <input
                  type="number"
                  value={newGroup.member_count}
                  onChange={(e) => setNewGroup({...newGroup, member_count: parseInt(e.target.value)})}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }}
                  required
                  min="2"
                  max="50"
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>
                  ROSCA Type
                </label>
                <select
                  value={newGroup.rosca_type}
                  onChange={(e) => setNewGroup({...newGroup, rosca_type: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }}
                >
                  <option value="random">Random (Lottery)</option>
                  <option value="fixed">Fixed Order</option>
                  <option value="auction">Auction</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#ccc',
                    color: '#333',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#48bb78',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90%'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Add Member to {selectedGroup?.name}
            </h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>
                Search User by Email
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="Enter email address"
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }}
                />
                <button
                  onClick={searchUsers}
                  disabled={isSearching}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
            
            {availableUsers.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Search Results:</p>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {availableUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleAddMember(user.id)}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        marginBottom: '0.5rem',
                        background: '#f7fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#edf2f7'}
                      onMouseOut={(e) => e.currentTarget.style.background = '#f7fafc'}
                    >
                      <div style={{ fontWeight: 'bold' }}>{user.full_name}</div>
                      <div style={{ fontSize: '0.875rem', color: '#718096' }}>{user.email}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <button
              onClick={() => {
                setShowAddMemberForm(false);
                setSearchEmail('');
                setAvailableUsers([]);
              }}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: '#ccc',
                color: '#333',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Record Payment Modal - NEW */}
      {showRecordPaymentModal && selectedMember && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90%'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Record Payment for {selectedMember.name}
            </h3>
            <form onSubmit={submitPayment}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>
                  Amount
                </label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({...paymentData, amount: parseFloat(e.target.value)})}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }}
                  required
                  step="0.01"
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>
                  Payment Method
                </label>
                <select
                  value={paymentData.payment_method}
                  onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }}
                >
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                </select>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>
                  Transaction Reference (Optional)
                </label>
                <input
                  type="text"
                  value={paymentData.transaction_reference}
                  onChange={(e) => setPaymentData({...paymentData, transaction_reference: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>
                  Notes (Optional)
                </label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    minHeight: '80px'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowRecordPaymentModal(false);
                    setSelectedMember(null);
                    setPaymentData({
                      amount: 0,
                      payment_method: 'cash',
                      transaction_reference: '',
                      notes: ''
                    });
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#ccc',
                    color: '#333',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#48bb78',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;