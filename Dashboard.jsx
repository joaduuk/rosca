import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';


function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

const CURRENCIES = ['USD','EUR','GBP','NGN','KES','GHS','ZAR','INR','BRL','JPY'];

function formatCurrency(amount, currencyCode = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${Number(amount).toFixed(2)}`;
  }
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

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [cycleStatus, setCycleStatus] = useState(null);
  const [payoutSchedule, setPayoutSchedule] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Form state
  const [newGroup, setNewGroup] = useState(EMPTY_GROUP);
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedGuarantor, setSelectedGuarantor] = useState(null);
  const [paymentData, setPaymentData] = useState(EMPTY_PAYMENT);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const [activeTab, setActiveTab] = useState('cycle');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mobile = useIsMobile();

  useEffect(() => { fetchGroups(); }, []);

  // When selectedGroup changes, reload all data for it
  useEffect(() => {
    if (selectedGroup) {
      loadGroupData(selectedGroup);
    }
  }, [selectedGroup?.id]);

  const loadGroupData = async (group) => {
    const activeCycle = (group.current_cycle || 0) + 1;
    await Promise.all([
      fetchMembers(group.id),
      fetchContributions(group.id),
      fetchCycleStatus(group.id, activeCycle),
      fetchPayoutSchedule(group.id),
      fetchSummary(group.id),
    ]);
  };

  const fetchGroups = async () => {
    try {
      const res = await API.get('/groups/');
      setGroups(res.data);
      if (res.data.length > 0) setSelectedGroup(res.data[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Refresh a single group's data from server (gets updated current_cycle etc.)
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

  const fetchContributions = async (id) => {
    try { const r = await API.get(`/groups/${id}/contributions`); setContributions(r.data); }
    catch { setContributions([]); }
  };

  const fetchCycleStatus = async (id, cycle) => {
    try { const r = await API.get(`/groups/${id}/cycle-status?cycle_number=${cycle}`); setCycleStatus(r.data); }
    catch (e) { console.error('cycle-status error:', e); setCycleStatus(null); }
  };

  const fetchPayoutSchedule = async (id) => {
    try { const r = await API.get(`/groups/${id}/payout-schedule`); setPayoutSchedule(r.data); }
    catch { setPayoutSchedule([]); }
  };

  const fetchSummary = async (id) => {
    try { const r = await API.get(`/groups/${id}/summary`); setSummary(r.data); }
    catch { setSummary(null); }
  };

  // Full refresh: re-fetch group (gets new current_cycle), then all sub-data
  const refreshAll = async (groupId) => {
    const updated = await refreshSelectedGroup(groupId);
    const group = updated || selectedGroup;
    const activeCycle = (group.current_cycle || 0) + 1;
    await Promise.all([
      fetchMembers(groupId),
      fetchContributions(groupId),
      fetchCycleStatus(groupId, activeCycle),
      fetchPayoutSchedule(groupId),
      fetchSummary(groupId),
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

  const searchUsers = async () => {
    if (!searchEmail.trim()) return;
    setIsSearching(true);
    try {
      const res = await API.get(`/users/search?email=${encodeURIComponent(searchEmail)}`);
      const memberIds = members.map(m => m.user_id);
      setAvailableUsers(res.data.filter(u => !memberIds.includes(u.id)));
    } catch { alert('Search failed'); }
    finally { setIsSearching(false); }
  };

  const handleAddMember = async (userId) => {
    try {
      const guarantorParam = selectedGuarantor
        ? `&guarantor_user_id=${selectedGuarantor.user_id}`
        : '';
      await API.post(`/groups/${selectedGroup.id}/members/${userId}?is_admin=false${guarantorParam}`);
      await fetchMembers(selectedGroup.id);
      setShowAddMember(false);
      setSearchEmail('');
      setAvailableUsers([]);
      setSelectedGuarantor(null);
    } catch (err) {
      alert('Failed to add member: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await API.delete(`/groups/${selectedGroup.id}/members/${userId}`);
      await fetchMembers(selectedGroup.id);
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Is the logged-in user an admin of the selected group?
  const isCurrentUserAdmin = members.some(m => m.user_id === user?.id && m.is_admin);

  const handleReorder = async (userId, direction) => {
    try {
      await API.put(`/groups/${selectedGroup.id}/members/${userId}/reorder?direction=${direction}`);
      await fetchMembers(selectedGroup.id);
    } catch (err) {
      alert('Failed to reorder: ' + (err.response?.data?.detail || err.message));
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

    // Determine the active (next) cycle number
    const activeCycle = (selectedGroup.current_cycle || 0) + 1;

    // member_id in cycleStatus members is the Membership.id
    const membershipId = selectedMember.member_id || selectedMember.id;
    if (!membershipId) {
      alert('Could not determine membership ID');
      setIsSubmittingPayment(false);
      return;
    }

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

      // Refresh everything — important: also refreshes group's current_cycle
      await refreshAll(selectedGroup.id);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        alert('Validation failed:\n' + detail.map(d => `- ${d.loc?.join('.') || d.type}: ${d.msg}`).join('\n'));
      } else {
        alert('Failed: ' + (detail || err.message));
      }
    } finally {
      setIsSubmittingPayment(false);
    }
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

  // Determine which cycle is currently active for display
  const activeCycleNumber = (selectedGroup?.current_cycle || 0) + 1;

  if (loading) return (
    <div style={styles.loadingWrap}>
      <div style={styles.spinner} />
      <p style={{ color: '#64748b', marginTop: '1rem' }}>Loading your groups…</p>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={{ ...styles.layout, flexDirection: mobile ? 'column' : 'row' }}>

        {/* ── SIDEBAR ── */}
        <div style={{ display: 'flex', flexDirection: 'column', width: mobile ? '100%' : '280px', flexShrink: 0 }}>
          {mobile && (
            <div style={{ padding: '0.75rem 1rem', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
              <button onClick={() => setSidebarOpen(o => !o)} style={{ background: '#1a6b4a', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}>
                {sidebarOpen ? '✕ Close Groups' : '☰ My Groups'}
              </button>
            </div>
          )}
          <aside style={{ ...styles.sidebar, width: '100%', display: mobile && !sidebarOpen ? 'none' : 'flex' }}>
          <div style={styles.sidebarHeader}>
            <span style={styles.sidebarTitle}>My Groups</span>
            <span style={styles.sidebarCount}>{groups.length}</span>
          </div>

          <button onClick={() => setShowCreateForm(true)} style={styles.newGroupBtn}>
            + New Group
          </button>

          <div style={styles.groupList}>
            {groups.length === 0 ? (
              <p style={styles.emptyMsg}>No groups yet</p>
            ) : groups.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGroup(g)}
                style={{
                  ...styles.groupItem,
                  ...(selectedGroup?.id === g.id ? styles.groupItemActive : {})
                }}
              >
                <div style={styles.groupItemName}>{g.name}</div>
                <div style={styles.groupItemSub}>
                  {formatCurrency(g.contribution_amount, g.currency)} · {g.contribution_period}
                </div>
                <div style={styles.groupItemMeta}>
                  <span style={{
                    ...styles.badge,
                    background: g.is_active ? '#dcfce7' : '#fee2e2',
                    color: g.is_active ? '#166534' : '#991b1b'
                  }}>
                    {g.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span style={styles.cycleTag}>Cycle {(g.current_cycle || 0) + 1}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>
        </div>

        {/* ── MAIN ── */}
        <main style={styles.main}>
          {!selectedGroup ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🔄</div>
              <h2 style={styles.emptyTitle}>Welcome to RoscaApp</h2>
              <p style={styles.emptyText}>Create a group or select one from the sidebar to get started.</p>
              <button onClick={() => setShowCreateForm(true)} style={styles.ctaBtn}>
                Create Your First Group
              </button>
            </div>
          ) : (
            <>
              {/* ── GROUP HEADER ── */}
              <div style={styles.card}>
                <div style={styles.groupHeader}>
                  <div>
                    <h2 style={styles.groupName}>{selectedGroup.name}</h2>
                    <p style={styles.groupDesc}>{selectedGroup.description || 'No description'}</p>
                  </div>
                  <button onClick={() => { setShowAddMember(true); setSearchEmail(''); setAvailableUsers([]); }} style={styles.addMemberBtn}>
                    + Add Member
                  </button>
                </div>

                <div style={styles.metaGrid}>
                  {[
                    { label: 'Contribution', value: fmt(selectedGroup.contribution_amount) },
                    { label: 'Frequency', value: selectedGroup.contribution_period, capitalize: true },
                    { label: 'Type', value: selectedGroup.rosca_type, capitalize: true },
                    { label: 'Currency', value: selectedGroup.currency },
                    { label: 'Members', value: `${members.length} / ${selectedGroup.member_count}` },
                    { label: 'Created', value: formatDate(selectedGroup.created_at) },
                    { label: 'Active Cycle', value: activeCycleNumber },
                    { label: 'Cycles Done', value: selectedGroup.total_cycles_completed || 0 },
                  ].map(item => (
                    <div key={item.label} style={styles.metaItem}>
                      <div style={styles.metaLabel}>{item.label}</div>
                      <div style={{ ...styles.metaValue, textTransform: item.capitalize ? 'capitalize' : 'none' }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── SUMMARY CARDS ── */}
              {summary && (
                <div style={styles.summaryGrid}>
                  {[
                    { label: 'Total Collected', value: fmt(summary.total_collected || 0), color: '#059669' },
                    { label: 'Total Paid Out', value: fmt(summary.total_paid_out || 0), color: '#dc2626' },
                    { label: 'Current Balance', value: fmt(summary.balance || 0), color: '#2563eb' },
                    { label: 'Cycles Completed', value: summary.total_cycles_completed || 0, color: '#1a6b4a' },
                  ].map(s => (
                    <div key={s.label} style={styles.summaryCard}>
                      <div style={styles.summaryLabel}>{s.label}</div>
                      <div style={{ ...styles.summaryValue, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── TABS ── */}
              <div style={styles.tabBar}>
                {['cycle', 'members', 'payouts', 'contributions'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    ...styles.tab,
                    ...(activeTab === tab ? styles.tabActive : {})
                  }}>
                    {{ cycle: '📊 Cycle Status', members: '👥 Members', payouts: '💰 Payouts', contributions: '📋 Contributions' }[tab]}
                  </button>
                ))}
              </div>

              {/* ── TAB: CYCLE STATUS ── */}
              {activeTab === 'cycle' && (
                <div style={styles.card}>
                  {cycleStatus ? (
                    <>
                      <h3 style={styles.sectionTitle}>
                        Cycle #{cycleStatus.cycle_number} Status
                        <span style={{ fontSize: '0.75rem', fontWeight: '400', color: '#64748b', marginLeft: '0.75rem' }}>
                          ({cycleStatus.paid_count}/{cycleStatus.total_members} paid)
                        </span>
                      </h3>

                      {/* Progress */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <div style={styles.progressLabels}>
                          <span>{cycleStatus.paid_count} of {cycleStatus.total_members} members paid</span>
                          <span style={{ fontWeight: '600' }}>{cycleStatus.completion_percentage?.toFixed(0) || 0}%</span>
                        </div>
                        <div style={styles.progressTrack}>
                          <div style={{
                            ...styles.progressFill,
                            width: `${cycleStatus.completion_percentage || 0}%`,
                            background: cycleStatus.completion_percentage >= 100 ? '#059669' : '#1a6b4a'
                          }} />
                        </div>
                      </div>

                      {/* Cycle stats */}
                      <div style={styles.cycleStats}>
                        {[
                          { label: 'Expected Total', value: fmt(cycleStatus.expected_total || 0) },
                          { label: 'Paid So Far', value: fmt(cycleStatus.total_paid || 0), color: '#059669' },
                          { label: 'Remaining', value: fmt(cycleStatus.remaining_amount || 0), color: '#dc2626' },
                          { label: 'Payout', value: cycleStatus.payout_status || 'pending', capitalize: true },
                        ].map(s => (
                          <div key={s.label} style={styles.cycleStat}>
                            <div style={styles.cycleStatLabel}>{s.label}</div>
                            <div style={{ ...styles.cycleStatValue, color: s.color || '#0f172a', textTransform: s.capitalize ? 'capitalize' : 'none' }}>
                              {s.value}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Next recipient info */}
                      {cycleStatus.next_recipient && (
                        <div style={styles.recipientBanner}>
                          <span>🎯 Next payout recipient: <strong>{cycleStatus.next_recipient.name}</strong></span>
                          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{cycleStatus.next_recipient.email}</span>
                        </div>
                      )}

                      {/* All paid — show process payout banner */}
                      {cycleStatus.paid_count === cycleStatus.total_members &&
                       cycleStatus.payout_status !== 'paid' && (
                        <div style={styles.payoutBanner}>
                          <span style={styles.payoutBannerText}>✅ All members have paid for cycle {cycleStatus.cycle_number}!</span>
                          <button onClick={() => processPayout(cycleStatus.cycle_number)} style={styles.processBtn}>
                            Process Payout
                          </button>
                        </div>
                      )}

                      {cycleStatus.payout_status === 'paid' && (
                        <div style={{ ...styles.payoutBanner, background: '#f0f9ff', borderColor: '#7dd3fc' }}>
                          <span style={{ color: '#0369a1', fontWeight: '600' }}>
                            💰 Cycle {cycleStatus.cycle_number} payout completed! Next cycle: #{activeCycleNumber + 1}
                          </span>
                        </div>
                      )}

                      {/* Member payment table */}
                      <h4 style={{ ...styles.sectionTitle, fontSize: '0.95rem', marginTop: '1.5rem' }}>Member Payment Status</h4>
                      <div style={styles.tableWrap}>
                        <table style={styles.table}>
                          <thead>
                            <tr style={styles.thead}>
                              <th style={styles.th}>Member</th>
                              <th style={styles.th}>Order</th>
                              <th style={styles.th}>Status</th>
                              <th style={styles.th}>Paid Date</th>
                              <th style={styles.th}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cycleStatus.members?.map(m => (
                              <tr key={m.member_id} style={styles.tr}>
                                <td style={styles.td}>
                                  <div style={{ fontWeight: '500' }}>{m.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{m.email}</div>
                                </td>
                                <td style={styles.td}>#{m.payout_order}</td>
                                <td style={styles.td}>
                                  <span style={{ ...styles.pill, color: m.has_paid ? '#166534' : '#991b1b', background: m.has_paid ? '#dcfce7' : '#fee2e2' }}>
                                    {m.has_paid ? 'Paid' : 'Pending'}
                                  </span>
                                </td>
                                <td style={styles.td}>{m.paid_date ? formatDate(m.paid_date) : '—'}</td>
                                <td style={styles.td}>
                                  {!m.has_paid && (
                                    <button onClick={() => openPaymentModal(m)} style={styles.recordBtn}>
                                      Record Payment
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <p style={styles.emptyMsg}>Loading cycle data…</p>
                  )}
                </div>
              )}

              {/* ── TAB: MEMBERS ── */}
              {activeTab === 'members' && (
                <div style={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>Members ({members.length})</h3>
                    {isCurrentUserAdmin && (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        ↑↓ Use arrows to reorder payout sequence
                      </span>
                    )}
                  </div>
                  {members.length === 0 ? (
                    <p style={styles.emptyMsg}>No members yet. Click "Add Member" above.</p>
                  ) : (
                    <div style={styles.tableWrap}>
                      <table style={styles.table}>
                        <thead>
                          <tr style={styles.thead}>
                            <th style={styles.th}>Payout Order</th>
                            <th style={styles.th}>Name</th>
                            <th style={styles.th}>Email</th>
                            <th style={styles.th}>Joined</th>
                            <th style={styles.th}>Role</th>
                            <th style={styles.th}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...members].sort((a, b) => (a.payout_order || 0) - (b.payout_order || 0)).map((m, index, sorted) => (
                            <tr key={m.id} style={styles.tr}>
                              <td style={styles.td}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={styles.orderBadge}>#{m.payout_order || '—'}</span>
                                  {isCurrentUserAdmin && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <button
                                        onClick={() => handleReorder(m.user_id, 'up')}
                                        disabled={index === 0}
                                        style={{ ...styles.arrowBtn, opacity: index === 0 ? 0.3 : 1 }}
                                        title="Move up"
                                      >▲</button>
                                      <button
                                        onClick={() => handleReorder(m.user_id, 'down')}
                                        disabled={index === sorted.length - 1}
                                        style={{ ...styles.arrowBtn, opacity: index === sorted.length - 1 ? 0.3 : 1 }}
                                        title="Move down"
                                      >▼</button>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td style={styles.td}>{m.user_name || m.name}</td>
                              <td style={styles.td}>{m.user_email || m.email}</td>
                              <td style={styles.td}>{formatDate(m.joined_at)}</td>
                              <td style={styles.td}>
                                <span style={{ ...styles.pill, background: m.is_admin ? '#ede9fe' : '#f0fdf4', color: m.is_admin ? '#5b21b6' : '#166534' }}>
                                  {m.is_admin ? 'Admin' : 'Member'}
                                </span>
                              </td>
                              <td style={styles.td}>
                                {!m.is_admin && (
                                  <button onClick={() => handleRemoveMember(m.user_id)} style={styles.removeBtn}>
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

              {/* ── TAB: PAYOUTS ── */}
              {activeTab === 'payouts' && (
                <div style={styles.card}>
                  <h3 style={styles.sectionTitle}>Payout History</h3>
                  {payoutSchedule.length === 0 ? (
                    <div style={styles.emptyMsgBlock}>
                      <p>No payouts yet.</p>
                      <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                        Payouts are automatically processed once all members contribute in a cycle.
                      </p>
                    </div>
                  ) : (
                    <div style={styles.tableWrap}>
                      <table style={styles.table}>
                        <thead>
                          <tr style={styles.thead}>
                            <th style={styles.th}>Cycle</th>
                            <th style={styles.th}>Recipient</th>
                            <th style={styles.th}>Amount</th>
                            <th style={styles.th}>Date</th>
                            <th style={styles.th}>Status</th>
                            <th style={styles.th}>Contributions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payoutSchedule.map(s => (
                            <tr key={s.id} style={styles.tr}>
                              <td style={styles.td}>Cycle {s.cycle_number}</td>
                              <td style={styles.td}>{s.recipient_name}</td>
                              <td style={styles.td}>{fmt(s.amount)}</td>
                              <td style={styles.td}>{formatDate(s.payout_date)}</td>
                              <td style={styles.td}>
                                <span style={{
                                  ...styles.pill,
                                  background: s.status === 'paid' ? '#dcfce7' : s.status === 'scheduled' ? '#fef9c3' : '#fee2e2',
                                  color: s.status === 'paid' ? '#166534' : s.status === 'scheduled' ? '#854d0e' : '#991b1b',
                                  textTransform: 'capitalize'
                                }}>
                                  {s.status}
                                </span>
                              </td>
                              <td style={styles.td}>
                                {s.paid_count}/{s.contributions_count} {s.all_paid && '✅'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: CONTRIBUTIONS ── */}
              {activeTab === 'contributions' && (
                <div style={styles.card}>
                  <h3 style={styles.sectionTitle}>All Contributions</h3>
                  {contributions.length === 0 ? (
                    <p style={styles.emptyMsg}>No contributions yet. Record payments from the Cycle Status tab.</p>
                  ) : (
                    <div style={styles.tableWrap}>
                      <table style={styles.table}>
                        <thead>
                          <tr style={styles.thead}>
                            <th style={styles.th}>Date</th>
                            <th style={styles.th}>Member</th>
                            <th style={styles.th}>Cycle</th>
                            <th style={styles.th}>Amount</th>
                            <th style={styles.th}>Method</th>
                            <th style={styles.th}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contributions.map(c => (
                            <tr key={c.id} style={styles.tr}>
                              <td style={styles.td}>{formatDate(c.paid_date || c.due_date)}</td>
                              <td style={styles.td}>{c.member_name || '—'}</td>
                              <td style={styles.td}>#{c.cycle_number}</td>
                              <td style={styles.td}>{fmt(c.amount)}</td>
                              <td style={{ ...styles.td, textTransform: 'capitalize' }}>{c.payment_method || '—'}</td>
                              <td style={styles.td}>
                                <span style={{ ...styles.pill, background: c.status === 'paid' ? '#dcfce7' : '#fee2e2', color: c.status === 'paid' ? '#166534' : '#991b1b' }}>
                                  {c.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ══ MODALS ══ */}

      {/* Create Group Modal */}
      {showCreateForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Create New Group</h3>
            <form onSubmit={handleCreateGroup}>
              <div style={styles.field}>
                <label style={styles.label}>Group Name *</label>
                <input type="text" value={newGroup.name} required
                  onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                  style={styles.input} placeholder="e.g. Family Savings Circle" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <textarea value={newGroup.description} onChange={e => setNewGroup({ ...newGroup, description: e.target.value })}
                  style={{ ...styles.input, minHeight: '70px', resize: 'vertical' }} />
              </div>
              <div style={styles.fieldRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Contribution Amount *</label>
                  <input type="number" value={newGroup.contribution_amount} required min="1" step="0.01"
                    onChange={e => setNewGroup({ ...newGroup, contribution_amount: e.target.value })}
                    style={styles.input} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Currency</label>
                  <select value={newGroup.currency} onChange={e => setNewGroup({ ...newGroup, currency: e.target.value })} style={styles.input}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={styles.fieldRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Period</label>
                  <select value={newGroup.contribution_period} onChange={e => setNewGroup({ ...newGroup, contribution_period: e.target.value })} style={styles.input}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Max Members (2–50)</label>
                  <input type="number" value={newGroup.member_count} required min="2" max="50"
                    onChange={e => setNewGroup({ ...newGroup, member_count: e.target.value })}
                    style={styles.input} />
                </div>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>ROSCA Type</label>
                <select value={newGroup.rosca_type} onChange={e => setNewGroup({ ...newGroup, rosca_type: e.target.value })} style={styles.input}>
                  <option value="fixed">Fixed Order (by payout_order)</option>
                  <option value="random">Random (Lottery)</option>
                  <option value="auction">Auction</option>
                </select>
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowCreateForm(false)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.submitBtn}>Create Group</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Add Member to {selectedGroup?.name}</h3>

            {/* Step 1 — Select Guarantor (optional) */}
            <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: '8px', padding: '0.875rem', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.5rem', fontWeight: '600', fontSize: '0.85rem', color: '#854d0e' }}>
                🛡️ Step 1 — Select a Guarantor <span style={{ fontWeight: '400', color: '#92400e' }}>(optional)</span>
              </p>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', color: '#92400e' }}>
                If left blank, <strong>you (the admin)</strong> will automatically be assigned as guarantor.
                You can reassign it later from the Members tab.
              </p>
              {selectedGuarantor ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #fde047' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{selectedGuarantor.user_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedGuarantor.user_email}</div>
                  </div>
                  <button onClick={() => setSelectedGuarantor(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '1rem' }}>✕</button>
                </div>
              ) : (
                <select
                  onChange={e => {
                    const m = members.find(m => m.user_id === e.target.value);
                    setSelectedGuarantor(m || null);
                  }}
                  style={{ ...styles.input, marginBottom: 0 }}
                  defaultValue=""
                >
                  <option value="">— Leave blank to use admin as guarantor —</option>
                  {members.map(m => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.user_name} ({m.user_email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Step 2 — Search new member */}
            <div style={styles.field}>
              <label style={styles.label}>Step 2 — Search New Member by Email</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="email" value={searchEmail} placeholder="user@example.com"
                  onChange={e => setSearchEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchUsers())}
                  style={{ ...styles.input, flex: 1, marginBottom: 0 }} />
                <button onClick={searchUsers} disabled={isSearching} style={styles.submitBtn}>
                  {isSearching ? '…' : 'Search'}
                </button>
              </div>
            </div>
            {availableUsers.length > 0 && (
              <div style={{ marginTop: '1rem', maxHeight: '250px', overflowY: 'auto' }}>
                {availableUsers.map(u => (
                  <button key={u.id} onClick={() => handleAddMember(u.id)} style={styles.userResult}>
                    <div style={{ fontWeight: '600' }}>{u.full_name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.email}</div>
                    {!selectedGuarantor && <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '2px' }}>⚠️ Select a guarantor first</div>}
                  </button>
                ))}
              </div>
            )}
            {availableUsers.length === 0 && searchEmail && !isSearching && (
              <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.5rem' }}>No users found.</p>
            )}
            <div style={styles.modalActions}>
              <button onClick={() => { setShowAddMember(false); setSearchEmail(''); setAvailableUsers([]); setSelectedGuarantor(null); }} style={styles.cancelBtn}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedMember && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Record Payment — {selectedMember.name}</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Cycle #{activeCycleNumber}
            </p>
            <form onSubmit={submitPayment}>
              <div style={styles.field}>
                <label style={styles.label}>Amount ({currency})</label>
                <input type="number" value={paymentData.amount} required step="0.01" min="0.01"
                  onChange={e => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })}
                  style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Payment Method</label>
                <select value={paymentData.payment_method} onChange={e => setPaymentData({ ...paymentData, payment_method: e.target.value })} style={styles.input}>
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Transaction Reference (optional)</label>
                <input type="text" value={paymentData.transaction_reference}
                  onChange={e => setPaymentData({ ...paymentData, transaction_reference: e.target.value })}
                  style={styles.input} placeholder="e.g. TXN-12345" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Notes (optional)</label>
                <textarea value={paymentData.notes} onChange={e => setPaymentData({ ...paymentData, notes: e.target.value })}
                  style={{ ...styles.input, minHeight: '70px', resize: 'vertical' }} />
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={() => { setShowPaymentModal(false); setSelectedMember(null); setPaymentData(EMPTY_PAYMENT); }} style={styles.cancelBtn} disabled={isSubmittingPayment}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn} disabled={isSubmittingPayment}>
                  {isSubmittingPayment ? 'Recording…' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f1f5f9', fontFamily: "'DM Sans', system-ui, sans-serif" },
  layout: { display: 'flex', minHeight: 'calc(100vh - 56px)' },
  sidebar: { width: '280px', background: 'white', borderRight: '1px solid #e2e8f0', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0 },
  sidebarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sidebarTitle: { fontWeight: '700', fontSize: '0.9rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' },
  sidebarCount: { background: '#1a6b4a', color: 'white', borderRadius: '9999px', fontSize: '0.75rem', padding: '0.1rem 0.5rem', fontWeight: '600' },
  newGroupBtn: { width: '100%', padding: '0.6rem', background: '#1a6b4a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' },
  groupList: { display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' },
  groupItem: { padding: '0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' },
  groupItemActive: { background: '#1a6b4a', border: '1px solid #1a6b4a', color: 'white' },
  groupItemName: { fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.2rem' },
  groupItemSub: { fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.4rem' },
  groupItemMeta: { display: 'flex', gap: '0.4rem', alignItems: 'center' },
  badge: { fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '9999px', fontWeight: '600' },
  cycleTag: { fontSize: '0.65rem', color: '#94a3b8' },
  main: { flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' },
  card: { background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  emptyState: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem' },
  emptyIcon: { fontSize: '3rem', marginBottom: '1rem' },
  emptyTitle: { fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' },
  emptyText: { color: '#64748b', marginBottom: '1.5rem' },
  ctaBtn: { padding: '0.75rem 2rem', background: '#1a6b4a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem' },
  groupHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' },
  groupName: { fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.25rem' },
  groupDesc: { color: '#64748b', fontSize: '0.9rem' },
  addMemberBtn: { padding: '0.6rem 1.25rem', background: '#1a6b4a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem', whiteSpace: 'nowrap', flexShrink: 0 },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' },
  metaItem: {},
  metaLabel: { fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600', marginBottom: '0.25rem' },
  metaValue: { fontWeight: '700', fontSize: '1rem', color: '#0f172a' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' },
  summaryCard: { background: 'white', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  summaryLabel: { fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' },
  summaryValue: { fontSize: '1.4rem', fontWeight: '700' },
  tabBar: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '0.25rem' },
  tab: { padding: '0.5rem 1rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '0.875rem', color: '#64748b', transition: 'all 0.15s' },
  tabActive: { background: '#1a6b4a', color: 'white', border: '1px solid #1a6b4a' },
  sectionTitle: { fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', marginBottom: '1rem' },
  progressLabels: { display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#64748b' },
  progressTrack: { height: '10px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '9999px', transition: 'width 0.4s ease' },
  cycleStats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' },
  cycleStat: {},
  cycleStatLabel: { fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', marginBottom: '0.2rem' },
  cycleStatValue: { fontWeight: '700', fontSize: '1rem' },
  recipientBanner: { background: '#fefce8', border: '1px solid #fde047', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  payoutBanner: { background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  payoutBannerText: { color: '#166534', fontWeight: '600', fontSize: '0.9rem' },
  processBtn: { padding: '0.5rem 1.25rem', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  thead: { background: '#f8fafc' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '0.75rem 1rem', color: '#334155', verticalAlign: 'middle' },
  pill: { display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600' },
  recordBtn: { padding: '0.25rem 0.75rem', background: '#1a6b4a', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' },
  removeBtn: { padding: '0.25rem 0.75rem', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' },
  arrowBtn: { padding: '0 5px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '3px', cursor: 'pointer', fontSize: '0.6rem', lineHeight: '1.4', color: '#475569', fontWeight: '700' },
  orderBadge: { display: 'inline-block', minWidth: '28px', textAlign: 'center', background: '#1a6b4a', color: 'white', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700', padding: '0.1rem 0.4rem' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modal: { background: 'white', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', marginBottom: '1.5rem' },
  field: { marginBottom: '1rem' },
  fieldRow: { display: 'flex', gap: '1rem', marginBottom: '1rem' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.35rem' },
  input: { width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.9rem', color: '#0f172a', outline: 'none', marginBottom: 0 },
  modalActions: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' },
  cancelBtn: { padding: '0.6rem 1.25rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' },
  submitBtn: { padding: '0.6rem 1.25rem', background: '#1a6b4a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' },
  userResult: { width: '100%', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', marginBottom: '0.5rem' },
  loadingWrap: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  spinner: { width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTop: '3px solid #1a6b4a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  emptyMsg: { color: '#94a3b8', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' },
  emptyMsgBlock: { color: '#94a3b8', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' },
};
