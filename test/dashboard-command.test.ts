import { describe, expect, it, vi } from 'vitest';
import {
  executeDashboardCommand,
  formatDashboardFallbackFailure,
} from '../src/cli/dashboard-command.js';

describe('executeDashboardCommand', () => {
  it.each([['--help'], ['-h'], ['help']])('%s is non-mutating', async (...args) => {
    const callEndpoint = vi.fn();
    expect(await executeDashboardCommand(args, callEndpoint)).toEqual({ kind: 'help' });
    expect(callEndpoint).not.toHaveBeenCalled();
  });

  it.each([
    { args: ['--help', 'rotate'] },
    { args: ['rotate', '--help'] },
    { args: ['current', 'unexpected', '-h'] },
    { args: ['unexpected', 'help', 'rotate'] },
  ])('treats help anywhere in $args as non-mutating help', async ({ args }) => {
    const callEndpoint = vi.fn();
    expect(await executeDashboardCommand(args, callEndpoint)).toEqual({ kind: 'help' });
    expect(callEndpoint).not.toHaveBeenCalled();
  });

  it.each([{ args: [] }, { args: ['current'] }])('$args gets or creates the current URL and never calls rotate', async ({ args }) => {
    const callEndpoint = vi.fn(async () => ({
      ok: true as const,
      url: 'https://dashboard.test/?t=synthetic-current-token',
    }));
    const result = await executeDashboardCommand(args, callEndpoint);
    expect(callEndpoint).toHaveBeenCalledTimes(1);
    expect(callEndpoint).toHaveBeenCalledWith('/__cli/ensure');
    expect(result).toEqual({
      kind: 'endpoint',
      action: 'current',
      result: { ok: true, url: 'https://dashboard.test/?t=synthetic-current-token' },
    });
  });

  it('rotates only when explicitly requested', async () => {
    const callEndpoint = vi.fn(async () => ({
      ok: true as const,
      url: 'https://dashboard.test/?t=synthetic-rotated-token',
    }));
    const result = await executeDashboardCommand(['rotate'], callEndpoint);
    expect(callEndpoint).toHaveBeenCalledTimes(1);
    expect(callEndpoint).toHaveBeenCalledWith('/__cli/rotate');
    expect(result).toMatchObject({ kind: 'endpoint', action: 'rotate' });
  });

  it.each([
    { args: ['current', 'unexpected'] },
    { args: ['rotate', 'unexpected'] },
    { args: ['current', 'rotate'] },
    { args: ['rotate', 'current'] },
  ])('rejects extra argv in $args without touching either endpoint', async ({ args }) => {
    const callEndpoint = vi.fn();
    expect(await executeDashboardCommand(args, callEndpoint)).toEqual({
      kind: 'invalid',
      argument: args.join(' '),
    });
    expect(callEndpoint).not.toHaveBeenCalled();
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

describe('formatDashboardFallbackFailure', () => {
  it.each([
    {
      failure: { ok: false as const, reason: 'auth-failed' as const },
      expected: 'Dashboard lookup failed: auth-failed',
    },
    {
      failure: { ok: false as const, reason: 'http-error' as const, detail: '500 upstream error' },
      expected: 'Dashboard lookup failed: 500 upstream error',
    },
    {
      failure: {
        ok: false as const,
        reason: 'http-error' as const,
        detail: 'malformed response (no url)',
      },
      expected: 'Dashboard lookup failed: malformed response (no url)',
    },
  ])('labels current failures as a lookup failure: $failure', ({ failure, expected }) => {
    const message = formatDashboardFallbackFailure('current', failure);
    expect(message).toBe(expected);
    expect(message).not.toContain('Rotation');
  });

  it('retains the rotation-specific label for rotate failures', () => {
    expect(formatDashboardFallbackFailure('rotate', {
      ok: false,
      reason: 'http-error',
      detail: '500 upstream error',
    })).toBe('Rotation failed: 500 upstream error');
  });
});
