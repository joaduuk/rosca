import { useState } from 'react';
import API from '../services/api';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      
      console.log('Attempting login with:', email);
      const response = await API.post('/auth/login', formData);
      
      console.log('Login response:', response.data);
      console.log('Login successful, token:', response.data.access_token);
      
      localStorage.setItem('token', response.data.access_token);
      
      // Verify token was stored
      const storedToken = localStorage.getItem('token');
      console.log('Token stored in localStorage:', storedToken ? 'Yes' : 'No');
      
      console.log('Redirecting to dashboard...');
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      console.log('Attempting registration with:', email);
      const response = await API.post('/auth/register', {
        email,
        password,
        full_name: fullName,
        phone
      });
      
      console.log('Registration response:', response.data);
      alert('Registration successful! Please login.');
      setIsRegistering(false);
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '350px'
      }}>
        <h2 style={{
          textAlign: 'center',
          color: '#333',
          marginBottom: '1.5rem',
          fontSize: '1.8rem'
        }}>
          {isRegistering ? 'Create Account' : 'Welcome Back'}
        </h2>
        
        {error && (
          <div style={{
            background: '#fee',
            color: '#c33',
            padding: '0.75rem',
            borderRadius: '5px',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={isRegistering ? handleRegister : handleLogin}>
          {isRegistering && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '1rem'
                  }}
                  required
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '1rem'
                  }}
                  required
                />
              </div>
            </>
          )}
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '1rem'
              }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '1rem'
              }}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: loading ? '#999' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.3s'
            }}
            onMouseOver={(e) => !loading && (e.target.style.background = '#764ba2')}
            onMouseOut={(e) => !loading && (e.target.style.background = '#667eea')}
          >
            {loading ? 'Please wait...' : (isRegistering ? 'Sign Up' : 'Sign In')}
          </button>
        </form>
        
        <p style={{
          textAlign: 'center',
          marginTop: '1rem',
          color: '#666'
        }}>
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setIsRegistering(!isRegistering);
              setError('');
            }}
            style={{ color: '#667eea', textDecoration: 'none' }}
          >
            {isRegistering ? 'Sign In' : 'Sign Up'}
          </a>
        </p>
      </div>
    </div>
  );
}

export default Login;