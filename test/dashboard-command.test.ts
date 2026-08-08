import { describe, expect, it, vi } from 'vitest';
import {
  executeDashboardCommand,
} from '../src/cli/dashboard-command.js';

describe('executeDashboardCommand', () => {
  it.each([['--help'], ['-h'], ['help']])('%s is non-mutating', async (...args) => {
    const callEndpoint = vi.fn();
    expect(await executeDashboardCommand(args, callEndpoint)).toEqual({ kind: 'help' });
    expect(callEndpoint).not.toHaveBeenCalled();
  });

  it('current reads the existing URL and never calls rotate', async () => {
    const callEndpoint = vi.fn(async () => ({
      ok: true as const,
      url: 'https://dashboard.test/?t=synthetic-current-token',
    }));
    const result = await executeDashboardCommand(['current'], callEndpoint);
    expect(callEndpoint).toHaveBeenCalledTimes(1);
    expect(callEndpoint).toHaveBeenCalledWith('/__cli/current');
    expect(result).toEqual({
      kind: 'endpoint',
      action: 'current',
      result: { ok: true, url: 'https://dashboard.test/?t=synthetic-current-token' },
    });
  });

  it.each([{ args: [] }, { args: ['rotate'] }])('$args preserves explicit and legacy rotation', async ({ args }) => {
    const callEndpoint = vi.fn(async () => ({
      ok: true as const,
      url: 'https://dashboard.test/?t=synthetic-rotated-token',
    }));
    const result = await executeDashboardCommand(args, callEndpoint);
    expect(callEndpoint).toHaveBeenCalledTimes(1);
    expect(callEndpoint).toHaveBeenCalledWith('/__cli/rotate');
    expect(result).toMatchObject({ kind: 'endpoint', action: 'rotate' });
  });

  it('rejects unknown subcommands without touching either endpoint', async () => {
    const callEndpoint = vi.fn();
    expect(await executeDashboardCommand(['wat'], callEndpoint)).toEqual({
      kind: 'invalid',
      argument: 'wat',
    });
    expect(callEndpoint).not.toHaveBeenCalled();
  });
});
