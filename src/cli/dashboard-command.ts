import type { DashboardEndpoint, DashboardResult } from './dashboard-endpoint.js';

export const DASHBOARD_COMMAND_USAGE = `用法:
  botmux dashboard           获取当前 Dashboard 登录 URL（没有则创建，不轮换已有 token）
  botmux dashboard current   获取当前 Dashboard 登录 URL（没有则创建，不轮换已有 token）
  botmux dashboard rotate    轮换 token，并打印新的 Dashboard 登录 URL`;

export type DashboardCommandExecution =
  | { kind: 'help' }
  | { kind: 'invalid'; argument: string }
  | { kind: 'endpoint'; action: 'current' | 'rotate'; result: DashboardResult };

export function formatDashboardFallbackFailure(
  action: 'current' | 'rotate',
  failure: Extract<DashboardResult, { ok: false }>,
): string {
  const operation = action === 'current' ? 'Dashboard lookup' : 'Rotation';
  return `${operation} failed: ${failure.detail ?? failure.reason}`;
}

/**
 * Parse and dispatch the dashboard subcommand without touching process-global
 * output or credentials. Keeping the endpoint call injected makes the safety
 * property executable in tests: help/invalid invocations cannot accidentally
 * reach the token-rotation endpoint.
 */
export async function executeDashboardCommand(
  args: readonly string[],
  callEndpoint: (path: DashboardEndpoint) => Promise<DashboardResult>,
): Promise<DashboardCommandExecution> {
  if (args.some(arg => ['--help', '-h', 'help'].includes(arg.toLowerCase()))) {
    return { kind: 'help' };
  }
  if (args.length > 1) return { kind: 'invalid', argument: args.join(' ') };

  const raw = args[0]?.toLowerCase();

  if (raw !== undefined && raw !== 'current' && raw !== 'rotate') {
    return { kind: 'invalid', argument: args[0] };
  }

  const action = raw === 'rotate' ? 'rotate' : 'current';
  const path: DashboardEndpoint = action === 'current' ? '/__cli/ensure' : '/__cli/rotate';
  return { kind: 'endpoint', action, result: await callEndpoint(path) };
}
