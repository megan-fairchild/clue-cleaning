/**
 * Sync client for Fairchild Manor — connects local IndexedDB state with
 * Azure Functions + Cosmos DB backend. Supports custom JWT auth.
 */

const TOKEN_KEY = 'fairchild-auth-token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export interface SyncUser {
  userId: string;
  username: string;
  name: string;
  role: string;
  persona: string;
  familyId?: string | null;
}

export interface SyncFamily {
  id: string;
  name: string;
  inviteCode: string;
  members: Array<{
    userId: string;
    name: string;
    persona: string;
    role: string;
    joinedAt: string;
  }>;
}

export interface SyncState {
  user: SyncUser | null;
  familyId: string | null;
  lastSyncedAt: string | null;
}

const SYNC_STATE_KEY = 'fairchild-sync-state';

/** Get the current authenticated user from the API */
export async function getAuthUser(): Promise<SyncUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

/** Redirect to login is not needed — login is in-app */
export function login(): void {
  // No-op: handled by Login page and useAuthStore
}

/** Log out — clear token and reload */
export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SYNC_STATE_KEY);
  window.location.reload();
}

/** Get saved sync state from localStorage */
export function getSyncState(): SyncState {
  try {
    const saved = localStorage.getItem(SYNC_STATE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { user: null, familyId: null, lastSyncedAt: null };
}

/** Save sync state to localStorage */
function saveSyncState(state: SyncState): void {
  localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state));
}

/** Create a new family (household) */
export async function createFamily(familyName: string, userName: string, persona: string): Promise<{ family: SyncFamily; inviteCode: string }> {
  const res = await fetch('/api/family/create', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ familyName, userName, persona }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to create family');
  const data = await res.json();
  const state = getSyncState();
  state.familyId = data.family.id;
  saveSyncState(state);
  return data;
}

/** Join an existing family with an invite code */
export async function joinFamily(inviteCode: string, userName: string, persona: string): Promise<{ family: SyncFamily }> {
  const res = await fetch('/api/family/join', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ inviteCode, userName, persona }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to join family');
  const data = await res.json();
  const state = getSyncState();
  state.familyId = data.family.id;
  saveSyncState(state);
  return data;
}

/** Get current family info */
export async function getFamily(): Promise<{ family: SyncFamily; profile: unknown; member: unknown } | null> {
  const res = await fetch('/api/family', { headers: authHeaders() });
  if (!res.ok) return null;
  const data = await res.json();
  const state = getSyncState();
  state.familyId = data.family.id;
  saveSyncState(state);
  return data;
}

/** Sync data with the server (delta sync) */
export async function syncData(familyId: string, since?: string | null): Promise<{
  tasks: unknown[];
  completions: unknown[];
  profiles: unknown[];
  family: SyncFamily;
  syncedAt: string;
}> {
  const url = new URL('/api/sync', window.location.origin);
  url.searchParams.set('familyId', familyId);
  if (since) url.searchParams.set('since', since);

  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) throw new Error((await res.json()).error || 'Sync failed');
  const data = await res.json();

  const state = getSyncState();
  state.lastSyncedAt = data.syncedAt;
  saveSyncState(state);

  return data;
}

/** Complete a task on the server */
export async function completeTaskRemote(familyId: string, taskId: string, operationId?: string): Promise<{ completion: unknown; xpEarned: number }> {
  const res = await fetch('/api/tasks/complete', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ familyId, taskId, operationId }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to complete task');
  return res.json();
}

/** Update user profile */
export async function updateProfile(familyId: string, updates: { name?: string; persona?: string }): Promise<unknown> {
  const res = await fetch('/api/profile', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ familyId, ...updates }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to update profile');
  return res.json();
}

/** Get leaderboard */
export async function getLeaderboard(familyId: string): Promise<{ leaderboard: unknown[]; activity: unknown[] }> {
  const res = await fetch(`/api/leaderboard?familyId=${familyId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to get leaderboard');
  return res.json();
}

/** Check if running in Azure (has API backend available) */
export async function isCloudEnvironment(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/me', { method: 'GET', headers: { 'Authorization': 'Bearer test' } });
    return res.status !== 404;
  } catch {
    return false;
  }
}
