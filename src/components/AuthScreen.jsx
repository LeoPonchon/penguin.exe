import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthScreen.css';

const AuthScreen = () => {
  const [mode, setMode] = useState('login'); // login, signup, forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    } else if (mode === 'signup') {
      if (!username.trim()) {
        setError('Username is required');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, username.trim(), displayName.trim());
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Check your email for confirmation link!');
      }
    } else if (mode === 'forgot') {
      const { error } = await resetPassword(email);
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Password reset email sent! Check your inbox.');
      }
    }
    setLoading(false);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
    setUsername('');
    setDisplayName('');
  };

  return (
    <div className="auth-screen">
      <div className="auth-container">
        <h1 className="auth-title">🐧 Penguin.chat</h1>
        <p className="auth-subtitle">
          {mode === 'login' && 'Welcome back!'}
          {mode === 'signup' && 'Join the conversation'}
          {mode === 'forgot' && 'Reset your password'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Unique username (e.g., user123)"
                  autoComplete="username"
                />
                <span className="input-hint">This is your unique identifier for adding friends</span>
              </div>
              <div className="form-group">
                <label htmlFor="displayName">Display Name</label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name (e.g., Alex)"
                  autoComplete="off"
                />
                <span className="input-hint">This is what others will see (can be changed anytime)</span>
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              required
            />
          </div>

          {mode !== 'forgot' && (
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={6}
              />
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Loading...' : mode === 'forgot' ? 'Send Reset Email' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {mode === 'login' && (
          <>
            <p className="auth-switch">
              Don't have an account?{' '}
              <button type="button" className="link-button" onClick={() => switchMode('signup')}>
                Sign Up
              </button>
            </p>
            <p className="auth-forgot">
              <button type="button" className="link-button" onClick={() => switchMode('forgot')}>
                Forgot password?
              </button>
            </p>
          </>
        )}

        {mode === 'signup' && (
          <p className="auth-switch">
            Already have an account?{' '}
            <button type="button" className="link-button" onClick={() => switchMode('login')}>
              Sign In
            </button>
          </p>
        )}

        {mode === 'forgot' && (
          <p className="auth-switch">
            Remember your password?{' '}
            <button type="button" className="link-button" onClick={() => switchMode('login')}>
              Sign In
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthScreen;
