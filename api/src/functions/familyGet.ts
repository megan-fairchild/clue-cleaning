import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { getContainer, getAuthUser, verifyFamilyMember } from '../shared.js';

app.http('familyGet', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'family',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const user = getAuthUser(req);
    if (!user) return { status: 401, jsonBody: { error: 'Authentication required' } };

    const profilesContainer = getContainer('profiles');
    const { resources: profiles } = await profilesContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @userId',
        parameters: [{ name: '@userId', value: user.userId }],
      })
      .fetchAll();

    if (profiles.length === 0) {
      return { status: 404, jsonBody: { error: 'No family found. Create or join one.' } };
    }

    const profile = profiles[0];
    const result = await verifyFamilyMember(user.userId, profile.familyId);
    if (!result) return { status: 403, jsonBody: { error: 'Not a member of this family' } };

    return { jsonBody: { family: result.family, profile, member: result.member } };
  },
});
