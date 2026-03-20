import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.mock for ESM-incompatible modules
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, existsSync: vi.fn(actual.existsSync) };
});

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return { ...actual, execFile: vi.fn(actual.execFile) };
});

import * as fs from 'fs';
import * as childProcess from 'child_process';

describe('detector', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export detectLovePath function', async () => {
    const { detectLovePath } = await import('../runner/detector');
    expect(typeof detectLovePath).toBe('function');
  });

  it('should export getLoveVersion function', async () => {
    const { getLoveVersion } = await import('../runner/detector');
    expect(typeof getLoveVersion).toBe('function');
  });

  it('should return configured path if it exists', async () => {
    const vscode = await import('vscode');
    vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
      get: (_key: string, _def?: unknown) => {
        if (_key === 'lovePath') return '/mock/love';
        return _def;
      },
      update: vi.fn(),
    } as unknown as ReturnType<typeof vscode.workspace.getConfiguration>);

    vi.mocked(fs.existsSync).mockImplementation((p) => p === '/mock/love');

    const { detectLovePath } = await import('../runner/detector');
    const result = await detectLovePath();
    expect(result).toBe('/mock/love');
  });

  it('should parse version from love --version output', async () => {
    const { getLoveVersion } = await import('../runner/detector');

    vi.mocked(childProcess.execFile).mockImplementation(
      ((_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        (cb as (err: null, stdout: string) => void)(null, 'LOVE 11.5 (Mysterious Mysteries)');
      }) as unknown as typeof childProcess.execFile,
    );

    const version = await getLoveVersion('/usr/bin/love');
    expect(version).toBe('11.5');
  });

  it('should return undefined on version parse failure', async () => {
    const { getLoveVersion } = await import('../runner/detector');

    vi.mocked(childProcess.execFile).mockImplementation(
      ((_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        (cb as (err: Error, stdout: string) => void)(new Error('not found'), '');
      }) as unknown as typeof childProcess.execFile,
    );

    const version = await getLoveVersion('/usr/bin/love');
    expect(version).toBeUndefined();
  });
});
