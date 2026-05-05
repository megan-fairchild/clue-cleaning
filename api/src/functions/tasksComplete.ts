import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { getContainer, getAuthUser, verifyFamilyMember, getPeriodStart, type Frequency } from '../shared.js';

app.http('tasksComplete', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'tasks/complete',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const user = getAuthUser(req);
    if (!user) return { status: 401, jsonBody: { error: 'Authentication required' } };

    const body = (await req.json()) as { familyId?: string; taskId?: string; operationId?: string };
    const { familyId, taskId, operationId } = body;
    if (!familyId || !taskId) return { status: 400, jsonBody: { error: 'familyId and taskId required' } };

    const membership = await verifyFamilyMember(user.userId, familyId);
    if (!membership) return { status: 403, jsonBody: { error: 'Not a member of this family' } };

    // Get the task
    const tasksContainer = getContainer('tasks');
    let task: { frequency: Frequency; xp: number };
    try {
      const { resource } = await tasksContainer.item(taskId, familyId).read();
      if (!resource) return { status: 404, jsonBody: { error: 'Task not found' } };
      task = resource as { frequency: Frequency; xp: number };
    } catch {
      return { status: 404, jsonBody: { error: 'Task not found' } };
    }

    // Idempotency check
    const completionsContainer = getContainer('completions');
    if (operationId) {
      const { resources: existing } = await completionsContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.operationId = @opId AND c.familyId = @fid',
          parameters: [
            { name: '@opId', value: operationId },
            { name: '@fid', value: familyId },
          ],
        })
        .fetchAll();
      if (existing.length > 0) {
        return { jsonBody: { completion: existing[0], message: 'Already processed' } };
      }
    }

    // Period uniqueness check
    const periodStart = getPeriodStart(task.frequency);
    const uniqueKey = `${familyId}_${taskId}_${user.userId}_${periodStart}`;
    const { resources: duplicates } = await completionsContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.uniqueKey = @key',
        parameters: [{ name: '@key', value: uniqueKey }],
      })
      .fetchAll();

    if (duplicates.length > 0) {
      return { status: 409, jsonBody: { error: 'Task already completed for this period' } };
    }

    // Create completion
    const now = new Date().toISOString();
    const completionId = operationId || crypto.randomUUID();
    const completion = {
      id: completionId,
      partitionKey: familyId,
      familyId,
      taskId,
      userId: user.userId,
      userName: membership.member.name,
      operationId: completionId,
      uniqueKey,
      periodStart,
      xpEarned: task.xp,
      completedAt: now,
      createdAt: now,
    };

    await completionsContainer.items.create(completion);

    // Update user profile XP
    const profilesContainer = getContainer('profiles');
    try {
      const { resources: profiles } = await profilesContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @uid AND c.familyId = @fid',
          parameters: [
            { name: '@uid', value: user.userId },
            { name: '@fid', value: familyId },
          ],
        })
        .fetchAll();

      if (profiles.length > 0) {
        const profile = profiles[0];
        profile.xp = (profile.xp || 0) + task.xp;
        profile.totalCompleted = (profile.totalCompleted || 0) + 1;

        // Streak logic
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (profile.lastCompletionDate !== today) {
          if (profile.lastCompletionDate === yesterday || !profile.lastCompletionDate) {
            profile.streak = (profile.streak || 0) + 1;
          } else {
            profile.streak = 1;
          }
          profile.lastCompletionDate = today;
        }
        profile.updatedAt = now;

        await profilesContainer.item(profile.id, profile.partitionKey).replace(profile);
      }
    } catch {
      // Profile update is non-critical
    }

    return { status: 201, jsonBody: { completion, xpEarned: task.xp } };
  },
});
