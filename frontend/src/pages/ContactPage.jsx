import { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState(null); // null | 'sending' | 'success' | 'error'
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      const res = await API.post('/api/contact', form);
      if (!res.data) throw new Error('Something went wrong');
      setStatus('success');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setStatus('error');
      setError(err.response?.data?.detail || err.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#f8faf9', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #f0f9f4, #e8f5ef)', padding: '3.5rem 1.5rem 3rem', textAlign: 'center', borderBottom: '1px solid #e0e0e0' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1a6b4a', marginBottom: '0.5rem' }}>Get In Touch</div>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#124d35', marginBottom: '0.75rem', fontFamily: "Georgia, serif", fontWeight: 400 }}>Contact Us</h1>
        <p style={{ color: '#5a5a5a', fontSize: '1.05rem', maxWidth: '520px', margin: '0 auto' }}>
          Have a question, suggestion, or just want to say hello? We'd love to hear from you.
        </p>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '3rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem', alignItems: 'start' }}>

        {/* Left — info */}
        <div>
          <h2 style={{ fontSize: '1.2rem', color: '#124d35', fontFamily: "Georgia, serif", fontWeight: 400, marginBottom: '1.25rem' }}>How can we help?</h2>

          {[
            ['💬', 'General Enquiries', 'Questions about how RoscaApp works or anything else.'],
            ['🐛', 'Report a Bug', 'Found something that\'s not working? Let us know.'],
            ['💡', 'Feature Requests', 'Have an idea to make RoscaApp better? We\'re all ears.'],
            ['🔒', 'Privacy & Data', 'Questions about your data or our privacy policy.'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', alignItems: 'flex-start' }}>
              <div style={{ width: '40px', height: '40px', background: '#e8f5ef', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{icon}</div>
              <div>
                <div style={{ fontWeight: '600', color: '#1c1c1c', marginBottom: '0.2rem', fontSize: '0.95rem' }}>{title}</div>
                <div style={{ color: '#5a5a5a', fontSize: '0.875rem', lineHeight: '1.5' }}>{desc}</div>
              </div>
            </div>
          ))}

          <div style={{ marginTop: '2rem', background: '#e8f5ef', borderRadius: '10px', padding: '1.25rem' }}>
            <div style={{ fontWeight: '600', color: '#124d35', marginBottom: '0.4rem', fontSize: '0.9rem' }}>📧 Direct Email</div>
            <a href="mailto:admin@roscaapp.com" style={{ color: '#1a6b4a', fontWeight: '500', fontSize: '0.95rem' }}>admin@roscaapp.com</a>
            <p style={{ color: '#5a5a5a', fontSize: '0.8rem', marginTop: '0.4rem' }}>We aim to respond within 1–2 business days.</p>
          </div>

          <div style={{ marginTop: '1rem', background: 'white', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '1.25rem' }}>
            <div style={{ fontWeight: '600', color: '#124d35', marginBottom: '0.4rem', fontSize: '0.9rem' }}>📚 Before you write</div>
            <p style={{ color: '#5a5a5a', fontSize: '0.85rem', lineHeight: '1.6' }}>
              Check our <a href="/#faq" style={{ color: '#1a6b4a' }}>FAQ</a> — your question may already be answered there.
            </p>
          </div>
        </div>

        {/* Right — form */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #e0e0e0' }}>
          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h3 style={{ color: '#124d35', fontFamily: "Georgia, serif", fontWeight: 400, fontSize: '1.4rem', marginBottom: '0.75rem' }}>Message Sent!</h3>
              <p style={{ color: '#5a5a5a', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                Thanks for reaching out. We've sent a confirmation to your email and will get back to you within 1–2 business days.
              </p>
              <button onClick={() => setStatus(null)} style={{ background: '#1a6b4a', color: 'white', border: 'none', borderRadius: '8px', padding: '0.7rem 1.5rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem' }}>
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h3 style={{ color: '#124d35', fontFamily: "Georgia, serif", fontWeight: 400, fontSize: '1.2rem', marginBottom: '1.5rem' }}>Send us a message</h3>

              {[
                { label: 'Your Name', name: 'name', type: 'text', placeholder: 'e.g. Abena Mensah', required: true },
                { label: 'Email Address', name: 'email', type: 'email', placeholder: 'you@example.com', required: true },
                { label: 'Subject', name: 'subject', type: 'text', placeholder: 'What is this about?', required: true },
              ].map(({ label, name, type, placeholder, required }) => (
                <div key={name} style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.35rem' }}>{label}</label>
                  <input
                    type={type}
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    placeholder={placeholder}
                    required={required}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.9rem', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#1a6b4a'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              ))}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.35rem' }}>Message</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Tell us more..."
                  required
                  rows={5}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.9rem', color: '#0f172a', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  onFocus={e => e.target.style.borderColor = '#1a6b4a'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              {status === 'error' && (
                <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                style={{ width: '100%', padding: '0.8rem', background: status === 'sending' ? '#5a9a7a' : '#1a6b4a', color: 'white', border: 'none', borderRadius: '8px', cursor: status === 'sending' ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '1rem', transition: 'background 0.15s' }}
              >
                {status === 'sending' ? '⏳ Sending...' : 'Send Message →'}
              </button>
              {/* Developer credit footer */}
<div style={{
  marginTop: '1.5rem',
  paddingTop: '1rem',
  borderTop: '1px solid #e2e8f0',
  textAlign: 'center',
  fontSize: '0.8rem',
  color: '#64748b'
}}>
  Built with care by{' '}
  <Link
    to="/about-the-developer"
    style={{ color: '#1a6b4a', fontWeight: '600', textDecoration: 'none' }}
  >
    John Adu, MSc
  </Link>
</div>

              <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', marginTop: '0.75rem' }}>
                By submitting this form you agree to our <a href="/#privacy" style={{ color: '#1a6b4a' }}>Privacy Policy</a>.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
