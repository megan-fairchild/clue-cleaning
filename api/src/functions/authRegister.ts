import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { getContainer, hashPassword, createToken, verifyToken, type UserDoc } from '../shared.js';

/**
 * POST /api/auth/register
 * First user becomes admin. Subsequent users require admin token.
 * Body: { username, password, name, persona }
 */
app.http('authRegister', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/register',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const body = (await req.json()) as {
      username?: string;
      password?: string;
      name?: string;
      persona?: string;
      familyId?: string;
    };
    const { username, password, name, persona, familyId } = body;

    if (!username || !password || !name) {
      return { status: 400, jsonBody: { error: 'username, password, and name are required' } };
    }
    if (password.length < 4) {
      return { status: 400, jsonBody: { error: 'Password must be at least 4 characters' } };
    }

    const usersContainer = getContainer('users');

    // Check if username is taken
    const { resources: existing } = await usersContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.username = @u',
        parameters: [{ name: '@u', value: username.toLowerCase().trim() }],
      })
      .fetchAll();

    if (existing.length > 0) {
      return { status: 409, jsonBody: { error: 'Username already taken' } };
    }

    // Check if this is the first user (becomes admin)
    const { resources: allUsers } = await usersContainer.items
      .query({ query: 'SELECT VALUE COUNT(1) FROM c' })
      .fetchAll();
    const isFirstUser = (allUsers[0] ?? 0) === 0;

    // If not first user, require admin authorization
    if (!isFirstUser) {
      const authHeader = req.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return { status: 401, jsonBody: { error: 'Admin authorization required to register new users' } };
      }
      const decoded = verifyToken(authHeader.slice(7));
      if (!decoded || decoded.role !== 'admin') {
        return { status: 403, jsonBody: { error: 'Only admins can register new users' } };
      }
    }

    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();

    const userDoc: UserDoc = {
      id: userId,
      partitionKey: userId,
      username: username.toLowerCase().trim(),
      passwordHash,
      familyId: familyId || null,
      role: isFirstUser ? 'admin' : 'member',
      persona: persona || 'agent',
      name: name.trim(),
      createdAt: now,
      updatedAt: now,
    };

    await usersContainer.items.create(userDoc);

    const token = createToken({
      userId,
      username: userDoc.username,
      familyId: userDoc.familyId,
      role: userDoc.role,
    });

    return {
      status: 201,
      jsonBody: {
        user: { id: userId, username: userDoc.username, name: userDoc.name, role: userDoc.role, persona: userDoc.persona },
        token,
      },
    };
  },
});
