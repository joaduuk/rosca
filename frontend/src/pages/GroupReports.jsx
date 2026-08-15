import { useState, useEffect } from 'react';
import API from '../services/api';
import * as XLSX from 'xlsx';

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

function formatCurrency(amount, currencyCode = 'USD') {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount); }
  catch { return `${currencyCode} ${Number(amount).toFixed(2)}`; }
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try { return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return 'Invalid date'; }
}

function exportContributions(contributions, group, fmt) {
  // Build a spreadsheet-style export: rows = members, columns = cycles
  const cycles = [...new Set(contributions.map(c => c.cycle_number))].sort((a, b) => a - b);
  const memberMap = {};

  contributions.forEach(c => {
    const key = c.member_name || 'Unknown';
    if (!memberMap[key]) memberMap[key] = { name: key, cycles: {}, total: 0 };
    memberMap[key].cycles[c.cycle_number] = c.amount;
    if (c.status === 'paid') memberMap[key].total += Number(c.amount);
  });

  const rows = [];
  // Header
  rows.push(['Member', ...cycles.map(c => `Cycle ${c}`), 'Total Paid']);
  // Data rows
  Object.values(memberMap).forEach(m => {
    rows.push([m.name, ...cycles.map(c => m.cycles[c] || 0), m.total]);
  });
  // Totals row
  const cycleTotals = cycles.map(c =>
    contributions.filter(x => x.cycle_number === c && x.status === 'paid').reduce((s, x) => s + Number(x.amount), 0)
  );
  const grandTotal = cycleTotals.reduce((s, v) => s + v, 0);
  rows.push(['TOTAL', ...cycleTotals, grandTotal]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [{ wch: 24 }, ...cycles.map(() => ({ wch: 14 })), { wch: 14 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Contributions');
  XLSX.writeFile(wb, `${group?.name || 'rosca'}-contributions.xlsx`);
}

export default function GroupReports() {
  const mobile = useIsMobile();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [summary, setSummary] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [contribView, setContribView] = useState('list'); // 'list' | 'spreadsheet'

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    try {
      const res = await API.get('/groups/');
      setGroups(res.data);
      if (res.data.length > 0) loadGroup(res.data[0]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadGroup = async (group) => {
    setSelectedGroup(group);
    const [sumRes, contRes, payRes] = await Promise.allSettled([
      API.get(`/groups/${group.id}/summary`),
      API.get(`/groups/${group.id}/contributions`),
      API.get(`/groups/${group.id}/payout-schedule`),
    ]);
    setSummary(sumRes.status === 'fulfilled' ? sumRes.value.data : null);
    setContributions(contRes.status === 'fulfilled' ? contRes.value.data : []);
    setPayouts(payRes.status === 'fulfilled' ? payRes.value.data : []);
  };

  const currency = selectedGroup?.currency || 'USD';
  const fmt = (n) => formatCurrency(n, currency);

  // Build spreadsheet data from contributions
  const cycles = [...new Set(contributions.map(c => c.cycle_number))].sort((a, b) => a - b);
  const memberMap = {};
  contributions.forEach(c => {
    const key = c.member_name || 'Unknown';
    if (!memberMap[key]) memberMap[key] = { name: key, cycles: {}, total: 0, statuses: {} };
    memberMap[key].cycles[c.cycle_number] = c.amount;
    memberMap[key].statuses[c.cycle_number] = c.status;
    if (c.status === 'paid') memberMap[key].total += Number(c.amount);
  });
  const memberRows = Object.values(memberMap);
  const cycleTotals = cycles.map(c =>
    contributions.filter(x => x.cycle_number === c && x.status === 'paid').reduce((s, x) => s + Number(x.amount), 0)
  );
  const grandTotal = cycleTotals.reduce((s, v) => s + v, 0);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading…</div>;

  if (groups.length === 0) return (
    <div style={{ padding: '3rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
      <h2 style={{ color: '#124d35' }}>No Groups Yet</h2>
      <p style={{ color: '#64748b' }}>Create a group from the Dashboard to see reports here.</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>📊 Reports</h1>
        <select
          value={selectedGroup?.id || ''}
          onChange={e => { const g = groups.find(g => g.id === e.target.value); if (g) loadGroup(g); }}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', color: '#0f172a', background: 'white', cursor: 'pointer', minWidth: '200px' }}
        >
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem' }}>

        {/* Summary cards */}
        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total Collected', value: fmt(summary.total_collected || 0), color: '#059669', bg: '#f0fdf4' },
              { label: 'Total Paid Out',  value: fmt(summary.total_paid_out || 0),  color: '#dc2626', bg: '#fef2f2' },
              { label: 'Current Balance', value: fmt(summary.balance || 0),          color: '#2563eb', bg: '#eff6ff' },
              { label: 'Cycles Completed', value: summary.total_cycles_completed || 0, color: '#1a6b4a', bg: '#f0f9f4' },
            ].map(card => (
              <div key={card.label} style={{ background: card.bg, borderRadius: '12px', padding: '1.25rem', border: `1px solid ${card.color}22` }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>{card.label}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '700', color: card.color }}>{card.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {[
            { key: 'summary',       label: '📋 Cycle Summary' },
            { key: 'contributions', label: '💳 Contributions' },
            { key: 'payouts',       label: '💰 Payouts' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer',
              fontWeight: '500', fontSize: '0.875rem', transition: 'all 0.15s',
              background: activeTab === tab.key ? '#1a6b4a' : 'white',
              color: activeTab === tab.key ? 'white' : '#64748b',
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Cycle Summary */}
        {activeTab === 'summary' && summary && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '1rem' }}>Current Cycle Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
              {[
                { label: 'Current Cycle',   value: `#${summary.current_cycle || 1}` },
                { label: 'Members Paid',    value: `${summary.current_cycle_paid || 0} / ${summary.total_members || 0}` },
                { label: 'Members Pending', value: summary.current_cycle_pending || 0 },
              ].map(item => (
                <div key={item.label} style={{ background: '#f8fafc', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.3rem' }}>{item.label}</div>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#0f172a' }}>{item.value}</div>
                </div>
              ))}
            </div>
            {summary.next_payout_date && (
              <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: '8px', padding: '0.875rem 1rem' }}>
                <strong style={{ color: '#854d0e' }}>Next Payout Date:</strong>
                <span style={{ color: '#92400e', marginLeft: '0.5rem' }}>{new Date(summary.next_payout_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            )}
          </div>
        )}

        {/* Tab: Contributions */}
        {activeTab === 'contributions' && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>

            {/* Contributions toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                Contributions <span style={{ fontWeight: '400', color: '#64748b', fontSize: '0.875rem' }}>({contributions.length})</span>
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* View toggle */}
                <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  {[{ key: 'list', label: '☰ List' }, { key: 'spreadsheet', label: '⊞ Spreadsheet' }].map(v => (
                    <button key={v.key} onClick={() => setContribView(v.key)} style={{
                      padding: '0.4rem 0.9rem', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
                      background: contribView === v.key ? '#1a6b4a' : 'white',
                      color: contribView === v.key ? 'white' : '#64748b',
                      fontFamily: "'DM Sans', sans-serif",
                    }}>
                      {v.label}
                    </button>
                  ))}
                </div>
                {/* Export button — always visible when there's data */}
                {contributions.length > 0 && (
                  <button
                    onClick={() => exportContributions(contributions, selectedGroup, fmt)}
                    style={{ padding: '0.45rem 1rem', background: '#1a6b4a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    ⬇ Export Excel
                  </button>
                )}
              </div>
            </div>

            {contributions.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No contributions recorded yet.</p>
            ) : contribView === 'list' ? (
              /* ── List view ── */
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Date', 'Member', 'Cycle', 'Amount', 'Method', 'Status'].map(h => (
                        <th key={h} style={{ padding: '0.65rem 0.875rem', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {contributions.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.65rem 0.875rem', color: '#334155' }}>{formatDate(c.paid_date || c.due_date)}</td>
                        <td style={{ padding: '0.65rem 0.875rem', color: '#334155' }}>{c.member_name || '—'}</td>
                        <td style={{ padding: '0.65rem 0.875rem', color: '#334155' }}>R{c.round_number || 1} · #{c.cycle_number}</td>
                        <td style={{ padding: '0.65rem 0.875rem', color: '#334155', fontWeight: '600' }}>{fmt(c.amount)}</td>
                        <td style={{ padding: '0.65rem 0.875rem', color: '#334155', textTransform: 'capitalize' }}>{c.payment_method || '—'}</td>
                        <td style={{ padding: '0.65rem 0.875rem' }}>
                          <span style={{ background: c.status === 'paid' ? '#dcfce7' : '#fee2e2', color: c.status === 'paid' ? '#166534' : '#991b1b', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '600', padding: '0.2rem 0.6rem' }}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ── Spreadsheet view ── */
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '500px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'left', fontWeight: '700', color: '#0f172a', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 1 }}>
                        Member
                      </th>
                      {cycles.map(c => (
                        <th key={c} style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: '600', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                          Cycle {c}
                        </th>
                      ))}
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: '700', color: '#1a6b4a', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                        Total Paid
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberRows.map((m, i) => (
                      <tr key={m.name} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: i % 2 === 0 ? 'white' : '#fafafa', zIndex: 1 }}>
                          {m.name}
                        </td>
                        {cycles.map(c => {
                          const amount = m.cycles[c];
                          const status = m.statuses[c];
                          return (
                            <td key={c} style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                              {amount != null ? (
                                <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                  <span style={{ fontWeight: '600', color: status === 'paid' ? '#059669' : '#dc2626', fontSize: '0.82rem' }}>{fmt(amount)}</span>
                                  <span style={{ fontSize: '0.65rem' }}>{status === 'paid' ? '✅' : '⏳'}</span>
                                </span>
                              ) : (
                                <span style={{ color: '#cbd5e1' }}>—</span>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: '700', color: '#1a6b4a' }}>
                          {fmt(m.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f0f9f4', borderTop: '2px solid #e2e8f0' }}>
                      <td style={{ padding: '0.65rem 1rem', fontWeight: '700', color: '#1a6b4a', position: 'sticky', left: 0, background: '#f0f9f4', zIndex: 1 }}>
                        Cycle Total
                      </td>
                      {cycleTotals.map((t, i) => (
                        <td key={i} style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: '700', color: '#1a6b4a', fontSize: '0.85rem' }}>
                          {fmt(t)}
                        </td>
                      ))}
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: '700', color: '#1a6b4a' }}>
                        {fmt(grandTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Payouts */}
        {activeTab === 'payouts' && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '1rem' }}>
              Payout History <span style={{ fontWeight: '400', color: '#64748b', fontSize: '0.875rem' }}>({payouts.length})</span>
            </h3>
            {payouts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                <p>No payouts yet.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Payouts appear here after they are processed.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Cycle', 'Recipient', 'Amount', 'Date', 'Status', 'Contributions'].map(h => (
                        <th key={h} style={{ padding: '0.65rem 0.875rem', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.65rem 0.875rem', color: '#334155' }}>Round {p.round_number || 1} · Cycle {p.cycle_number}</td>
                        <td style={{ padding: '0.65rem 0.875rem', color: '#334155', fontWeight: '500' }}>{p.recipient_name}</td>
                        <td style={{ padding: '0.65rem 0.875rem', color: '#334155', fontWeight: '600' }}>{fmt(p.amount)}</td>
                        <td style={{ padding: '0.65rem 0.875rem', color: '#334155' }}>{formatDate(p.payout_date)}</td>
                        <td style={{ padding: '0.65rem 0.875rem' }}>
                          <span style={{
                            background: p.status === 'paid' ? '#dcfce7' : p.status === 'scheduled' ? '#fef9c3' : '#fee2e2',
                            color: p.status === 'paid' ? '#166534' : p.status === 'scheduled' ? '#854d0e' : '#991b1b',
                            borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '600', padding: '0.2rem 0.6rem', textTransform: 'capitalize'
                          }}>{p.status}</span>
                        </td>
                        <td style={{ padding: '0.65rem 0.875rem', color: '#334155' }}>{p.paid_count}/{p.contributions_count} {p.all_paid && '✅'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
