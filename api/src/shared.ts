import { CosmosClient, type Container, type Database } from '@azure/cosmos';
import type { HttpRequest } from '@azure/functions';
import jwt from 'jsonwebtoken';

let database: Database;

function getDatabase(): Database {
  if (!database) {
    const client = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT!,
      key: process.env.COSMOS_KEY!,
    });
    database = client.database(process.env.COSMOS_DATABASE || 'fairchildmanor');
  }
  return database;
}

export function getContainer(name: string): Container {
  return getDatabase().container(name);
}

const JWT_SECRET = () => process.env.JWT_SECRET || 'fairchild-manor-dev-secret';

export interface AuthUser {
  userId: string;
  username: string;
  familyId: string | null;
  role: 'admin' | 'member';
}

export interface UserDoc {
  id: string;
  partitionKey: string;
  username: string;
  passwordHash: string;
  familyId: string | null;
  role: 'admin' | 'member';
  persona: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** Hash password with SHA-256 + salt (matches frontend) */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'fairchild-manor-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Create a JWT token for a user */
export function createToken(user: AuthUser): string {
  return jwt.sign(
    { userId: user.userId, username: user.username, familyId: user.familyId, role: user.role },
    JWT_SECRET(),
    { expiresIn: '7d' }
  );
}

/** Extract authenticated user from request — supports custom JWT (Authorization header or cookie) */
export function getAuthUser(req: HttpRequest): AuthUser | null {
  // Try custom JWT first (Authorization: Bearer <token>)
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET()) as AuthUser;
      return decoded;
    } catch {
      return null;
    }
  }

  // Fallback: SWA built-in auth (x-ms-client-principal) for backwards compat
  const header = req.headers.get('x-ms-client-principal');
  if (header) {
    try {
      const decoded = Buffer.from(header, 'base64').toString('utf8');
      const principal = JSON.parse(decoded);
      return {
        userId: principal.userId,
        username: principal.userDetails,
        familyId: null,
        role: 'member',
      };
    } catch {
      return null;
    }
  }

  return null;
}

export interface FamilyMember {
  userId: string;
  name: string;
  persona: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface Family {
  id: string;
  partitionKey: string;
  name: string;
  inviteCode: string;
  inviteExpiresAt: string;
  inviteMaxUses: number;
  inviteUsesCount: number;
  members: FamilyMember[];
  rooms: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  partitionKey: string;
  familyId: string;
  name: string;
  persona: string;
  role: string;
  xp: number;
  streak: number;
  lastCompletionDate: string | null;
  totalCompleted: number;
  achievements: string[];
  createdAt: string;
  updatedAt: string;
}

export async function verifyFamilyMember(
  userId: string,
  familyId: string
): Promise<{ family: Family; member: FamilyMember } | null> {
  const container = getContainer('families');
  try {
    const { resource } = await container.item(familyId, familyId).read<Family>();
    if (!resource) return null;
    const member = resource.members.find((m) => m.userId === userId);
    if (!member) return null;
    return { family: resource, member };
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 404) return null;
    throw e;
  }
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'FM-'; // Fairchild Manor prefix
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'halfyear' | 'annual';

export function getPeriodStart(frequency: Frequency, date = new Date()): string {
  const d = new Date(date);
  switch (frequency) {
    case 'daily':
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    case 'weekly': {
      const day = d.getDay();
      const diff = d.getDate() - day;
      return new Date(d.getFullYear(), d.getMonth(), diff).toISOString();
    }
    case 'monthly':
      return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    case 'quarterly': {
      const q = Math.floor(d.getMonth() / 3) * 3;
      return new Date(d.getFullYear(), q, 1).toISOString();
    }
    case 'halfyear': {
      const h = d.getMonth() < 6 ? 0 : 6;
      return new Date(d.getFullYear(), h, 1).toISOString();
    }
    case 'annual':
      return new Date(d.getFullYear(), 0, 1).toISOString();
    default:
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
  }
}
