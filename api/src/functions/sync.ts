import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { getContainer, getAuthUser, verifyFamilyMember } from '../shared.js';

app.http('sync', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'sync',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const user = getAuthUser(req);
    if (!user) return { status: 401, jsonBody: { error: 'Authentication required' } };

    const familyId = req.query.get('familyId');
    const since = req.query.get('since');
    if (!familyId) return { status: 400, jsonBody: { error: 'familyId required' } };

    const membership = await verifyFamilyMember(user.userId, familyId);
    if (!membership) return { status: 403, jsonBody: { error: 'Not a member of this family' } };

    const now = new Date().toISOString();

    // Get tasks
    const tasksContainer = getContainer('tasks');
    const tasksQuery = since
      ? {
          query: 'SELECT * FROM c WHERE c.familyId = @fid AND c.updatedAt > @since',
          parameters: [
            { name: '@fid', value: familyId },
            { name: '@since', value: since },
          ],
        }
      : {
          query: 'SELECT * FROM c WHERE c.familyId = @fid',
          parameters: [{ name: '@fid', value: familyId }],
        };
    const { resources: tasks } = await tasksContainer.items.query(tasksQuery).fetchAll();

    // Get completions
    const completionsContainer = getContainer('completions');
    const completionsQuery = since
      ? {
          query: 'SELECT * FROM c WHERE c.familyId = @fid AND c.createdAt > @since',
          parameters: [
            { name: '@fid', value: familyId },
            { name: '@since', value: since },
          ],
        }
      : {
          query: 'SELECT * FROM c WHERE c.familyId = @fid AND c.completedAt > @since',
          parameters: [
            { name: '@fid', value: familyId },
            { name: '@since', value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
          ],
        };
    const { resources: completions } = await completionsContainer.items.query(completionsQuery).fetchAll();

    // Get profiles
    const profilesContainer = getContainer('profiles');
    const { resources: profiles } = await profilesContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.familyId = @fid',
        parameters: [{ name: '@fid', value: familyId }],
      })
      .fetchAll();

    return {
      jsonBody: {
        tasks,
        completions,
        profiles,
        family: membership.family,
        syncedAt: now,
      },
    };
  },
});
