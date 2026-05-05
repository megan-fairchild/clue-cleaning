import { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useAuthStore, useCrewStore, useUIStore } from '../store';
import type { PersonaId } from '../types';
import { PERSONAS } from '../data/personas';
import clsx from 'clsx';

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const registerCloud = useAuthStore((s) => s.registerCloud);
  const credentials = useAuthStore((s) => s.credentials);
  const isCloud = useAuthStore((s) => s.isCloud);
  const addMember = useCrewStore((s) => s.addMember);
  const members = useCrewStore((s) => s.members);
  const showToast = useUIStore((s) => s.showToast);

  const [mode, setMode] = useState<'login' | 'setup'>(() =>
    !isCloud && credentials.length === 0 ? 'setup' : 'login'
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [persona, setPersona] = useState<PersonaId>('agent');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Username and password required');
      return;
    }
    setLoading(true);
    setError('');
    const success = await login(username.trim(), password);
    setLoading(false);
    if (!success) {
      setError('Invalid username or password');
    }
  };

  const handleSetup = async () => {
    const name = displayName.trim() || username.trim();
    if (!username.trim() || !password) {
      setError('Username and password required');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setLoading(true);
    setError('');

    if (isCloud) {
      // Cloud registration via API
      const result = await registerCloud(username.trim(), password, name, persona);
      setLoading(false);
      if (!result.success) {
        setError(result.error || 'Registration failed');
        return;
      }
      showToast(`Welcome, ${name}! You're the admin.`, 'success');
    } else {
      // Local registration via IndexedDB
      if (credentials.some(c => c.username.toLowerCase() === username.trim().toLowerCase())) {
        setError('Username already taken');
        setLoading(false);
        return;
      }

      await addMember(name, persona);
      const allMembers = useCrewStore.getState().members;
      const newMember = allMembers[allMembers.length - 1];

      await register(newMember.id, username.trim(), password, credentials.length === 0);
      await login(username.trim(), password);
      setLoading(false);
      showToast(
        credentials.length === 0
          ? `Welcome, ${name}! You're the admin.`
          : `Welcome, ${name}!`,
        'success'
      );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-primary px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔍</div>
          <h1 className="text-2xl font-bold text-text" style={{ fontFamily: 'var(--font-family-serif)' }}>
            Fairchild Manor
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {mode === 'setup'
              ? 'Set up your admin account to get started'
              : 'Sign in to continue your investigation'}
          </p>
          {isCloud && (
            <span className="inline-block mt-2 text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full">
              ☁️ Cloud Mode
            </span>
          )}
        </div>

        {/* Form */}
        <div className="bg-bg-card rounded-xl p-6 space-y-4">
          <div>
            <label className="text-xs text-text-muted block mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              placeholder="Enter username..."
              className="w-full bg-bg-primary border border-bg-primary rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-accent"
              onKeyDown={(e) => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleSetup())}
              autoFocus
            />
          </div>

          {mode === 'setup' && (
            <div>
              <label className="text-xs text-text-muted block mb-1">Display Name (optional)</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How others will see you..."
                className="w-full bg-bg-primary border border-bg-primary rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-accent"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-text-muted block mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter password..."
                className="w-full bg-bg-primary border border-bg-primary rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-accent pr-10"
                onKeyDown={(e) => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleSetup())}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Persona selector (only for setup) */}
          {mode === 'setup' && (
            <div>
              <label className="text-xs text-text-muted block mb-2">Persona</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(PERSONAS).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPersona(p.id)}
                    className={clsx(
                      'p-2.5 rounded-lg border text-center transition-all',
                      persona === p.id
                        ? 'border-accent bg-accent/10'
                        : 'border-bg-primary bg-bg-primary hover:border-accent/30'
                    )}
                  >
                    <span className="text-lg block mb-0.5">{p.icon}</span>
                    <span className="text-[9px] text-text-muted">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-error text-center">{error}</p>
          )}

          {/* Action button */}
          {mode === 'login' ? (
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-accent text-white py-2.5 rounded-lg font-medium text-sm disabled:opacity-50 hover:bg-accent-glow transition-colors flex items-center justify-center gap-2"
            >
              <LogIn size={16} />
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          ) : (
            <button
              onClick={handleSetup}
              disabled={loading}
              className="w-full bg-accent text-white py-2.5 rounded-lg font-medium text-sm disabled:opacity-50 hover:bg-accent-glow transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus size={16} />
              {loading ? 'Creating...' : 'Create Admin Account'}
            </button>
          )}

          {/* Toggle between login/setup */}
          <p className="text-center text-xs text-text-muted">
            {mode === 'login' ? (
              <button onClick={() => setMode('setup')} className="text-accent hover:underline">
                First time? Create admin account
              </button>
            ) : (
              <button onClick={() => setMode('login')} className="text-accent hover:underline">
                Already have an account? Sign in
              </button>
            )}
          </p>

          {/* Crew member list for login hint (local mode) */}
          {mode === 'login' && !isCloud && members.length > 0 && (
            <div className="pt-2 border-t border-bg-primary">
              <p className="text-[10px] text-text-muted mb-2 uppercase tracking-wider">Crew Members</p>
              <div className="flex flex-wrap gap-1.5">
                {members.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setUsername(m.name)}
                    className="text-xs bg-bg-primary px-2 py-1 rounded text-text-muted hover:text-text transition-colors"
                  >
                    {PERSONAS[m.persona].icon} {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
