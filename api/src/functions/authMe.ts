import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { getContainer, getAuthUser, type UserDoc } from '../shared.js';

/**
 * GET /api/auth/me
 * Returns current user info from token
 *
 * GET /api/auth/users
 * Admin only — returns all users in the family
 */
app.http('authMe', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'auth/me',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const user = getAuthUser(req);
    if (!user) return { status: 401, jsonBody: { error: 'Not authenticated' } };

    const usersContainer = getContainer('users');
    try {
      const { resource } = await usersContainer.item(user.userId, user.userId).read<UserDoc>();
      if (!resource) return { status: 404, jsonBody: { error: 'User not found' } };

      return {
        jsonBody: {
          user: {
            id: resource.id,
            username: resource.username,
            name: resource.name,
            role: resource.role,
            persona: resource.persona,
            familyId: resource.familyId,
          },
        },
      };
    } catch {
      return { status: 404, jsonBody: { error: 'User not found' } };
    }
  },
});

app.http('authUsers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'auth/users',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const user = getAuthUser(req);
    if (!user) return { status: 401, jsonBody: { error: 'Not authenticated' } };
    if (user.role !== 'admin') return { status: 403, jsonBody: { error: 'Admin access required' } };

    const usersContainer = getContainer('users');
    const { resources } = await usersContainer.items
      .query({ query: 'SELECT c.id, c.username, c.name, c.role, c.persona, c.familyId, c.createdAt FROM c' })
      .fetchAll();

    return { jsonBody: { users: resources } };
  },
});
