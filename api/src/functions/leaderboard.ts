import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { getContainer, getAuthUser, verifyFamilyMember } from '../shared.js';

app.http('leaderboard', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'leaderboard',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const user = getAuthUser(req);
    if (!user) return { status: 401, jsonBody: { error: 'Authentication required' } };

    const familyId = req.query.get('familyId');
    if (!familyId) return { status: 400, jsonBody: { error: 'familyId required' } };

    const membership = await verifyFamilyMember(user.userId, familyId);
    if (!membership) return { status: 403, jsonBody: { error: 'Not a member of this family' } };

    // Get completions for this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const completionsContainer = getContainer('completions');
    const { resources: weekCompletions } = await completionsContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.familyId = @fid AND c.completedAt >= @start',
        parameters: [
          { name: '@fid', value: familyId },
          { name: '@start', value: weekStart.toISOString() },
        ],
      })
      .fetchAll();

    // Aggregate by user
    const leaderboard: Record<string, { userId: string; name: string; weekXP: number; weekTasks: number }> = {};
    for (const comp of weekCompletions) {
      if (!leaderboard[comp.userId]) {
        leaderboard[comp.userId] = { userId: comp.userId, name: comp.userName, weekXP: 0, weekTasks: 0 };
      }
      leaderboard[comp.userId].weekXP += comp.xpEarned || 0;
      leaderboard[comp.userId].weekTasks += 1;
    }

    // Add profile data
    const profilesContainer = getContainer('profiles');
    const { resources: profiles } = await profilesContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.familyId = @fid',
        parameters: [{ name: '@fid', value: familyId }],
      })
      .fetchAll();

    const ranked = profiles
      .map((p: { id: string; name: string; persona: string; xp?: number; streak?: number }) => ({
        userId: p.id,
        name: p.name,
        persona: p.persona,
        totalXP: p.xp || 0,
        streak: p.streak || 0,
        weekXP: leaderboard[p.id]?.weekXP || 0,
        weekTasks: leaderboard[p.id]?.weekTasks || 0,
      }))
      .sort((a, b) => b.weekXP - a.weekXP);

    // Activity feed (last 20 completions)
    const { resources: recentActivity } = await completionsContainer.items
      .query({
        query: 'SELECT TOP 20 * FROM c WHERE c.familyId = @fid ORDER BY c.completedAt DESC',
        parameters: [{ name: '@fid', value: familyId }],
      })
      .fetchAll();

    return { jsonBody: { leaderboard: ranked, activity: recentActivity } };
  },
});
