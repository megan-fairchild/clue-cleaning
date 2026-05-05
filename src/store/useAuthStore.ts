import { create } from 'zustand';
import type { CrewMember } from '../types';
import * as db from '../lib/db';
import type { AuthCredentials } from '../lib/db';

export type { AuthCredentials };

interface CloudUser {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'member';
  persona: string;
  familyId?: string | null;
}

interface AuthState {
  currentUser: CrewMember | null;
  cloudUser: CloudUser | null;
  token: string | null;
  credentials: AuthCredentials[];
  hasHydrated: boolean;
  isAdmin: boolean;
  isCloud: boolean;

  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (memberId: string, username: string, password: string, isAdmin: boolean) => Promise<void>;
  registerCloud: (username: string, password: string, name: string, persona: string) => Promise<{ success: boolean; error?: string }>;
  removeCredentials: (memberId: string) => Promise<void>;
  updatePassword: (memberId: string, newPassword: string) => Promise<void>;
  hydrate: () => Promise<void>;
}

// Simple hash for local storage (not cryptographically secure — adequate for local family app)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'fairchild-manor-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const SESSION_KEY = 'fairchild-current-user';
const TOKEN_KEY = 'fairchild-auth-token';

/** Check if the app is running in Azure SWA (has API backend) */
async function detectCloud(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/me', { method: 'GET', headers: { 'Authorization': 'Bearer test' } });
    // If we get a 401 (not 404/network error), the API is available
    return res.status !== 404;
  } catch {
    return false;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  cloudUser: null,
  token: null,
  credentials: [],
  hasHydrated: false,
  isAdmin: false,
  isCloud: false,

  login: async (username: string, password: string): Promise<boolean> => {
    const { isCloud } = get();

    if (isCloud) {
      // Cloud login via API
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        const cloudUser = data.user as CloudUser;
        const token = data.token as string;

        // Map cloud user to local CrewMember shape for UI compatibility
        const member: CrewMember = {
          id: cloudUser.id,
          name: cloudUser.name,
          persona: (cloudUser.persona as CrewMember['persona']) || 'agent',
          color: '#FFD700',
          joinedAt: new Date().toISOString(),
        };

        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(SESSION_KEY, JSON.stringify({ memberId: cloudUser.id }));
        set({ currentUser: member, cloudUser, token, isAdmin: cloudUser.role === 'admin' });
        return true;
      } catch {
        return false;
      }
    }

    // Offline/local login via IndexedDB
    const { credentials } = get();
    const hash = await hashPassword(password);
    const cred = credentials.find(
      c => c.username.toLowerCase() === username.toLowerCase() && c.passwordHash === hash
    );
    if (!cred) return false;

    const allCrew = await db.getAllCrew();
    const member = allCrew.find(m => m.id === cred.id);
    if (!member) return false;

    set({ currentUser: member, isAdmin: cred.isAdmin });
    localStorage.setItem(SESSION_KEY, JSON.stringify({ memberId: member.id }));
    return true;
  },

  logout: () => {
    set({ currentUser: null, cloudUser: null, token: null, isAdmin: false });
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  },

  register: async (memberId: string, username: string, password: string, isAdmin: boolean) => {
    const hash = await hashPassword(password);
    const cred: AuthCredentials = { id: memberId, username, passwordHash: hash, isAdmin };
    await db.setAuthCredentials(cred);
    set(state => ({ credentials: [...state.credentials.filter(c => c.id !== memberId), cred] }));
  },

  registerCloud: async (username: string, password: string, name: string, persona: string) => {
    const { token } = get();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers,
        body: JSON.stringify({ username, password, name, persona }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Registration failed' };

      // If this was the first user (self-registration), auto-login
      if (!token) {
        const cloudUser = data.user as CloudUser;
        const newToken = data.token as string;
        const member: CrewMember = {
          id: cloudUser.id,
          name: cloudUser.name,
          persona: (cloudUser.persona as CrewMember['persona']) || 'agent',
          color: '#FFD700',
          joinedAt: new Date().toISOString(),
        };
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(SESSION_KEY, JSON.stringify({ memberId: cloudUser.id }));
        set({ currentUser: member, cloudUser, token: newToken, isAdmin: cloudUser.role === 'admin' });
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Network error' };
    }
  },

  removeCredentials: async (memberId: string) => {
    await db.removeAuthCredentials(memberId);
    set(state => ({ credentials: state.credentials.filter(c => c.id !== memberId) }));
  },

  updatePassword: async (memberId: string, newPassword: string) => {
    const { credentials } = get();
    const existing = credentials.find(c => c.id === memberId);
    if (!existing) return;
    const hash = await hashPassword(newPassword);
    const updated = { ...existing, passwordHash: hash };
    await db.setAuthCredentials(updated);
    set(state => ({
      credentials: state.credentials.map(c => c.id === memberId ? updated : c)
    }));
  },

  hydrate: async () => {
    // Detect if running in cloud mode
    const isCloud = await detectCloud();

    if (isCloud) {
      // Try to restore session from stored token
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (savedToken) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${savedToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            const cloudUser = data.user as CloudUser;
            const member: CrewMember = {
              id: cloudUser.id,
              name: cloudUser.name,
              persona: (cloudUser.persona as CrewMember['persona']) || 'agent',
              color: '#FFD700',
              joinedAt: new Date().toISOString(),
            };
            set({ currentUser: member, cloudUser, token: savedToken, isAdmin: cloudUser.role === 'admin', isCloud, hasHydrated: true });
            return;
          }
        } catch { /* token expired or invalid */ }
        localStorage.removeItem(TOKEN_KEY);
      }
      set({ isCloud, hasHydrated: true });
      return;
    }

    // Local/offline mode — hydrate from IndexedDB
    const credentials = await db.getAllAuthCredentials();
    let currentUser: CrewMember | null = null;
    let isAdmin = false;

    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const { memberId } = JSON.parse(saved);
        const allCrew = await db.getAllCrew();
        const member = allCrew.find(m => m.id === memberId);
        if (member) {
          currentUser = member;
          const cred = credentials.find(c => c.id === memberId);
          isAdmin = cred?.isAdmin ?? false;
        }
      }
    } catch { /* ignore */ }

    set({ credentials, currentUser, isAdmin, isCloud, hasHydrated: true });
  },
}));

