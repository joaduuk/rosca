import { useEffect, useState } from 'react';
import API from '../services/api';

const inputStyle = {
  width: '100%', padding: '0.75rem', border: '1px solid #d1d5db',
  borderRadius: '6px', fontSize: '1rem', outline: 'none',
  boxSizing: 'border-box', color: '#1f2937'
};
const labelStyle = { display: 'block', marginBottom: '0.4rem', color: '#374151', fontWeight: '600', fontSize: '0.875rem' };
const fieldStyle = { marginBottom: '1rem' };

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

const SubmitBtn = ({ loading, label, loadingLabel = 'Please wait…' }) => (
  <button
    type="submit"
    disabled={loading}
    style={{
      width: '100%', padding: '0.75rem',
      background: loading ? '#9ca3af' : 'linear-gradient(135deg, #1a6b4a, #124d35)',
      color: 'white', border: 'none', borderRadius: '6px',
      fontSize: '1rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
    }}
  >
    {loading ? loadingLabel : label}
  </button>
);

// Small inline spinner used while the token is being verified on mount
function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%',
        border: '3px solid #e5e7eb', borderTopColor: '#1a6b4a',
        animation: 'verify-spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes verify-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ResendForm({ prefillEmail = '' }) {
  const [email, setEmail] = useState(prefillEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      await API.post(`/auth/resend-verification?email=${encodeURIComponent(email)}`);
      setSuccess('If that email needs verifying, a new link has been sent. Check your inbox.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong — please try again shortly.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
      <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Need a new link? Enter your email and we'll send another one.
      </p>
      <ErrorBanner msg={error} />
      <SuccessBanner msg={success} />
      {!success && (
        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="you@example.com" />
          </div>
          <SubmitBtn loading={loading} label="Resend Verification Email" loadingLabel="Sending…" />
        </form>
      )}
    </div>
  );
}

function VerifyEmail() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing a token. Please use the link from your email.');
      return;
    }

    let cancelled = false;
    API.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => {
        if (cancelled) return;
        setStatus('success');
        setMessage('Your email has been verified! You can now sign in.');
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(err.response?.data?.detail || 'This link is invalid or has expired.');
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.logoText}>
            Rosca<span style={{ color: '#f0a500' }}>App</span>
          </span>
        </div>

        <div style={styles.body}>
          <h2 style={styles.title}>
            {status === 'verifying' && 'Verifying your email…'}
            {status === 'success' && 'Email Verified'}
            {status === 'error' && 'Verification Failed'}
          </h2>

          {status === 'verifying' && <Spinner />}
          {status === 'success' && <SuccessBanner msg={message} />}
          {status === 'error' && <ErrorBanner msg={message} />}

          {status === 'success' && (
            <a href="/login" style={styles.link}>
              <button type="button" style={styles.primaryBtn}>Go to Sign In</button>
            </a>
          )}

          {status === 'error' && <ResendForm />}

          {status !== 'verifying' && (
            <p style={styles.switchText}>
              <a href="/login" style={styles.textLink}>← Back to Sign In</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a6b4a 0%, #124d35 100%)', padding: '1rem'
  },
  card: {
    background: 'white', borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '400px', overflow: 'hidden'
  },
  header: {
    background: 'linear-gradient(135deg, #1a6b4a, #124d35)', padding: '1.5rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
  },
  logoText: { color: 'white', fontSize: '1.8rem', fontWeight: '400', fontFamily: "Georgia, 'DM Serif Display', serif", letterSpacing: '0.01em' },
  body: { padding: '2rem' },
  title: { fontSize: '1.4rem', fontWeight: '700', color: '#111827', marginBottom: '1.25rem', textAlign: 'center' },
  switchText: { textAlign: 'center', marginTop: '1.25rem', color: '#6b7280', fontSize: '0.9rem' },
  textLink: { color: '#1a6b4a', cursor: 'pointer', fontWeight: '600', fontSize: 'inherit', textDecoration: 'none' },
  link: { textDecoration: 'none', display: 'block' },
  primaryBtn: {
    width: '100%', padding: '0.75rem',
    background: 'linear-gradient(135deg, #1a6b4a, #124d35)',
    color: 'white', border: 'none', borderRadius: '6px',
    fontSize: '1rem', fontWeight: '600', cursor: 'pointer',
  },
};

export default VerifyEmail;
