import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { getContainer, hashPassword, createToken, type UserDoc } from '../shared.js';

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { user, token }
 */
app.http('authLogin', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/login',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const body = (await req.json()) as { username?: string; password?: string };
    const { username, password } = body;

    if (!username || !password) {
      return { status: 400, jsonBody: { error: 'username and password required' } };
    }

    const usersContainer = getContainer('users');
    const { resources } = await usersContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.username = @u',
        parameters: [{ name: '@u', value: username.toLowerCase().trim() }],
      })
      .fetchAll();

    if (resources.length === 0) {
      return { status: 401, jsonBody: { error: 'Invalid username or password' } };
    }

    const userDoc = resources[0] as UserDoc;
    const passwordHash = await hashPassword(password);

    if (userDoc.passwordHash !== passwordHash) {
      return { status: 401, jsonBody: { error: 'Invalid username or password' } };
    }

    const token = createToken({
      userId: userDoc.id,
      username: userDoc.username,
      familyId: userDoc.familyId,
      role: userDoc.role,
    });

    return {
      jsonBody: {
        user: {
          id: userDoc.id,
          username: userDoc.username,
          name: userDoc.name,
          role: userDoc.role,
          persona: userDoc.persona,
          familyId: userDoc.familyId,
        },
        token,
      },
    };
  },
});
