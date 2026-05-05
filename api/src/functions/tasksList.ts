import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { getContainer, getAuthUser, verifyFamilyMember } from '../shared.js';

app.http('tasksList', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const user = getAuthUser(req);
    if (!user) return { status: 401, jsonBody: { error: 'Authentication required' } };

    const familyId = req.query.get('familyId');
    if (!familyId) return { status: 400, jsonBody: { error: 'familyId required' } };

    const membership = await verifyFamilyMember(user.userId, familyId);
    if (!membership) return { status: 403, jsonBody: { error: 'Not a member of this family' } };

    const tasksContainer = getContainer('tasks');
    const persona = membership.member.persona;

    let query;
    if (persona === 'rookie') {
      query = {
        query: `SELECT * FROM c WHERE c.familyId = @fid AND (
          c.frequency IN ('daily', 'weekly') OR
          ARRAY_CONTAINS(c.assignedTo, @uid)
        )`,
        parameters: [
          { name: '@fid', value: familyId },
          { name: '@uid', value: user.userId },
        ],
      };
    } else {
      query = {
        query: 'SELECT * FROM c WHERE c.familyId = @fid',
        parameters: [{ name: '@fid', value: familyId }],
      };
    }

    const { resources: tasks } = await tasksContainer.items.query(query).fetchAll();
    return { jsonBody: { tasks } };
  },
});
