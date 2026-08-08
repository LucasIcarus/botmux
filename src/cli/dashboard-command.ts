import type { DashboardEndpoint, DashboardResult } from './dashboard-endpoint.js';

export const DASHBOARD_COMMAND_USAGE = `用法:
  botmux dashboard current   打印当前 Dashboard 登录 URL（不轮换 token）
  botmux dashboard rotate    轮换 token，并打印新的 Dashboard 登录 URL
  botmux dashboard           rotate 的兼容别名`;

export type DashboardCommandExecution =
  | { kind: 'help' }
  | { kind: 'invalid'; argument: string }
  | { kind: 'endpoint'; action: 'current' | 'rotate'; result: DashboardResult };

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
  const raw = args[0]?.toLowerCase();
  if (raw === '--help' || raw === '-h' || raw === 'help') return { kind: 'help' };

  if (raw !== undefined && raw !== 'current' && raw !== 'rotate') {
    return { kind: 'invalid', argument: args[0] };
  }

  const action = raw === 'current' ? 'current' : 'rotate';
  const path: DashboardEndpoint = action === 'current' ? '/__cli/current' : '/__cli/rotate';
  return { kind: 'endpoint', action, result: await callEndpoint(path) };
}
