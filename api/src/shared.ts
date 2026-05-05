import { CosmosClient, type Container, type Database } from '@azure/cosmos';
import type { HttpRequest } from '@azure/functions';

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

export interface AuthUser {
  userId: string;
  identityProvider: string;
  userDetails: string;
  userRoles: string[];
}

export function getAuthUser(req: HttpRequest): AuthUser | null {
  const header = req.headers.get('x-ms-client-principal');
  if (!header) return null;
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf8');
    const principal = JSON.parse(decoded);
    return {
      userId: principal.userId,
      identityProvider: principal.identityProvider,
      userDetails: principal.userDetails,
      userRoles: principal.userRoles || [],
    };
  } catch {
    return null;
  }
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
