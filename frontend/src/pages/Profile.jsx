import { useState, useEffect, useRef } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://roscaapp.com';
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', current_password: '', new_password: '', confirm_password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef();

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const res = await API.get('/users/me');
      setProfile(res.data);
      setForm(f => ({ ...f, full_name: res.data.full_name, phone: res.data.phone || '' }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.new_password && form.new_password !== form.confirm_password) {
      setError('New passwords do not match'); return;
    }
    setSaving(true);
    try {
      const params = new URLSearchParams();
      if (form.full_name) params.append('full_name', form.full_name);
      if (form.phone) params.append('phone', form.phone);
      if (form.new_password) {
        params.append('current_password', form.current_password);
        params.append('new_password', form.new_password);
      }
      await API.put(`/users/me?${params.toString()}`);
      setSuccess('Profile updated successfully!');
      setEditing(false);
      setForm(f => ({ ...f, current_password: '', new_password: '', confirm_password: '' }));
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.detail || 'Update failed');
    } finally { setSaving(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await API.post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(p => ({ ...p, avatar_url: res.data.avatar_url }));
      setSuccess('Photo updated!');
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally { setUploadingAvatar(false); }
  };

  if (loading) return <div style={S.loadingWrap}><div style={S.spinner} /></div>;
  if (!profile) return <p style={{ padding: '2rem' }}>Could not load profile.</p>;

  const avatarSrc = profile.avatar_url
  ? `${API_URL}${profile.avatar_url}`
  : `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=667eea&color=fff&size=128`;
  return (
    <div style={S.page}>
      <div style={S.container}>

        {/* ── PROFILE CARD ── */}
        <div style={S.card}>
          <div style={S.avatarSection}>
            <div style={S.avatarWrap}>
              <img src={avatarSrc} alt="avatar" style={S.avatar} />
              <button onClick={() => fileRef.current.click()} style={S.avatarEditBtn} title="Change photo">
                {uploadingAvatar ? '⏳' : '📷'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>
            <div>
              <h2 style={S.name}>{profile.full_name}</h2>
              <p style={S.email}>{profile.email}</p>
              <span style={{ ...S.roleBadge, background: profile.role === 'super_admin' ? '#667eea' : '#48bb78' }}>
                {profile.role}
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div style={S.statsRow}>
            {[
              { label: 'Groups', value: profile.groups?.length || 0 },
              { label: 'Guaranteeing', value: profile.guaranteeing?.length || 0 },
              { label: 'Member Since', value: fmt(profile.created_at) },
              { label: 'Status', value: profile.is_active ? 'Active' : 'Inactive' },
            ].map(s => (
              <div key={s.label} style={S.stat}>
                <div style={S.statValue}>{s.value}</div>
                <div style={S.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={S.twoCol}>
          {/* ── EDIT FORM ── */}
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={S.sectionTitle}>Account Details</h3>
              {!editing && <button onClick={() => setEditing(true)} style={S.editBtn}>Edit</button>}
            </div>

            {error && <div style={S.errorBanner}>{error}</div>}
            {success && <div style={S.successBanner}>{success}</div>}

            {!editing ? (
              <>
                <div style={S.detailGrid}>
                  {[
                    { label: 'Full Name', value: profile.full_name },
                    { label: 'Email', value: profile.email },
                    { label: 'Phone', value: profile.phone || '—' },
                    { label: 'Role', value: profile.role },
                  ].map(d => (
                    <div key={d.label} style={S.detailItem}>
                      <div style={S.detailLabel}>{d.label}</div>
                      <div style={S.detailValue}>{d.value}</div>
                    </div>
                  ))}
                </div>
                {profile.invite_code && (
                  <div style={{ marginTop: '1.25rem', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1rem 1.25rem' }}>
                    <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: '600', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Invite Code</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: '700', color: '#166534', letterSpacing: '0.1em' }}>{profile.invite_code}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(profile.invite_code); alert('Invite code copied!'); }}
                        style={{ padding: '0.3rem 0.75rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600' }}
                      >Copy</button>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#166534', margin: '0.5rem 0 0 0' }}>
                      Share this code with a group admin to be added to their ROSCA group. Never share it publicly.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <form onSubmit={handleSave}>
                <div style={S.field}>
                  <label style={S.label}>Full Name</label>
                  <input style={S.input} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Phone</label>
                  <input style={S.input} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+44 7700 000000" />
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '1rem 0' }} />
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.75rem' }}>Leave password fields blank to keep current password</p>
                <div style={S.field}>
                  <label style={S.label}>Current Password</label>
                  <input type="password" style={S.input} value={form.current_password} onChange={e => setForm(f => ({ ...f, current_password: e.target.value }))} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>New Password</label>
                  <input type="password" style={S.input} value={form.new_password} onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))} placeholder="Min. 8 characters" />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Confirm New Password</label>
                  <input type="password" style={S.input} value={form.confirm_password} onChange={e => setForm(f => ({ ...f, confirm_password: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="button" onClick={() => { setEditing(false); setError(''); }} style={S.cancelBtn}>Cancel</button>
                  <button type="submit" disabled={saving} style={S.saveBtn}>{saving ? 'Saving…' : 'Save Changes'}</button>
                </div>
              </form>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* My Groups */}
            <div style={S.card}>
              <h3 style={S.sectionTitle}>My Groups</h3>
              {profile.groups?.length === 0
                ? <p style={S.emptyMsg}>Not a member of any group yet.</p>
                : profile.groups?.map(g => (
                  <div key={g.group_id} style={S.groupRow}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>{g.group_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                        Payout Order #{g.payout_order} · Joined {fmt(g.joined_at)}
                      </div>
                      {g.guarantor_name && (
                        <div style={{ fontSize: '0.75rem', color: '#667eea', marginTop: '2px' }}>
                          🛡️ Guarantor: <strong>{g.guarantor_name}</strong> ({g.guarantor_email})
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {g.is_admin && <span style={{ ...S.pill, background: '#ede9fe', color: '#5b21b6' }}>Admin</span>}
                      <span style={{ ...S.pill, background: '#dcfce7', color: '#166534' }}>Active</span>
                    </div>
                  </div>
                ))
              }
            </div>

            {/* Guaranteeing */}
            <div style={S.card}>
              <h3 style={S.sectionTitle}>People I'm Guaranteeing</h3>
              {profile.guaranteeing?.length === 0
                ? <p style={S.emptyMsg}>You are not currently guaranteeing anyone.</p>
                : profile.guaranteeing?.map(g => (
                  <div key={g.membership_id} style={S.groupRow}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>{g.member_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{g.member_email}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Group: {g.group_name}</div>
                    </div>
                    <span style={{ ...S.pill, background: '#fef9c3', color: '#854d0e' }}>🛡️ Guarantor</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  page: { minHeight: '100vh', background: '#f1f5f9', padding: '2rem 1rem', fontFamily: "'DM Sans', system-ui, sans-serif" },
  container: { maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  card: { background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  avatarSection: { display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: { width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #e2e8f0' },
  avatarEditBtn: { position: 'absolute', bottom: 0, right: 0, background: '#667eea', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: '1.4rem', fontWeight: '700', color: '#0f172a', margin: '0 0 0.25rem' },
  email: { color: '#64748b', fontSize: '0.9rem', margin: '0 0 0.5rem' },
  roleBadge: { color: 'white', borderRadius: '9999px', fontSize: '0.7rem', padding: '0.15rem 0.6rem', textTransform: 'uppercase', fontWeight: '700' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', background: '#f8fafc', borderRadius: '8px', padding: '1rem' },
  stat: { textAlign: 'center' },
  statValue: { fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' },
  statLabel: { fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' },
  sectionTitle: { fontSize: '1rem', fontWeight: '700', color: '#0f172a', margin: '0' },
  editBtn: { padding: '0.35rem 1rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', color: '#475569' },
  detailGrid: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  detailItem: { display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #f8fafc' },
  detailLabel: { fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' },
  detailValue: { fontSize: '0.875rem', color: '#0f172a', fontWeight: '500' },
  field: { marginBottom: '0.875rem' },
  label: { display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#475569', marginBottom: '0.3rem' },
  input: { width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', color: '#0f172a', boxSizing: 'border-box' },
  cancelBtn: { flex: 1, padding: '0.6rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' },
  saveBtn: { flex: 2, padding: '0.6rem', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' },
  errorBanner: { background: '#fef2f2', color: '#b91c1c', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid #fecaca' },
  successBanner: { background: '#f0fdf4', color: '#166534', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid #bbf7d0' },
  groupRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #f8fafc' },
  pill: { display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '600' },
  emptyMsg: { color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' },
  loadingWrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  spinner: { width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTop: '3px solid #667eea', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
};
