import { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ALL_CURRENCIES, formatCurrency } from '../utils/currency';

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
  try {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return 'Invalid date'; }
}

const EMPTY_GROUP = {
  name: '', description: '', contribution_amount: 100,
  contribution_period: 'weekly', member_count: 5, rosca_type: 'fixed', currency: 'USD'
};

const EMPTY_PAYMENT = { amount: 0, payment_method: 'cash', transaction_reference: '', notes: '' };

const STATUS_COLORS = {
  active: { bg: '#dcfce7', color: '#166534' },
  paused: { bg: '#fee2e2', color: '#991b1b' },
  ended: { bg: '#f1f5f9', color: '#475569' },
  pending_decision: { bg: '#fef9c3', color: '#854d0e' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const mobile = useIsMobile();

  const [groups, setGroups] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [cycleStatus, setCycleStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [newGroup, setNewGroup] = useState(EMPTY_GROUP);
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedGuarantor, setSelectedGuarantor] = useState(null);
  const [paymentData, setPaymentData] = useState(EMPTY_PAYMENT);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState(null);
  // null = prompt not yet answered, 'code' = existing account, 'offline' = no account
  const [addMemberTab, setAddMemberTab] = useState(null);
  const [offlineForm, setOfflineForm] = useState({ name: '' });
  const [isAddingOffline, setIsAddingOffline] = useState(false);

  useEffect(() => { fetchGroups(); }, []);

  useEffect(() => {
    if (selectedGroup) loadGroupData(selectedGroup);
  }, [selectedGroup?.id]);

  const loadGroupData = async (group) => {
    const activeCycle = (group.current_cycle || 0) + 1;
    await Promise.all([
      fetchMembers(group.id),
      fetchCycleStatus(group.id, activeCycle),
    ]);
  };

  const fetchGroups = async (includeArchived = false) => {
    try {
      const res = await API.get(`/groups/?include_archived=${includeArchived}`);
      setGroups(res.data);
      if (res.data.length > 0 && !selectedGroup) setSelectedGroup(res.data[0]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleShowArchived = () => {
    const next = !showArchived;
    setShowArchived(next);
    fetchGroups(next);
  };

  const archiveGroup = async (groupId) => {
    if (!window.confirm('Archive this group? It will be hidden from your sidebar but not deleted.')) return;
    try {
      await API.put(`/groups/${groupId}/archive`);
      await fetchGroups(showArchived);
    } catch (err) {
      alert('Failed to archive: ' + (err.response?.data?.detail || err.message));
    }
  };

  const unarchiveGroup = async (groupId) => {
    try {
      await API.put(`/groups/${groupId}/unarchive`);
      await fetchGroups(showArchived);
    } catch (err) {
      alert('Failed to unarchive: ' + (err.response?.data?.detail || err.message));
    }
  };

  const refreshSelectedGroup = async (groupId) => {
    try {
      const res = await API.get(`/groups/${groupId}`);
      const updated = res.data;
      setSelectedGroup(updated);
      setGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
      return updated;
    } catch { return null; }
  };

  const fetchMembers = async (id) => {
    try { const r = await API.get(`/groups/${id}/members`); setMembers(r.data); }
    catch { setMembers([]); }
  };

  const fetchCycleStatus = async (id, cycle) => {
    try { const r = await API.get(`/groups/${id}/cycle-status?cycle_number=${cycle}`); setCycleStatus(r.data); }
    catch { setCycleStatus(null); }
  };

  const refreshAll = async (groupId) => {
    const updated = await refreshSelectedGroup(groupId);
    const group = updated || selectedGroup;
    const activeCycle = (group.current_cycle || 0) + 1;
    await Promise.all([
      fetchMembers(groupId),
      fetchCycleStatus(groupId, activeCycle),
    ]);
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/groups/', {
        ...newGroup,
        contribution_amount: Number(newGroup.contribution_amount),
        member_count: Number(newGroup.member_count),
      });
      setGroups(prev => [...prev, res.data]);
      setSelectedGroup(res.data);
      setShowCreateForm(false);
      setNewGroup(EMPTY_GROUP);
    } catch (err) {
      alert('Failed to create group: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Restored: look up a user by their invite code (RC-XXXXXX), not by email.
  // The old email-search endpoint is deprecated and no longer returns email addresses.
  const searchUsers = async () => {
    if (!searchEmail.trim()) return;
    setIsSearching(true);
    setAvailableUsers([]);
    try {
      const res = await API.get(`/users/lookup?invite_code=${encodeURIComponent(searchEmail.trim().toUpperCase())}`);
      const memberIds = members.map(m => m.user_id);
      if (memberIds.includes(res.data.id)) {
        alert('This person is already a member of the group.');
      } else {
        setAvailableUsers([res.data]);
      }
    } catch (err) {
      const msg = err.response?.status === 404
        ? 'No user found with that invite code. Please check the code and try again.'
        : 'Lookup failed. Please try again.';
      alert(msg);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (userId) => {
    setAddingMemberId(userId);
    try {
      const guarantorParam = selectedGuarantor ? `&guarantor_user_id=${selectedGuarantor.user_id}` : '';
      await API.post(`/groups/${selectedGroup.id}/members/${userId}?is_admin=false${guarantorParam}`);
      // Refresh everything — group header stats, member list, and cycle
      // status/payment table — so the new member appears instantly without
      // needing a page refresh.
      await refreshAll(selectedGroup.id);
      setShowAddMember(false);
      setAddMemberTab(null);
      setSearchEmail('');
      setAvailableUsers([]);
      setSelectedGuarantor(null);
    } catch (err) {
      alert('Failed to add member: ' + (err.response?.data?.detail || err.message));
    } finally {
      setAddingMemberId(null);
    }
  };

  const handleAddOfflineMember = async (e) => {
    e.preventDefault();
    if (!offlineForm.name.trim()) return;
    setIsAddingOffline(true);
    try {
      await API.post(`/groups/${selectedGroup.id}/members/offline`, {
        name: offlineForm.name.trim(),
      });
      await refreshAll(selectedGroup.id);
      setShowAddMember(false);
      setAddMemberTab(null);
      setOfflineForm({ name: '' });
    } catch (err) {
      alert('Failed to add member: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsAddingOffline(false);
    }
  };

  const openPaymentModal = (member) => {
    setSelectedMember(member);
    setPaymentData({ ...EMPTY_PAYMENT, amount: selectedGroup?.contribution_amount || 0 });
    setShowPaymentModal(true);
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    setIsSubmittingPayment(true);
    const activeCycle = (selectedGroup.current_cycle || 0) + 1;
    const membershipId = selectedMember.member_id || selectedMember.id;
    if (!membershipId) { alert('Could not determine membership ID'); setIsSubmittingPayment(false); return; }
    try {
      await API.post(`/groups/${selectedGroup.id}/contributions`, {
        membership_id: membershipId,
        cycle_number: activeCycle,
        amount: Number(paymentData.amount),
        currency: selectedGroup.currency || 'USD',
        due_date: new Date().toISOString(),
        status: 'paid',
        payment_method: paymentData.payment_method,
        notes: paymentData.notes || null,
        transaction_reference: paymentData.transaction_reference || null,
      });
      setShowPaymentModal(false);
      setSelectedMember(null);
      setPaymentData(EMPTY_PAYMENT);
      await refreshAll(selectedGroup.id);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        alert('Validation failed:\n' + detail.map(d => `- ${d.loc?.join('.') || d.type}: ${d.msg}`).join('\n'));
      } else {
        alert('Failed: ' + (detail || err.message));
      }
    } finally { setIsSubmittingPayment(false); }
  };

  const processPayout = async (cycleNumber) => {
    if (!window.confirm(`Process payout for cycle ${cycleNumber}?`)) return;
    try {
      const res = await API.post(`/groups/${selectedGroup.id}/process-payout/${cycleNumber}`);
      alert(`✅ Payout processed!\n${res.data.recipient} received ${formatCurrency(res.data.amount, selectedGroup.currency)}`);
      await refreshAll(selectedGroup.id);
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const currency = selectedGroup?.currency || 'USD';
  const fmt = (n) => formatCurrency(n, currency);
  const activeCycleNumber = (selectedGroup?.current_cycle || 0) + 1;
  const isCurrentUserAdmin = members.some(m => m.user_id === user?.id && m.is_admin);
  const groupStatus = selectedGroup?.group_status || 'active';
  const statusStyle = STATUS_COLORS[groupStatus] || STATUS_COLORS.active;

  const closeAddMemberModal = () => {
    setShowAddMember(false);
    setAddMemberTab(null);
    setSearchEmail('');
    setAvailableUsers([]);
    setSelectedGuarantor(null);
    setOfflineForm({ name: '' });
  };

  if (loading) return (
    <div style={s.loadingWrap}>
      <div style={s.spinner} />
      <p style={{ color: '#64748b', marginTop: '1rem' }}>Loading your groups…</p>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={{ ...s.layout, flexDirection: mobile ? 'column' : 'row' }}>

        {/* SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', width: mobile ? '100%' : '260px', flexShrink: 0 }}>
          {mobile && (
            <div style={{ padding: '0.75rem 1rem', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
              <button onClick={() => setSidebarOpen(o => !o)} style={s.sidebarToggle}>
                {sidebarOpen ? '✕ Close' : '☰ My Groups'}
              </button>
            </div>
          )}
          <aside style={{ ...s.sidebar, display: mobile && !sidebarOpen ? 'none' : 'flex' }}>
            <div style={s.sidebarHeader}>
              <span style={s.sidebarTitle}>My Groups</span>
              <span style={s.sidebarCount}>{groups.length}</span>
            </div>
            <button onClick={() => setShowCreateForm(true)} style={s.newGroupBtn}>+ New Group</button>
            <button onClick={toggleShowArchived} style={s.archivedToggle}>
              {showArchived ? '👁️ Hide Archived' : '🗄️ Show Archived'}
            </button>
            <div style={s.groupList}>
              {groups.length === 0 ? <p style={s.emptyMsg}>No groups yet</p> : groups.map(g => (
                <div key={g.id} style={{ position: 'relative' }}>
                  <button onClick={() => { setSelectedGroup(g); setSidebarOpen(false); }}
                    style={{
                      ...s.groupItem,
                      ...(selectedGroup?.id === g.id ? s.groupItemActive : {}),
                      ...(g.is_archived ? { opacity: 0.6 } : {}),
                    }}>
                    <div style={s.groupItemName}>{g.name}{g.is_archived ? ' 🗄️' : ''}</div>
                    <div style={s.groupItemSub}>{formatCurrency(g.contribution_amount, g.currency)} · {g.contribution_period}</div>
                    <div style={s.groupItemMeta}>
                      <span style={{ ...s.badge, background: g.is_active ? '#dcfce7' : '#fee2e2', color: g.is_active ? '#166534' : '#991b1b' }}>
                        {g.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span style={s.cycleTag}>
                        Round {g.round_number || 1} · Cycle {(g.current_cycle || 0) + 1}
                        {g.is_locked ? ' 🔒' : ''}
                      </span>
                    </div>
                  </button>
                  {g.is_archived && (
                    <button onClick={() => unarchiveGroup(g.id)} style={s.unarchiveBtn} title="Unarchive">↩️</button>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </div>

        {/* MAIN */}
        <main style={s.main}>
          {!selectedGroup ? (
            <div style={s.emptyState}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔄</div>
              <h2 style={s.emptyTitle}>Welcome to RoscaApp</h2>
              <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Create a group or select one from the sidebar to get started.</p>
              <button onClick={() => setShowCreateForm(true)} style={s.ctaBtn}>Create Your First Group</button>
            </div>
          ) : (
            <>
              {/* GROUP HEADER */}
              <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <h2 style={s.groupName}>{selectedGroup.name}</h2>
                      <span style={{ background: statusStyle.bg, color: statusStyle.color, borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700', padding: '0.2rem 0.6rem', textTransform: 'capitalize' }}>
                        {groupStatus.replace('_', ' ')}
                      </span>
                    </div>
                    <p style={s.groupDesc}>{selectedGroup.description || 'No description'}</p>
                  </div>
                  {isCurrentUserAdmin && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => { setShowAddMember(true); setAddMemberTab(null); setSearchEmail(''); setAvailableUsers([]); }} style={s.addMemberBtn}>
                        + Add Member
                      </button>
                      {!selectedGroup.is_archived && (
                        <button onClick={() => archiveGroup(selectedGroup.id)} style={s.archiveBtn}>
                          🗄️ Archive
                        </button>
                      )}
                    </div>
                  )}
                </div>

               <div style={s.metaGrid}>
                  {[
                    { label: 'Contribution', value: fmt(selectedGroup.contribution_amount) },
                    { label: 'Frequency', value: selectedGroup.contribution_period, cap: true },
                    { label: 'Type', value: selectedGroup.rosca_type, cap: true },
                    { label: 'Currency', value: selectedGroup.currency },
                    { label: 'Members', value: `${members.length} / ${selectedGroup.member_count}` },
                    { label: 'Round', value: selectedGroup.round_number || 1 },
                    { label: 'Active Cycle', value: activeCycleNumber },
                    { label: 'Locked', value: selectedGroup.is_locked ? 'Yes 🔒' : 'No' },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={s.metaLabel}>{item.label}</div>
                      <div style={{ ...s.metaValue, textTransform: item.cap ? 'capitalize' : 'none' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CYCLE STATUS */}
              <div style={s.card}>
                {cycleStatus ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <h3 style={{ ...s.sectionTitle, marginBottom: 0 }}>
                        Round {cycleStatus.round_number} · Cycle #{cycleStatus.cycle_number} Status
                      </h3>
                      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        {cycleStatus.paid_count}/{cycleStatus.total_members} paid
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b', marginBottom: '0.4rem' }}>
                        <span>{cycleStatus.paid_count} of {cycleStatus.total_members} members paid</span>
                        <span style={{ fontWeight: '600' }}>{cycleStatus.completion_percentage?.toFixed(0) || 0}%</span>
                      </div>
                      <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '9999px', transition: 'width 0.4s ease', width: `${cycleStatus.completion_percentage || 0}%`, background: cycleStatus.completion_percentage >= 100 ? '#059669' : '#1a6b4a' }} />
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div style={s.cycleStats}>
                      {[
                        { label: 'Expected', value: fmt(cycleStatus.expected_total || 0) },
                        { label: 'Collected', value: fmt(cycleStatus.total_paid || 0), color: '#059669' },
                        { label: 'Remaining', value: fmt(cycleStatus.remaining_amount || 0), color: '#dc2626' },
                        { label: 'Payout', value: cycleStatus.payout_status || 'pending', cap: true },
                      ].map(s2 => (
                        <div key={s2.label}>
                          <div style={s.cycleStatLabel}>{s2.label}</div>
                          <div style={{ fontWeight: '700', fontSize: '0.95rem', color: s2.color || '#0f172a', textTransform: s2.cap ? 'capitalize' : 'none' }}>{s2.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Next recipient */}
                    {cycleStatus.next_recipient && (
                      <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span>🎯 Next recipient: <strong>{cycleStatus.next_recipient.name}</strong></span>
                        <span style={{ color: '#64748b', fontSize: '0.82rem' }}>{cycleStatus.next_recipient.email}</span>
                      </div>
                    )}

                    {/* All paid banner */}
                    {cycleStatus.paid_count === cycleStatus.total_members && cycleStatus.payout_status !== 'paid' && (
                      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <span style={{ color: '#166534', fontWeight: '600', fontSize: '0.9rem' }}>✅ All members paid for cycle {cycleStatus.cycle_number}!</span>
                        <button onClick={() => processPayout(cycleStatus.cycle_number)} style={{ padding: '0.5rem 1.25rem', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}>
                          Process Payout
                        </button>
                      </div>
                    )}

                    {cycleStatus.payout_status === 'paid' && (
                      <div style={{ background: '#f0f9ff', border: '1px solid #7dd3fc', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                        <span style={{ color: '#0369a1', fontWeight: '600' }}>💰 Cycle {cycleStatus.cycle_number} payout done! Next: #{activeCycleNumber + 1}</span>
                      </div>
                    )}

                    {/* Member payment table */}
                    <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.75rem', marginTop: '1.25rem' }}>Member Payment Status</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={s.table}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            <th style={s.th}>Member</th>
                            <th style={s.th}>Order</th>
                            <th style={s.th}>Status</th>
                            <th style={s.th}>Paid Date</th>
                            <th style={s.th}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cycleStatus.members?.map(m => (
                            <tr key={m.member_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={s.td}>
                                <div style={{ fontWeight: '500' }}>{m.name}</div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{m.email}</div>
                              </td>
                              <td style={s.td}>#{m.payout_order}</td>
                              <td style={s.td}>
                                <span style={{ ...s.pill, color: m.has_paid ? '#166534' : '#991b1b', background: m.has_paid ? '#dcfce7' : '#fee2e2' }}>
                                  {m.has_paid ? 'Paid' : 'Pending'}
                                </span>
                              </td>
                              <td style={s.td}>{m.paid_date ? formatDate(m.paid_date) : '—'}</td>
                              <td style={s.td}>
                                {!m.has_paid && isCurrentUserAdmin && (
                                  <button onClick={() => openPaymentModal(m)} style={s.recordBtn}>Record Payment</button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p style={s.emptyMsg}>Loading cycle data…</p>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* MODALS */}

      {/* Create Group */}
      {showCreateForm && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>Create New Group</h3>
            <form onSubmit={handleCreateGroup}>
              <div style={s.field}><label style={s.label}>Group Name *</label>
                <input type="text" value={newGroup.name} required onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} style={s.input} placeholder="e.g. Family Savings Circle" /></div>
              <div style={s.field}><label style={s.label}>Description</label>
                <textarea value={newGroup.description} onChange={e => setNewGroup({ ...newGroup, description: e.target.value })} style={{ ...s.input, minHeight: '70px', resize: 'vertical' }} /></div>
              <div style={s.fieldRow}>
                <div style={{ flex: 1 }}><label style={s.label}>Amount *</label>
                  <input type="number" value={newGroup.contribution_amount} required min="1" step="0.01" onChange={e => setNewGroup({ ...newGroup, contribution_amount: e.target.value })} style={s.input} /></div>
                <div style={{ flex: 1 }}><label style={s.label}>Currency</label>
                  <select value={newGroup.currency} onChange={e => setNewGroup({ ...newGroup, currency: e.target.value })} style={s.input}>
                    {ALL_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}</select></div>
              </div>
              <div style={s.fieldRow}>
                <div style={{ flex: 1 }}><label style={s.label}>Period</label>
                  <select value={newGroup.contribution_period} onChange={e => setNewGroup({ ...newGroup, contribution_period: e.target.value })} style={s.input}>
                    <option value="daily">Daily</option><option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-Weekly</option><option value="monthly">Monthly</option></select></div>
                <div style={{ flex: 1 }}><label style={s.label}>Max Members (2–50)</label>
                  <input type="number" value={newGroup.member_count} required min="2" max="50" onChange={e => setNewGroup({ ...newGroup, member_count: e.target.value })} style={s.input} /></div>
              </div>
              <div style={s.field}><label style={s.label}>ROSCA Type</label>
                <select value={newGroup.rosca_type} onChange={e => setNewGroup({ ...newGroup, rosca_type: e.target.value })} style={s.input}>
                  <option value="fixed">Fixed Order</option><option value="random">Random (Lottery)</option></select></div>
              <div style={s.modalActions}>
                <button type="button" onClick={() => setShowCreateForm(false)} style={s.cancelBtn}>Cancel</button>
                <button type="submit" style={s.submitBtn}>Create Group</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member */}
      {showAddMember && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>Add Member to {selectedGroup?.name}</h3>

            {addMemberTab === null ? (
              /* Step 1: Yes/No prompt — decides which form to show next */
              <div>
                <p style={{ fontSize: '0.9rem', color: '#334155', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                  Is this person already registered on <strong>RoscaApp.com</strong>?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setAddMemberTab('code')} style={s.choiceBtnYes}>
                    ✅ Yes, they have an account
                  </button>
                  <button type="button" onClick={() => setAddMemberTab('offline')} style={s.choiceBtnNo}>
                    ➕ No, they don't have an account
                  </button>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '1rem', lineHeight: 1.5 }}>
                  Not sure? Choose <strong>No</strong> — you can still add them and start tracking their contributions right away.
                </p>
                <div style={s.modalActions}>
                  <button type="button" onClick={closeAddMemberModal} style={s.cancelBtn}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setAddMemberTab(null)}
                  style={{ background: 'none', border: 'none', color: '#1a6b4a', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', padding: 0, marginBottom: '1.1rem' }}
                >
                  ← Change answer
                </button>

                {addMemberTab === 'code' ? (
                  <>
                    <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: '8px', padding: '0.875rem', marginBottom: '1rem' }}>
                      <p style={{ margin: '0 0 0.5rem', fontWeight: '600', fontSize: '0.85rem', color: '#854d0e' }}>🛡️ Select a Guarantor <span style={{ fontWeight: '400' }}>(optional)</span></p>
                      <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', color: '#92400e' }}>If left blank, you (admin) will be assigned as guarantor.</p>
                      {selectedGuarantor ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #fde047' }}>
                          <div><div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{selectedGuarantor.user_name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedGuarantor.user_email}</div></div>
                          <button onClick={() => setSelectedGuarantor(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>✕</button>
                        </div>
                      ) : (
                        <select onChange={e => { const m = members.find(m => m.user_id === e.target.value); setSelectedGuarantor(m || null); }} style={{ ...s.input, marginBottom: 0 }} defaultValue="">
                          <option value="">— Leave blank to use admin —</option>
                          {members.filter(m => m.user_id).map(m => <option key={m.user_id} value={m.user_id}>{m.user_name} ({m.user_email})</option>)}
                        </select>
                      )}
                    </div>
                    <div style={s.field}>
                      <label style={s.label}>Member Invite Code</label>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 0.5rem 0' }}>
                        Ask the person to share their invite code from their Profile page (e.g. RC-A3K7PQ)
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="text" value={searchEmail} placeholder="e.g. RC-A3K7PQ"
                          onChange={e => setSearchEmail(e.target.value.toUpperCase())}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchUsers())}
                          style={{ ...s.input, flex: 1, marginBottom: 0, letterSpacing: '0.05em', fontFamily: 'monospace' }} />
                        <button onClick={searchUsers} disabled={isSearching} style={s.submitBtn}>{isSearching ? '…' : 'Look Up'}</button>
                      </div>
                    </div>
                    {availableUsers.length > 0 && (
                      <div style={{ marginTop: '1rem' }}>
                        {availableUsers.map(u => (
                          <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              {u.avatar_url
                                ? <img src={u.avatar_url} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                                : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#667eea', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1rem' }}>{u.full_name?.[0]?.toUpperCase()}</div>
                              }
                              <div>
                                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{u.full_name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>✓ User found</div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddMember(u.id)}
                              disabled={addingMemberId === u.id}
                              style={{
                                ...s.submitBtn, padding: '0.4rem 1rem',
                                opacity: addingMemberId === u.id ? 0.7 : 1,
                                cursor: addingMemberId === u.id ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {addingMemberId === u.id ? 'Adding…' : 'Add'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {availableUsers.length === 0 && searchEmail && !isSearching && <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.5rem' }}>No users found.</p>}

                    <div style={s.modalActions}>
                      <button onClick={closeAddMemberModal} style={s.cancelBtn}>Close</button>
                    </div>
                  </>
                ) : (
                  <form onSubmit={handleAddOfflineMember}>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 1rem 0' }}>
                      For members who aren't on RoscaApp yet. They'll show up in the payout order and
                      you can record their contributions directly — no account needed.
                    </p>
                    <div style={s.field}>
                      <label style={s.label}>Name *</label>
                      <input type="text" required value={offlineForm.name}
                        onChange={e => setOfflineForm({ ...offlineForm, name: e.target.value })}
                        placeholder="e.g. Auntie Comfort" style={s.input} />
                    </div>
                    <div style={s.modalActions}>
                      <button type="button" onClick={closeAddMemberModal} style={s.cancelBtn}>Cancel</button>
                      <button type="submit" disabled={isAddingOffline || !offlineForm.name.trim()} style={{ ...s.submitBtn, opacity: isAddingOffline ? 0.7 : 1 }}>
                        {isAddingOffline ? 'Adding…' : 'Add Member'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Record Payment */}
      {showPaymentModal && selectedMember && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>Record Payment — {selectedMember.name}</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem' }}>Cycle #{activeCycleNumber}</p>
            <form onSubmit={submitPayment}>
              <div style={s.field}><label style={s.label}>Amount ({currency})</label>
                <input type="number" value={paymentData.amount} required step="0.01" min="0.01"
                  onChange={e => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })} style={s.input} /></div>
              <div style={s.field}><label style={s.label}>Payment Method</label>
                <select value={paymentData.payment_method} onChange={e => setPaymentData({ ...paymentData, payment_method: e.target.value })} style={s.input}>
                  <option value="cash">Cash</option><option value="mobile_money">Mobile Money</option>
                  <option value="bank_transfer">Bank Transfer</option><option value="card">Card</option></select></div>
              <div style={s.field}><label style={s.label}>Transaction Reference (optional)</label>
                <input type="text" value={paymentData.transaction_reference}
                  onChange={e => setPaymentData({ ...paymentData, transaction_reference: e.target.value })} style={s.input} placeholder="e.g. TXN-12345" /></div>
              <div style={s.field}><label style={s.label}>Notes (optional)</label>
                <textarea value={paymentData.notes} onChange={e => setPaymentData({ ...paymentData, notes: e.target.value })}
                  style={{ ...s.input, minHeight: '70px', resize: 'vertical' }} /></div>
              <div style={s.modalActions}>
                <button type="button" onClick={() => { setShowPaymentModal(false); setSelectedMember(null); setPaymentData(EMPTY_PAYMENT); }} style={s.cancelBtn} disabled={isSubmittingPayment}>Cancel</button>
                <button type="submit" style={s.submitBtn} disabled={isSubmittingPayment}>{isSubmittingPayment ? 'Recording…' : 'Record Payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; }`}</style>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f1f5f9', fontFamily: "'DM Sans', system-ui, sans-serif" },
  layout: { display: 'flex', minHeight: 'calc(100vh - 64px)' },
  sidebar: { background: 'white', borderRight: '1px solid #e2e8f0', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  sidebarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sidebarTitle: { fontWeight: '700', fontSize: '0.9rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' },
  sidebarCount: { background: '#1a6b4a', color: 'white', borderRadius: '9999px', fontSize: '0.75rem', padding: '0.1rem 0.5rem', fontWeight: '600' },
  sidebarToggle: { background: '#1a6b4a', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' },
  newGroupBtn: { width: '100%', padding: '0.6rem', background: '#1a6b4a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' },
  groupList: { display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' },
  groupItem: { padding: '0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', textAlign: 'left' },
  groupItemActive: { background: '#1a6b4a', border: '1px solid #1a6b4a', color: 'white' },
  groupItemName: { fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.2rem' },
  groupItemSub: { fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.4rem' },
  groupItemMeta: { display: 'flex', gap: '0.4rem', alignItems: 'center' },
  badge: { fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '9999px', fontWeight: '600' },
  cycleTag: { fontSize: '0.65rem', color: '#94a3b8' },
  main: { flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  card: { background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  emptyState: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem' },
  emptyTitle: { fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' },
  ctaBtn: { padding: '0.75rem 2rem', background: '#1a6b4a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem' },
  groupName: { fontSize: '1.4rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.25rem' },
  groupDesc: { color: '#64748b', fontSize: '0.875rem' },
  addMemberBtn: { padding: '0.55rem 1.1rem', background: '#1a6b4a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginTop: '1rem' },
  metaLabel: { fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600', marginBottom: '0.2rem' },
  metaValue: { fontWeight: '700', fontSize: '0.95rem', color: '#0f172a' },
  sectionTitle: { fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '1rem' },
  cycleStats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' },
  cycleStatLabel: { fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', marginBottom: '0.2rem' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  th: { padding: '0.65rem 0.875rem', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' },
  td: { padding: '0.65rem 0.875rem', color: '#334155', verticalAlign: 'middle' },
  pill: { display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '600' },
  recordBtn: { padding: '0.25rem 0.7rem', background: '#1a6b4a', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modal: { background: 'white', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '1.5rem' },
  field: { marginBottom: '1rem' },
  fieldRow: { display: 'flex', gap: '1rem', marginBottom: '1rem' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.35rem' },
  input: { width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.9rem', color: '#0f172a', outline: 'none', marginBottom: 0 },
  modalActions: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' },
  cancelBtn: { padding: '0.6rem 1.25rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' },
  submitBtn: { padding: '0.6rem 1.25rem', background: '#1a6b4a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' },
  choiceBtnYes: { padding: '0.9rem 1rem', background: '#f0fdf4', color: '#166534', border: '1.5px solid #bbf7d0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', textAlign: 'left' },
  choiceBtnNo: { padding: '0.9rem 1rem', background: '#f8fafc', color: '#334155', border: '1.5px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', textAlign: 'left' },
  userResult: { width: '100%', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', marginBottom: '0.5rem' },
  loadingWrap: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  spinner: { width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTop: '3px solid #1a6b4a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  emptyMsg: { color: '#94a3b8', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' },
  archivedToggle: { width: '100%', padding: '0.5rem', background: 'transparent', color: '#64748b', border: '1px dashed #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' },
  unarchiveBtn: { position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', width: '26px', height: '26px', cursor: 'pointer', fontSize: '0.8rem' },
  archiveBtn: { padding: '0.55rem 1.1rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' },
  
};
