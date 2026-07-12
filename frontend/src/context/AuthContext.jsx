// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import API, { setUnauthorizedHandler } from '../services/api';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_LEAD_MS = 60 * 1000;          // show warning 1 minute before logout
const ACTIVITY_THROTTLE_MS = 5000;          // don't reset timer more than once per 5s

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState(false);

  const inactivityTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const lastResetRef = useRef(0);

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({
          id: decoded.sub,
          email: decoded.email,
          role: decoded.role
        });
      } catch (error) {
        console.error('Invalid token', error);
        logout();
      }
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const clearAllTimers = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    setSessionExpiredMessage(false);
  };

  const logout = useCallback((expired = false) => {
    clearAllTimers();
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setShowTimeoutWarning(false);
    if (expired) {
      // Shown briefly on the login page after redirect
      sessionStorage.setItem('sessionExpired', '1');
    }
    window.location.href = '/login';
  }, [clearAllTimers]);

  // Register the global 401 handler once on mount
  useEffect(() => {
    setUnauthorizedHandler(() => logout(true));
  }, [logout]);

  const startCountdown = useCallback(() => {
    setCountdown(60);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (!user) return;
    clearAllTimers();
    setShowTimeoutWarning(false);

    warningTimerRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
      startCountdown();
    }, INACTIVITY_LIMIT_MS - WARNING_LEAD_MS);

    inactivityTimerRef.current = setTimeout(() => {
      logout(true);
    }, INACTIVITY_LIMIT_MS);
  }, [user, clearAllTimers, startCountdown, logout]);

  // Activity listeners — throttled so mousemove etc. don't reset constantly
  useEffect(() => {
    if (!user) {
      clearAllTimers();
      return;
    }

    resetInactivityTimer();

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastResetRef.current < ACTIVITY_THROTTLE_MS) return;
      lastResetRef.current = now;
      // Don't silently reset if the warning modal is already showing —
      // the user must explicitly click "Stay logged in" at that point.
      if (!showTimeoutWarning) {
        resetInactivityTimer();
      }
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity));

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleStayLoggedIn = () => {
    setShowTimeoutWarning(false);
    resetInactivityTimer();
  };

  const hasRole = (allowedRoles) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    hasRole,
    isSuperAdmin: user?.role === 'super_admin',
    isUser: user?.role === 'user',
    isAuthenticated: !!user,
    token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showTimeoutWarning && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏱️</div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#0f172a' }}>
              Still there?
            </h3>
            <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.9rem' }}>
              You've been inactive for a while. For your security, you'll be logged out in{' '}
              <strong style={{ color: '#dc2626' }}>{countdown}s</strong>.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={() => logout(true)} style={secondaryBtnStyle}>
                Log out now
              </button>
              <button onClick={handleStayLoggedIn} style={primaryBtnStyle}>
                Stay logged in
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem',
};

const modalStyle = {
  background: 'white', borderRadius: '12px', padding: '2rem', maxWidth: '360px',
  width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  fontFamily: "'DM Sans', system-ui, sans-serif",
};

const primaryBtnStyle = {
  padding: '0.6rem 1.25rem', background: '#1a6b4a', color: 'white', border: 'none',
  borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem',
};

const secondaryBtnStyle = {
  padding: '0.6rem 1.25rem', background: '#f1f5f9', color: '#475569', border: 'none',
  borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem',
};

export const useAuth = () => useContext(AuthContext);
