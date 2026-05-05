import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { getContainer, getAuthUser, generateInviteCode } from '../shared.js';

app.http('familyCreate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'family/create',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const user = getAuthUser(req);
    if (!user) return { status: 401, jsonBody: { error: 'Authentication required' } };

    const body = (await req.json()) as { familyName?: string; userName?: string; persona?: string };
    const { familyName, userName, persona } = body;
    if (!familyName || !userName) return { status: 400, jsonBody: { error: 'familyName and userName required' } };

    const familyId = crypto.randomUUID();
    const inviteCode = generateInviteCode();
    const now = new Date().toISOString();

    const family = {
      id: familyId,
      partitionKey: familyId,
      name: familyName,
      inviteCode,
      inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      inviteMaxUses: 10,
      inviteUsesCount: 0,
      members: [{
        userId: user.userId,
        name: userName,
        persona: persona || 'agent',
        role: 'admin' as const,
        joinedAt: now,
      }],
      rooms: [],
      createdAt: now,
      updatedAt: now,
    };

    const familiesContainer = getContainer('families');
    await familiesContainer.items.create(family);

    const profilesContainer = getContainer('profiles');
    await profilesContainer.items.upsert({
      id: user.userId,
      partitionKey: familyId,
      familyId,
      name: userName,
      persona: persona || 'agent',
      role: 'admin',
      xp: 0,
      streak: 0,
      lastCompletionDate: null,
      totalCompleted: 0,
      achievements: [],
      createdAt: now,
      updatedAt: now,
    });

    return { status: 201, jsonBody: { family, inviteCode } };
  },
});
