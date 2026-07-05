import { useState, useEffect } from 'react';
import API from '../services/api';

function formatDate(dateString) {
  if (!dateString) return '—';
  try { return new Date(dateString).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return '—'; }
}

function formatMoney(amount, currency = 'GBP') {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount}`;
  }
}

export default function AdminGroupLookup() {
  const [query, setQuery] = useState('');
  const [allGroups, setAllGroups] = useState([]);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [composition, setComposition] = useState(null);
  const [loadingComp, setLoadingComp] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load all groups on mount for instant dropdown filtering
    API.get('/admin/groups').then(res => {
      setAllGroups(res.data);
    }).catch(() => {});
  }, []);

  // Filter as you type
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    const q = query.toLowerCase();
    const filtered = allGroups.filter(g =>
      g.name.toLowerCase().includes(q) ||
      (g.description && g.description.toLowerCase().includes(q))
    );
    setResults(filtered);
    setShowDropdown(true);
  }, [query, allGroups]);

  const selectGroup = (group) => {
    setQuery(group.name);
    setShowDropdown(false);
    viewGroup(group);
  };

  const viewGroup = async (group) => {
    setSelected(group);
    setComposition(null);
    setLoadingComp(true);
    try {
      const res = await API.get(`/admin/groups/${group.id}/composition`);
      setComposition(res.data);
    } catch (err) {
      setError('Failed to load group composition.');
    }
    setLoadingComp(false);
  };

  const S = {
    page: { fontFamily: "'DM Sans', sans-serif", background: '#f8faf9', minHeight: '100vh', padding: '2rem 1.5rem' },
    container: { maxWidth: 1100, margin: '0 auto' },
    title: { fontSize: '1.6rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' },
    subtitle: { fontSize: '0.9rem', color: '#6b7280', marginBottom: '1.75rem' },
    searchRow: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' },
    input: { flex: 1, padding: '0.7rem 1rem', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: '0.95rem', outline: 'none' },
    searchBtn: { padding: '0.7rem 1.5rem', background: '#1a6b4a', color: 'white', border: 'none', borderRadius: 8, fontWeight: '600', cursor: 'pointer' },
    error: { background: '#fef2f2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.88rem', marginBottom: '1.5rem' },
    resultsList: { display: 'grid', gap: '0.6rem', marginBottom: '2rem' },
    resultCard: (active) => ({
      background: 'white', border: '1.5px solid ' + (active ? '#1a6b4a' : '#e5e7eb'), borderRadius: 10,
      padding: '0.9rem 1.2rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }),
    resultName: { fontWeight: '700', color: '#111827', fontSize: '0.98rem' },
    resultMeta: { fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.2rem' },
    badge: (active) => ({ fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '50px', background: active ? '#dcfce7' : '#fee2e2', color: active ? '#166534' : '#991b1b' }),

    detailCard: { background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.75rem', marginTop: '1rem' },
    groupHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
    groupName: { fontSize: '1.3rem', fontWeight: '700', color: '#111827', marginBottom: '0.25rem' },
    groupDesc: { fontSize: '0.88rem', color: '#6b7280' },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.75rem' },
    statBox: { background: '#f9fafb', borderRadius: 8, padding: '0.9rem 1rem' },
    statLabel: { fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', marginBottom: '0.3rem' },
    statValue: { fontSize: '1.15rem', fontWeight: '700', color: '#111827' },

    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
    th: { textAlign: 'left', padding: '0.6rem 0.75rem', background: '#f9fafb', fontWeight: '700', color: '#6b7280', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' },
    td: { padding: '0.7rem 0.75rem', borderBottom: '1px solid #f3f4f6', color: '#374151' },
    adminTag: { fontSize: '0.7rem', fontWeight: '700', color: '#1a6b4a', background: '#e8f5ef', padding: '0.1rem 0.5rem', borderRadius: '50px', marginLeft: '0.4rem' },
    payoutTag: { fontSize: '0.7rem', fontWeight: '700', color: '#9a6700', background: '#fff8e6', padding: '0.1rem 0.5rem', borderRadius: '50px' },
  };

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={S.title}>Group Lookup</div>
        <div style={S.subtitle}>Search any group by name to view its read-only composition — members, contributions and payout order.</div>

        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <input
            style={{ ...S.input, width: '100%', boxSizing: 'border-box' }}
            placeholder="Type to search groups..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null); setComposition(null); }}
            onFocus={() => query.trim() && setShowDropdown(true)}
            autoComplete="off"
          />
          {showDropdown && results.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #d1d5db', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: 320, overflowY: 'auto', marginTop: 4 }}>
              {results.map(g => (
                <div key={g.id}
                  onClick={() => selectGroup(g)}
                  style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <div>
                    <div style={{ fontWeight: '600', color: '#111827', fontSize: '0.92rem' }}>{g.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 2 }}>
                      {formatMoney(g.contribution_amount, g.currency)} / {g.contribution_period} · Cycle {g.current_cycle}
                    </div>
                  </div>
                  <span style={S.badge(g.is_active)}>{g.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              ))}
            </div>
          )}
          {showDropdown && query.trim() && results.length === 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #d1d5db', borderRadius: 8, padding: '1rem', color: '#9ca3af', fontSize: '0.88rem', marginTop: 4 }}>
              No groups found matching "{query}"
            </div>
          )}
        </div>

        {error && <div style={S.error}>{error}</div>}

        {loadingComp && <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Loading group composition...</div>}

        {composition && !loadingComp && (
          <div style={S.detailCard}>
            <div style={S.groupHeader}>
              <div>
                <div style={S.groupName}>{composition.group.name}</div>
                {composition.group.description && <div style={S.groupDesc}>{composition.group.description}</div>}
              </div>
              <span style={S.badge(composition.group.is_active)}>{composition.group.is_active ? 'Active' : 'Inactive'}</span>
            </div>

            <div style={S.statsRow}>
              <div style={S.statBox}>
                <div style={S.statLabel}>Members</div>
                <div style={S.statValue}>{composition.members.length}</div>
              </div>
              <div style={S.statBox}>
                <div style={S.statLabel}>Contribution</div>
                <div style={S.statValue}>{formatMoney(composition.group.contribution_amount, composition.currency)}</div>
              </div>
              <div style={S.statBox}>
                <div style={S.statLabel}>Period</div>
                <div style={S.statValue}>{composition.group.contribution_period}</div>
              </div>
              <div style={S.statBox}>
                <div style={S.statLabel}>Current Cycle</div>
                <div style={S.statValue}>{composition.group.current_cycle}</div>
              </div>
              <div style={S.statBox}>
                <div style={S.statLabel}>Total Collected</div>
                <div style={S.statValue}>{formatMoney(composition.grand_total, composition.currency)}</div>
              </div>
              <div style={S.statBox}>
                <div style={S.statLabel}>ROSCA Type</div>
                <div style={S.statValue}>{composition.group.rosca_type || '—'}</div>
              </div>
            </div>

            <div style={{ fontWeight: '700', color: '#111827', marginBottom: '0.75rem' }}>Member Composition</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>#</th>
                    <th style={S.th}>Name</th>
                    <th style={S.th}>Email</th>
                    <th style={S.th}>Invite Code</th>
                    <th style={S.th}>Joined</th>
                    <th style={S.th}>Total Paid</th>
                    <th style={S.th}>Payout Cycle</th>
                  </tr>
                </thead>
                <tbody>
                  {composition.members.map((m, i) => (
                    <tr key={m.user_id}>
                      <td style={S.td}>{m.payout_order ?? i + 1}</td>
                      <td style={S.td}>
                        {m.name}
                        {m.is_admin && <span style={S.adminTag}>Admin</span>}
                      </td>
                      <td style={S.td}>{m.email}</td>
                      <td style={S.td}><code>{m.invite_code || '—'}</code></td>
                      <td style={S.td}>{formatDate(m.joined_at)}</td>
                      <td style={S.td}>{formatMoney(m.total_paid, composition.currency)}</td>
                      <td style={S.td}>
                        {m.payout_cycle ? <span style={S.payoutTag}>Cycle {m.payout_cycle}</span> : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
