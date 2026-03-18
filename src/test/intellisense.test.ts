import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('intellisense/setup', () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'love2d-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should export setupIntelliSense and promptIntelliSenseSetup', async () => {
    const mod = await import('../intellisense/setup');
    expect(typeof mod.setupIntelliSense).toBe('function');
    expect(typeof mod.promptIntelliSenseSetup).toBe('function');
  });

  it('should create .vscode/settings.json with Love2D config', async () => {
    const vscode = await import('vscode');

    // Mock sumneko.lua as installed
    vi.spyOn(vscode.extensions, 'getExtension').mockImplementation((id: string) => {
      if (id === 'sumneko.lua') return { extensionPath: '/mock' } as unknown as ReturnType<typeof vscode.extensions.getExtension>;
      return undefined;
    });

    const { setupIntelliSense } = await import('../intellisense/setup');
    const folder = { uri: { fsPath: tmpDir }, name: 'test', index: 0 };

    await setupIntelliSense(folder as unknown as import('vscode').WorkspaceFolder);

    const settingsPath = path.join(tmpDir, '.vscode', 'settings.json');
    expect(fs.existsSync(settingsPath)).toBe(true);

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(settings['Lua.workspace.library']).toContain('${3rd}/love2d/library');
    expect(settings['Lua.runtime.version']).toBe('LuaJIT');
  });

  it('should merge with existing settings.json', async () => {
    const vscode = await import('vscode');
    vi.spyOn(vscode.extensions, 'getExtension').mockImplementation((id: string) => {
      if (id === 'sumneko.lua') return { extensionPath: '/mock' } as unknown as ReturnType<typeof vscode.extensions.getExtension>;
      return undefined;
    });

    // Create existing settings
    const vscodeDir = path.join(tmpDir, '.vscode');
    fs.mkdirSync(vscodeDir, { recursive: true });
    fs.writeFileSync(
      path.join(vscodeDir, 'settings.json'),
      JSON.stringify({ 'editor.fontSize': 14 }, null, 2),
    );

    const { setupIntelliSense } = await import('../intellisense/setup');
    const folder = { uri: { fsPath: tmpDir }, name: 'test', index: 0 };

    await setupIntelliSense(folder as unknown as import('vscode').WorkspaceFolder);

    const settings = JSON.parse(
      fs.readFileSync(path.join(vscodeDir, 'settings.json'), 'utf-8'),
    );
    // Original setting preserved
    expect(settings['editor.fontSize']).toBe(14);
    // Love2D settings added
    expect(settings['Lua.workspace.library']).toBeDefined();
  });

  it('should skip if Love2D library already configured', async () => {
    const vscode = await import('vscode');
    vi.spyOn(vscode.extensions, 'getExtension').mockReturnValue(
      { extensionPath: '/mock' } as unknown as ReturnType<typeof vscode.extensions.getExtension>,
    );

    const showInfoSpy = vi.spyOn(vscode.window, 'showInformationMessage');

    const vscodeDir = path.join(tmpDir, '.vscode');
    fs.mkdirSync(vscodeDir, { recursive: true });
    fs.writeFileSync(
      path.join(vscodeDir, 'settings.json'),
      JSON.stringify({ 'Lua.workspace.library': ['${3rd}/love2d/library'] }),
    );

    const { setupIntelliSense } = await import('../intellisense/setup');
    const folder = { uri: { fsPath: tmpDir }, name: 'test', index: 0 };

    await setupIntelliSense(folder as unknown as import('vscode').WorkspaceFolder);

    expect(showInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('already'),
    );
  });

  it('should warn if sumneko.lua not installed', async () => {
    const vscode = await import('vscode');
    vi.spyOn(vscode.extensions, 'getExtension').mockReturnValue(undefined);
    const warnSpy = vi.spyOn(vscode.window, 'showWarningMessage');

    const { setupIntelliSense } = await import('../intellisense/setup');
    const folder = { uri: { fsPath: tmpDir }, name: 'test', index: 0 };

    await setupIntelliSense(folder as unknown as import('vscode').WorkspaceFolder);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('sumneko.lua'),
      expect.anything(),
      expect.anything(),
    );
  });
});
