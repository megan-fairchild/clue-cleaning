/**
 * Sync client for Fairchild Manor — connects local IndexedDB state with
 * Azure Functions + Cosmos DB backend via Azure Static Web Apps auth.
 */

export interface SyncUser {
  userId: string;
  userDetails: string;
  identityProvider: string;
  userRoles: string[];
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

/** Get the current authenticated user from Azure SWA */
export async function getAuthUser(): Promise<SyncUser | null> {
  try {
    const res = await fetch('/.auth/me');
    if (!res.ok) return null;
    const data = await res.json();
    const principal = data.clientPrincipal;
    if (!principal) return null;
    return {
      userId: principal.userId,
      userDetails: principal.userDetails,
      identityProvider: principal.identityProvider,
      userRoles: principal.userRoles || [],
    };
  } catch {
    return null;
  }
}

/** Redirect to Azure AD login */
export function login(): void {
  window.location.href = '/.auth/login/aad?post_login_redirect_uri=/';
}

/** Log out */
export function logout(): void {
  window.location.href = '/.auth/logout?post_logout_redirect_uri=/';
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
  const res = await fetch('/api/family');
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

  const res = await fetch(url.toString());
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ familyId, taskId, operationId }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to complete task');
  return res.json();
}

/** Update user profile */
export async function updateProfile(familyId: string, updates: { name?: string; persona?: string }): Promise<unknown> {
  const res = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ familyId, ...updates }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to update profile');
  return res.json();
}

/** Get leaderboard */
export async function getLeaderboard(familyId: string): Promise<{ leaderboard: unknown[]; activity: unknown[] }> {
  const res = await fetch(`/api/leaderboard?familyId=${familyId}`);
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to get leaderboard');
  return res.json();
}

/** Check if running in Azure Static Web Apps (has auth endpoint) */
export async function isCloudEnvironment(): Promise<boolean> {
  try {
    const res = await fetch('/.auth/me');
    return res.ok;
  } catch {
    return false;
  }
}
