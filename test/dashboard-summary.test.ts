import { describe, expect, it } from 'vitest';
import {
  buildDashboardSummary,
  unavailableDashboardSummary,
} from '../src/dashboard/dashboard-summary.js';

describe('buildDashboardSummary', () => {
  it('returns only the redacted aggregate contract', () => {
    const summary = buildDashboardSummary({
      generatedAt: new Date('2026-08-08T09:30:00.000Z'),
      configuredBotCount: 3,
      onlineBotCount: 3,
      sessions: [
        {
          sessionId: 'secret-session',
          status: 'working',
          title: 'private prompt',
          workingDir: '/private/repo',
          chatId: 'oc_private',
          larkAppId: 'cli_private',
        },
        { status: 'idle', agentAttention: { reason: 'private reason' } },
        { status: 'limited' },
        { status: 'closed', agentAttention: { reason: 'closed is not attention' } },
      ],
      schedules: [
        { enabled: true, nextRunAt: '2026-08-09T08:00:00+08:00', prompt: 'private schedule prompt' },
        { enabled: true, nextRunAt: '2026-08-08T19:00:00.000Z' },
        { enabled: false, nextRunAt: '2026-08-08T18:00:00.000Z' },
        { enabled: true, nextRunAt: 'not-a-date' },
      ],
    });

    expect(summary).toEqual({
      schemaVersion: 1,
      generatedAt: '2026-08-08T09:30:00.000Z',
      service: { status: 'healthy' },
      bots: { online: 3 },
      sessions: { active: 3, attention: 2 },
      schedules: { enabled: 3, nextRunAt: '2026-08-08T19:00:00.000Z' },
      dashboard: { href: '/' },
    });
    expect(JSON.stringify(summary)).not.toMatch(
      /secret-session|private prompt|private\/repo|oc_private|cli_private|private reason|schedule prompt/,
    );
  });

  it('marks a partial bot fleet degraded and uses null when no enabled task has a valid next run', () => {
    expect(buildDashboardSummary({
      generatedAt: new Date('2026-08-08T09:30:00.000Z'),
      configuredBotCount: 3,
      onlineBotCount: 2,
      sessions: [],
      schedules: [{ enabled: false, nextRunAt: '2026-08-09T00:00:00.000Z' }],
    })).toEqual({
      schemaVersion: 1,
      generatedAt: '2026-08-08T09:30:00.000Z',
      service: { status: 'degraded' },
      bots: { online: 2 },
      sessions: { active: 0, attention: 0 },
      schedules: { enabled: 0, nextRunAt: null },
      dashboard: { href: '/' },
    });
  });

  it('does not invent aggregate zeroes when the live snapshot is unavailable', () => {
    expect(unavailableDashboardSummary(new Date('2026-08-08T09:30:00.000Z'))).toEqual({
      schemaVersion: 1,
      generatedAt: '2026-08-08T09:30:00.000Z',
      service: { status: 'degraded' },
    });
  });
});
