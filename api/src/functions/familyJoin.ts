import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { getContainer, getAuthUser } from '../shared.js';

app.http('familyJoin', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'family/join',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const user = getAuthUser(req);
    if (!user) return { status: 401, jsonBody: { error: 'Authentication required' } };

    const body = (await req.json()) as { inviteCode?: string; userName?: string; persona?: string };
    const { inviteCode, userName, persona } = body;
    if (!inviteCode || !userName) return { status: 400, jsonBody: { error: 'inviteCode and userName required' } };

    const familiesContainer = getContainer('families');

    const { resources } = await familiesContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.inviteCode = @code',
        parameters: [{ name: '@code', value: inviteCode.toUpperCase().trim() }],
      })
      .fetchAll();

    if (resources.length === 0) return { status: 404, jsonBody: { error: 'Invalid invite code' } };

    const family = resources[0];

    if (family.inviteExpiresAt && new Date(family.inviteExpiresAt) < new Date()) {
      return { status: 410, jsonBody: { error: 'Invite code has expired' } };
    }
    if (family.inviteMaxUses && family.inviteUsesCount >= family.inviteMaxUses) {
      return { status: 410, jsonBody: { error: 'Invite code has reached maximum uses' } };
    }

    if (family.members.some((m: { userId: string }) => m.userId === user.userId)) {
      return { jsonBody: { family, message: 'Already a member' } };
    }

    const now = new Date().toISOString();
    family.members.push({
      userId: user.userId,
      name: userName,
      persona: persona || 'detective',
      role: 'member',
      joinedAt: now,
    });
    family.inviteUsesCount = (family.inviteUsesCount || 0) + 1;
    family.updatedAt = now;

    await familiesContainer.item(family.id, family.partitionKey).replace(family);

    const profilesContainer = getContainer('profiles');
    await profilesContainer.items.upsert({
      id: user.userId,
      partitionKey: family.id,
      familyId: family.id,
      name: userName,
      persona: persona || 'detective',
      role: 'member',
      xp: 0,
      streak: 0,
      lastCompletionDate: null,
      totalCompleted: 0,
      achievements: [],
      createdAt: now,
      updatedAt: now,
    });

    return { jsonBody: { family } };
  },
});
