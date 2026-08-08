export const DASHBOARD_SUMMARY_SCHEMA_VERSION = 1 as const;

export interface DashboardSummary {
  schemaVersion: typeof DASHBOARD_SUMMARY_SCHEMA_VERSION;
  generatedAt: string;
  service: { status: 'healthy' | 'degraded' };
  bots: { online: number };
  sessions: { active: number; attention: number };
  schedules: { enabled: number; nextRunAt: string | null };
  dashboard: { href: '/' };
}

interface DashboardSummarySessionRow {
  status?: unknown;
  pendingRepo?: unknown;
  tuiPromptActive?: unknown;
  agentAttention?: unknown;
}

interface DashboardSummaryScheduleRow {
  enabled?: unknown;
  nextRunAt?: unknown;
}

/**
 * Reduce the dashboard's rich internal read model to a deliberately tiny
 * public summary contract. Keep the projection here as a positive allowlist:
 * adding a field to a session, schedule, bot descriptor, or dashboard API can
 * never make it appear in this response by accident.
 */
export function buildDashboardSummary(input: {
  generatedAt: Date;
  configuredBotCount: number;
  onlineBotCount: number;
  sessions: readonly DashboardSummarySessionRow[];
  schedules: readonly DashboardSummaryScheduleRow[];
}): DashboardSummary {
  const activeSessions = input.sessions.filter(row => row.status !== 'closed');
  const attentionSessions = activeSessions.filter(row => (
    !!row.agentAttention
    || !!row.pendingRepo
    || !!row.tuiPromptActive
    || row.status === 'limited'
  ));
  const enabledSchedules = input.schedules.filter(row => row.enabled === true);
  const nextRunMs = enabledSchedules.reduce<number | null>((earliest, row) => {
    if (typeof row.nextRunAt !== 'string') return earliest;
    const candidate = Date.parse(row.nextRunAt);
    if (!Number.isFinite(candidate)) return earliest;
    return earliest === null || candidate < earliest ? candidate : earliest;
  }, null);

  return {
    schemaVersion: DASHBOARD_SUMMARY_SCHEMA_VERSION,
    generatedAt: input.generatedAt.toISOString(),
    service: {
      status: input.onlineBotCount === input.configuredBotCount ? 'healthy' : 'degraded',
    },
    bots: { online: input.onlineBotCount },
    sessions: {
      active: activeSessions.length,
      attention: attentionSessions.length,
    },
    schedules: {
      enabled: enabledSchedules.length,
      nextRunAt: nextRunMs === null ? null : new Date(nextRunMs).toISOString(),
    },
    dashboard: { href: '/' },
  };
}

/** Minimal, still-whitelisted body for an upstream snapshot failure. Counts
 * are intentionally absent: returning plausible zeroes would turn missing
 * daemon state into false operational health. The HTTP handler pairs this with
 * 503 so consumers can render an unavailable state. */
export function unavailableDashboardSummary(generatedAt: Date): Pick<DashboardSummary, 'schemaVersion' | 'generatedAt' | 'service'> {
  return {
    schemaVersion: DASHBOARD_SUMMARY_SCHEMA_VERSION,
    generatedAt: generatedAt.toISOString(),
    service: { status: 'degraded' },
  };
}
