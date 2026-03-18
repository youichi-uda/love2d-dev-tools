import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('debug/setup', () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'love2d-debug-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should export setupDebugger', async () => {
    const mod = await import('../debug/setup');
    expect(typeof mod.setupDebugger).toBe('function');
  });

  it('should generate launch.json with correct configurations', async () => {
    const vscode = await import('vscode');
    // Mock debugger extension as installed
    vi.spyOn(vscode.extensions, 'getExtension').mockImplementation((id: string) => {
      if (id === 'tomblind.local-lua-debugger-vscode') {
        return { extensionPath: '/mock' } as unknown as ReturnType<typeof vscode.extensions.getExtension>;
      }
      return undefined;
    });

    const { setupDebugger } = await import('../debug/setup');
    const folder = { uri: { fsPath: tmpDir }, name: 'test', index: 0 };

    await setupDebugger(folder as unknown as import('vscode').WorkspaceFolder);

    const launchPath = path.join(tmpDir, '.vscode', 'launch.json');
    expect(fs.existsSync(launchPath)).toBe(true);

    const launch = JSON.parse(fs.readFileSync(launchPath, 'utf-8'));
    expect(launch.version).toBe('0.2.0');
    expect(launch.configurations).toHaveLength(2);

    const debugConfig = launch.configurations[0];
    expect(debugConfig.type).toBe('lua-local');
    expect(debugConfig.name).toBe('Love2D: Debug');
    expect(debugConfig.args).toContain('debug');

    const runConfig = launch.configurations[1];
    expect(runConfig.name).toBe('Love2D: Run');
    expect(runConfig.args).not.toContain('debug');
  });

  it('should warn if debugger extension not installed', async () => {
    const vscode = await import('vscode');
    vi.spyOn(vscode.extensions, 'getExtension').mockReturnValue(undefined);
    const warnSpy = vi.spyOn(vscode.window, 'showWarningMessage');

    const { setupDebugger } = await import('../debug/setup');
    const folder = { uri: { fsPath: tmpDir }, name: 'test', index: 0 };

    await setupDebugger(folder as unknown as import('vscode').WorkspaceFolder);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('local-lua-debugger'),
      expect.anything(),
      expect.anything(),
    );
    // launch.json should NOT be created
    expect(fs.existsSync(path.join(tmpDir, '.vscode', 'launch.json'))).toBe(false);
  });

  it('should ask before overwriting existing launch.json', async () => {
    const vscode = await import('vscode');
    vi.spyOn(vscode.extensions, 'getExtension').mockReturnValue(
      { extensionPath: '/mock' } as unknown as ReturnType<typeof vscode.extensions.getExtension>,
    );

    // Create existing launch.json
    const vscodeDir = path.join(tmpDir, '.vscode');
    fs.mkdirSync(vscodeDir, { recursive: true });
    fs.writeFileSync(path.join(vscodeDir, 'launch.json'), '{}');

    // User cancels
    vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined);

    const { setupDebugger } = await import('../debug/setup');
    const folder = { uri: { fsPath: tmpDir }, name: 'test', index: 0 };

    await setupDebugger(folder as unknown as import('vscode').WorkspaceFolder);

    // Should still have original content
    const content = fs.readFileSync(path.join(vscodeDir, 'launch.json'), 'utf-8');
    expect(content).toBe('{}');
  });
});
