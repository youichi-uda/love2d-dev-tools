import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('assets/checker', () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'love2d-assets-'));
    fs.writeFileSync(path.join(tmpDir, 'main.lua'), '');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should export AssetChecker', async () => {
    const { AssetChecker } = await import('../assets/checker');
    expect(typeof AssetChecker).toBe('function');
  });

  it('should detect missing asset references', async () => {
    const vscode = await import('vscode');
    const { AssetChecker } = await import('../assets/checker');

    const origWorkspace = vscode.workspace;
    Object.defineProperty(vscode, 'workspace', {
      value: {
        ...origWorkspace,
        workspaceFolders: [{ uri: { fsPath: tmpDir }, name: 'test', index: 0 }],
      },
      configurable: true,
    });

    const collectedDiags: unknown[][] = [];
    vi.spyOn(vscode.languages, 'createDiagnosticCollection').mockReturnValue({
      set: (_uri: unknown, diags: unknown[]) => { collectedDiags.push(diags); },
      delete: () => {},
      clear: () => {},
      dispose: () => {},
    } as unknown as ReturnType<typeof vscode.languages.createDiagnosticCollection>);

    const checker = new AssetChecker();

    const luaContent = `
      local img = love.graphics.newImage("sprites/player.png")
      local snd = love.audio.newSource("sounds/jump.wav", "static")
    `;

    const mockDoc = {
      languageId: 'lua',
      uri: { fsPath: path.join(tmpDir, 'main.lua') },
      getText: () => luaContent,
      positionAt: (offset: number) => ({ line: 0, character: offset }),
    };

    checker.checkDocument(mockDoc as unknown as import('vscode').TextDocument);

    expect(collectedDiags.length).toBeGreaterThan(0);
    const lastDiags = collectedDiags[collectedDiags.length - 1] as { message: string }[];
    expect(lastDiags).toHaveLength(2);
    expect(lastDiags[0].message).toContain('sprites/player.png');
    expect(lastDiags[1].message).toContain('sounds/jump.wav');

    // Restore
    Object.defineProperty(vscode, 'workspace', { value: origWorkspace, configurable: true });
  });

  it('should not flag existing assets', async () => {
    const vscode = await import('vscode');
    const { AssetChecker } = await import('../assets/checker');

    const origWorkspace = vscode.workspace;
    Object.defineProperty(vscode, 'workspace', {
      value: {
        ...origWorkspace,
        workspaceFolders: [{ uri: { fsPath: tmpDir }, name: 'test', index: 0 }],
      },
      configurable: true,
    });

    fs.mkdirSync(path.join(tmpDir, 'sprites'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'sprites', 'player.png'), '');

    const collectedDiags: unknown[][] = [];
    vi.spyOn(vscode.languages, 'createDiagnosticCollection').mockReturnValue({
      set: (_uri: unknown, diags: unknown[]) => { collectedDiags.push(diags); },
      delete: () => {},
      clear: () => {},
      dispose: () => {},
    } as unknown as ReturnType<typeof vscode.languages.createDiagnosticCollection>);

    const checker = new AssetChecker();

    const luaContent = `local img = love.graphics.newImage("sprites/player.png")`;
    const mockDoc = {
      languageId: 'lua',
      uri: { fsPath: path.join(tmpDir, 'main.lua') },
      getText: () => luaContent,
      positionAt: (offset: number) => ({ line: 0, character: offset }),
    };

    checker.checkDocument(mockDoc as unknown as import('vscode').TextDocument);

    expect(collectedDiags.length).toBeGreaterThan(0);
    const lastDiags = collectedDiags[collectedDiags.length - 1] as unknown[];
    expect(lastDiags).toHaveLength(0);

    Object.defineProperty(vscode, 'workspace', { value: origWorkspace, configurable: true });
  });
});
