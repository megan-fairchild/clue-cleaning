import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { getContainer, getAuthUser, verifyFamilyMember } from '../shared.js';

app.http('profileUpdate', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'profile',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const user = getAuthUser(req);
    if (!user) return { status: 401, jsonBody: { error: 'Authentication required' } };

    const body = (await req.json()) as { familyId?: string; name?: string; persona?: string };
    const { familyId, name, persona } = body;
    if (!familyId) return { status: 400, jsonBody: { error: 'familyId required' } };

    const membership = await verifyFamilyMember(user.userId, familyId);
    if (!membership) return { status: 403, jsonBody: { error: 'Not a member of this family' } };

    const profilesContainer = getContainer('profiles');
    const { resources: profiles } = await profilesContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @uid AND c.familyId = @fid',
        parameters: [
          { name: '@uid', value: user.userId },
          { name: '@fid', value: familyId },
        ],
      })
      .fetchAll();

    if (profiles.length === 0) return { status: 404, jsonBody: { error: 'Profile not found' } };

    const profile = profiles[0];
    if (name) profile.name = name;
    if (persona && ['rookie', 'detective', 'agent'].includes(persona)) profile.persona = persona;
    profile.updatedAt = new Date().toISOString();

    await profilesContainer.item(profile.id, profile.partitionKey).replace(profile);

    // Also update family members array
    const familiesContainer = getContainer('families');
    const family = membership.family;
    const memberIdx = family.members.findIndex((m) => m.userId === user.userId);
    if (memberIdx >= 0) {
      if (name) family.members[memberIdx].name = name;
      if (persona) family.members[memberIdx].persona = persona;
      family.updatedAt = new Date().toISOString();
      await familiesContainer.item(family.id, family.partitionKey).replace(family);
    }

    return { jsonBody: { profile } };
  },
});
