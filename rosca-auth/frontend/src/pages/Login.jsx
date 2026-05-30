import { useState } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

// Eye icons as inline SVG
const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// ── Shared input styles ────────────────────────────────
const inputStyle = {
  width: '100%', padding: '0.75rem', border: '1px solid #d1d5db',
  borderRadius: '6px', fontSize: '1rem', outline: 'none',
  boxSizing: 'border-box', color: '#1f2937'
};
const labelStyle = { display: 'block', marginBottom: '0.4rem', color: '#374151', fontWeight: '600', fontSize: '0.875rem' };
const fieldStyle = { marginBottom: '1rem' };

// ── Password field with show/hide toggle ──────────────
function PasswordField({ value, onChange, label = 'Password', placeholder = '', required = true }) {
  const [show, setShow] = useState(false);
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          style={{ ...inputStyle, paddingRight: '2.75rem' }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          style={{
            position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0,
            display: 'flex', alignItems: 'center'
          }}
          tabIndex={-1}
          title={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

// ── Error / Success banners ───────────────────────────
const ErrorBanner = ({ msg }) => msg ? (
  <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid #fecaca' }}>
    {msg}
  </div>
) : null;

const SuccessBanner = ({ msg }) => msg ? (
  <div style={{ background: '#f0fdf4', color: '#166534', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid #bbf7d0' }}>
    {msg}
  </div>
) : null;

// ── Submit button ─────────────────────────────────────
const SubmitBtn = ({ loading, label, loadingLabel = 'Please wait…' }) => (
  <button
    type="submit"
    disabled={loading}
    style={{
      width: '100%', padding: '0.75rem',
      background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea, #764ba2)',
      color: 'white', border: 'none', borderRadius: '6px',
      fontSize: '1rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
    }}
  >
    {loading ? loadingLabel : label}
  </button>
);

// ════════════════════════════════════════════════════════
//  VIEWS: login | register | forgotPassword | resetPassword
// ════════════════════════════════════════════════════════

function LoginView({ onSwitch, onForgot }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      const res = await API.post('/auth/login', formData);
      login(res.data.access_token, {
        id: res.data.user_id, email: res.data.email,
        fullName: res.data.full_name, role: res.data.role
      });
      window.location.href = res.data.role === 'super_admin' ? '/admin' : '/dashboard';
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <>
      <h2 style={styles.title}>Welcome Back</h2>
      <ErrorBanner msg={error} />
      <form onSubmit={handleSubmit}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="you@example.com" />
        </div>
        <PasswordField value={password} onChange={e => setPassword(e.target.value)} />
        <div style={{ textAlign: 'right', marginBottom: '1rem', marginTop: '-0.5rem' }}>
          <button type="button" onClick={onForgot} style={styles.textLink}>Forgot password?</button>
        </div>
        <SubmitBtn loading={loading} label="Sign In" />
      </form>
      <p style={styles.switchText}>
        Don't have an account?{' '}
        <button type="button" onClick={() => onSwitch('register')} style={styles.textLink}>Sign Up</button>
      </p>
    </>
  );
}

function RegisterView({ onSwitch }) {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', full_name: '', phone: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await API.post('/auth/register', { email: form.email, password: form.password, full_name: form.full_name, phone: form.phone });
      setSuccess('Account created! A welcome email has been sent. Please sign in.');
      setTimeout(() => onSwitch('login'), 2500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <>
      <h2 style={styles.title}>Create Account</h2>
      <ErrorBanner msg={error} />
      <SuccessBanner msg={success} />
      <form onSubmit={handleSubmit}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Full Name</label>
          <input type="text" value={form.full_name} onChange={set('full_name')} required style={inputStyle} placeholder="Jane Smith" />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Phone</label>
          <input type="tel" value={form.phone} onChange={set('phone')} style={inputStyle} placeholder="+44 7700 000000" />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Email</label>
          <input type="email" value={form.email} onChange={set('email')} required style={inputStyle} placeholder="you@example.com" />
        </div>
        <PasswordField value={form.password} onChange={set('password')} placeholder="Min. 8 characters" />
        <PasswordField value={form.confirmPassword} onChange={set('confirmPassword')} label="Confirm Password" />
        <SubmitBtn loading={loading} label="Create Account" />
      </form>
      <p style={styles.switchText}>
        Already have an account?{' '}
        <button type="button" onClick={() => onSwitch('login')} style={styles.textLink}>Sign In</button>
      </p>
    </>
  );
}

function ForgotPasswordView({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      await API.post(`/auth/forgot-password?email=${encodeURIComponent(email)}`);
      setSuccess('If that email is registered, a reset link has been sent. Check your inbox.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <>
      <h2 style={styles.title}>Reset Password</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
        Enter your email and we'll send you a link to reset your password.
      </p>
      <ErrorBanner msg={error} />
      <SuccessBanner msg={success} />
      {!success && (
        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="you@example.com" />
          </div>
          <SubmitBtn loading={loading} label="Send Reset Link" loadingLabel="Sending…" />
        </form>
      )}
      <p style={styles.switchText}>
        <button type="button" onClick={() => onSwitch('login')} style={styles.textLink}>← Back to Sign In</button>
      </p>
    </>
  );
}

function ResetPasswordView({ token, onSwitch }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await API.post(`/auth/reset-password?token=${token}&new_password=${encodeURIComponent(password)}`);
      setSuccess('Password reset successfully! Redirecting to sign in…');
      setTimeout(() => onSwitch('login'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed — the link may have expired');
    } finally { setLoading(false); }
  };

  return (
    <>
      <h2 style={styles.title}>Set New Password</h2>
      <ErrorBanner msg={error} />
      <SuccessBanner msg={success} />
      {!success && (
        <form onSubmit={handleSubmit}>
          <PasswordField value={password} onChange={e => setPassword(e.target.value)} label="New Password" placeholder="Min. 8 characters" />
          <PasswordField value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} label="Confirm New Password" />
          <SubmitBtn loading={loading} label="Reset Password" />
        </form>
      )}
      <p style={styles.switchText}>
        <button type="button" onClick={() => onSwitch('login')} style={styles.textLink}>← Back to Sign In</button>
      </p>
    </>
  );
}

// ════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════
function Login() {
  // Check for reset token in URL
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get('token');

  const [view, setView] = useState(resetToken ? 'reset' : 'login');

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>🔄</div>
          <span style={styles.logoText}>ROSCA</span>
        </div>

        <div style={styles.body}>
          {view === 'login'    && <LoginView onSwitch={setView} onForgot={() => setView('forgot')} />}
          {view === 'register' && <RegisterView onSwitch={setView} />}
          {view === 'forgot'   && <ForgotPasswordView onSwitch={setView} />}
          {view === 'reset'    && <ResetPasswordView token={resetToken} onSwitch={setView} />}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '1rem'
  },
  card: {
    background: 'white', borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '400px', overflow: 'hidden'
  },
  header: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)', padding: '1.5rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
  },
  logo: { fontSize: '1.75rem' },
  logoText: { color: 'white', fontSize: '1.5rem', fontWeight: '700', letterSpacing: '0.05em' },
  body: { padding: '2rem' },
  title: { fontSize: '1.4rem', fontWeight: '700', color: '#111827', marginBottom: '1.25rem', textAlign: 'center' },
  switchText: { textAlign: 'center', marginTop: '1.25rem', color: '#6b7280', fontSize: '0.9rem' },
  textLink: { background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', fontWeight: '600', fontSize: 'inherit', padding: 0 },
};

export default Login;
