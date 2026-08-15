import { useState, useEffect } from 'react';
import API from '../services/api';

const STATUS_COLORS = {
  active: { bg: '#dcfce7', color: '#166534', label: 'Active' },
  pending_decision: { bg: '#fef9c3', color: '#854d0e', label: 'Awaiting Decision' },
  paused: { bg: '#fee2e2', color: '#991b1b', label: 'Paused' },
  ended: { bg: '#f1f5f9', color: '#475569', label: 'Ended' },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.active;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.6rem' }}>
      {s.label}
    </span>
  );
}

// ── Cycle Decision Panel (admin only) ─────────────────────────────────────
function CycleDecisionPanel({ group, onUpdate }) {
  const [decision, setDecision] = useState(group.cycle_decision || 'continue');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async () => {
    setLoading(true);
    setMsg('');
    try {
      await API.post(`/groups/${group.id}/cycle-decision`, { decision, note });
      setMsg('✅ Decision saved successfully');
      onUpdate();
    } catch (err) {
      setMsg('⚠️ ' + (err.response?.data?.detail || 'Failed to save decision'));
    } finally {
      setLoading(false);
    }
  };

  const resume = async () => {
    setLoading(true);
    try {
      await API.post(`/groups/${group.id}/resume`);
      setMsg('✅ Group resumed');
      onUpdate();
    } catch (err) {
      setMsg('⚠️ ' + (err.response?.data?.detail || 'Failed to resume'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#f8faf9', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ margin: 0, color: '#124d35', fontSize: '0.95rem', fontWeight: '700' }}>⚙️ Round Management</h4>
        <StatusBadge status={group.group_status} />
      </div>

      {group.group_status === 'paused' ? (
        <div>
          <p style={{ fontSize: '0.875rem', color: '#5a5a5a', marginBottom: '0.75rem' }}>
            This group is currently <strong>paused</strong>. No new round will start until you resume it.
            {group.cycle_decision_note && <span style={{ display: 'block', marginTop: '0.4rem', fontStyle: 'italic' }}>Note: {group.cycle_decision_note}</span>}
          </p>
          <button onClick={resume} disabled={loading} style={btnGreen}>
            {loading ? 'Resuming...' : '▶ Resume Group'}
          </button>
        </div>
      ) : group.group_status === 'ended' ? (
        <p style={{ fontSize: '0.875rem', color: '#5a5a5a' }}>
          This group has ended. No further rounds will run.
          {group.cycle_decision_note && <span style={{ display: 'block', marginTop: '0.4rem', fontStyle: 'italic' }}>Note: {group.cycle_decision_note}</span>}
        </p>
      ) : (
        <>
          <p style={{ fontSize: '0.85rem', color: '#5a5a5a', marginBottom: '1rem' }}>
            Set what happens once every member has received their payout and the current round completes.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {[
              { value: 'continue', label: '▶ Continue', desc: 'Start next round automatically', color: '#1a6b4a' },
              { value: 'pause', label: '⏸ Pause', desc: 'Stop after this round', color: '#d97706' },
              { value: 'end', label: '⏹ End', desc: 'Close the group permanently', color: '#dc2626' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setDecision(opt.value)}
                style={{
                  flex: 1, minWidth: '120px', padding: '0.75rem',
                  border: `2px solid ${decision === opt.value ? opt.color : '#e0e0e0'}`,
                  borderRadius: '8px', background: decision === opt.value ? opt.color + '15' : 'white',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: '700', color: opt.color, fontSize: '0.875rem' }}>{opt.label}</div>
                <div style={{ fontSize: '0.75rem', color: '#5a5a5a', marginTop: '2px' }}>{opt.desc}</div>
              </button>
            ))}
          </div>

          {(decision === 'pause' || decision === 'end') && (
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.35rem' }}>
                Reason / Note (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Group is taking a break for the holidays"
                style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>
          )}

          <button onClick={submit} disabled={loading} style={btnGreen}>
            {loading ? 'Saving...' : 'Save Decision'}
          </button>
        </>
      )}

      {msg && <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: msg.startsWith('✅') ? '#166534' : '#991b1b' }}>{msg}</p>}
    </div>
  );
}

// ── Exit Requests Panel (admin only) ──────────────────────────────────────
function ExitRequestsPanel({ group, onUpdate }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/groups/${group.id}/exit-requests`)
      .then(r => setRequests(r.data))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [group.id]);

  const decide = async (userId, approved) => {
    try {
      await API.put(`/groups/${group.id}/exit-requests/${userId}`, { approved });
      setRequests(prev => prev.filter(r => r.user_id !== userId));
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed');
    }
  };

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <div style={{ background: '#fff8e6', border: '1px solid #f0d080', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
      <h4 style={{ margin: '0 0 0.75rem', color: '#854d0e', fontSize: '0.95rem', fontWeight: '700' }}>
        🚪 Exit Requests ({requests.length})
      </h4>
      {requests.map(r => (
        <div key={r.user_id} style={{ background: 'white', borderRadius: '8px', padding: '0.875rem', marginBottom: '0.5rem', border: '1px solid #f0d080' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{r.user_name}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{r.user_email}</div>
              {r.exit_reason && <div style={{ fontSize: '0.82rem', color: '#5a5a5a', marginTop: '0.3rem', fontStyle: 'italic' }}>"{r.exit_reason}"</div>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => decide(r.user_id, true)} style={btnGreen}>Approve</button>
              <button onClick={() => decide(r.user_id, false)} style={btnRed}>Reject</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Waitlist Panel (admin only) ───────────────────────────────────────────
function WaitlistPanel({ group, onUpdate }) {
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/groups/${group.id}/waitlist`)
      .then(r => setWaitlist(r.data))
      .catch(() => setWaitlist([]))
      .finally(() => setLoading(false));
  }, [group.id]);

  const decide = async (userId, approved) => {
    try {
      await API.put(`/groups/${group.id}/waitlist/${userId}`, { approved });
      setWaitlist(prev => prev.filter(w => w.user_id !== userId));
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed');
    }
  };

  if (loading) return null;
  if (waitlist.length === 0) return null;

  return (
    <div style={{ background: '#f0f9f4', border: '1px solid #86efac', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
      <h4 style={{ margin: '0 0 0.75rem', color: '#166534', fontSize: '0.95rem', fontWeight: '700' }}>
        ⏳ Waitlist ({waitlist.length})
      </h4>
      {waitlist.map(w => (
        <div key={w.user_id} style={{ background: 'white', borderRadius: '8px', padding: '0.875rem', marginBottom: '0.5rem', border: '1px solid #86efac' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{w.user_name}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{w.user_email}</div>
              {w.waitlist_note && <div style={{ fontSize: '0.82rem', color: '#5a5a5a', marginTop: '0.3rem', fontStyle: 'italic' }}>"{w.waitlist_note}"</div>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => decide(w.user_id, true)} style={btnGreen}>Approve</button>
              <button onClick={() => decide(w.user_id, false)} style={btnRed}>Reject</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Member Exit Request Button ────────────────────────────────────────────
function MemberExitPanel({ group, membership, onUpdate }) {
  const [reason, setReason] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  if (!membership || membership.is_admin) return null;

  const requestExit = async () => {
    setLoading(true);
    try {
      await API.post(`/groups/${group.id}/request-exit`, { reason });
      setMsg('✅ Exit request submitted. The admin will review it.');
      setShowForm(false);
      onUpdate();
    } catch (err) {
      setMsg('⚠️ ' + (err.response?.data?.detail || 'Failed'));
    } finally {
      setLoading(false);
    }
  };

  const cancelExit = async () => {
    setLoading(true);
    try {
      await API.delete(`/groups/${group.id}/cancel-exit`);
      setMsg('✅ Exit request cancelled.');
      onUpdate();
    } catch (err) {
      setMsg('⚠️ ' + (err.response?.data?.detail || 'Failed'));
    } finally {
      setLoading(false);
    }
  };

  if (membership.membership_status === 'exit_requested') {
    return (
      <div style={{ background: '#fff8e6', border: '1px solid #f0d080', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.875rem', color: '#854d0e', margin: '0 0 0.5rem' }}>
          ⏳ Your exit request is pending admin approval.
        </p>
        <button onClick={cancelExit} disabled={loading} style={btnRed}>
          {loading ? '...' : 'Cancel Exit Request'}
        </button>
        {msg && <p style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: '#991b1b' }}>{msg}</p>}
      </div>
    );
  }

  if (group.group_status === 'ended') return null;

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
      {!showForm ? (
        <button onClick={() => setShowForm(true)} style={{ ...btnRed, background: 'transparent', color: '#dc2626', border: '1px solid #dc2626' }}>
          🚪 Request to Leave Group
        </button>
      ) : (
        <>
          <p style={{ fontSize: '0.85rem', color: '#5a5a5a', marginBottom: '0.75rem' }}>
            Your request will be reviewed by the admin. You will remain active until approved.
          </p>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason for leaving (optional)"
            style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={requestExit} disabled={loading} style={btnRed}>{loading ? '...' : 'Submit Request'}</button>
            <button onClick={() => setShowForm(false)} style={btnGrey}>Cancel</button>
          </div>
        </>
      )}
      {msg && <p style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: msg.startsWith('✅') ? '#166534' : '#991b1b' }}>{msg}</p>}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────
export default function CycleManager({ group, members, currentUser, onUpdate }) {
  const membership = members.find(m => m.user_id === currentUser?.id);
  const isAdmin = membership?.is_admin;

  return (
    <div>
      {isAdmin && (
        <>
          <CycleDecisionPanel group={group} onUpdate={onUpdate} />
          <ExitRequestsPanel group={group} onUpdate={onUpdate} />
          <WaitlistPanel group={group} onUpdate={onUpdate} />
        </>
      )}
      {!isAdmin && (
        <MemberExitPanel group={group} membership={membership} onUpdate={onUpdate} />
      )}
    </div>
  );
}

const btnGreen = {
  padding: '0.45rem 1rem', background: '#1a6b4a', color: 'white',
  border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.825rem',
};
const btnRed = {
  padding: '0.45rem 1rem', background: '#dc2626', color: 'white',
  border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.825rem',
};
const btnGrey = {
  padding: '0.45rem 1rem', background: '#f1f5f9', color: '#475569',
  border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.825rem',
};
