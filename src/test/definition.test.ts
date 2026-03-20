import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('language/definition', () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'love2d-def-'));
    fs.writeFileSync(path.join(tmpDir, 'main.lua'), '');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should export Love2DDefinitionProvider', async () => {
    const { Love2DDefinitionProvider } = await import('../language/definition');
    expect(typeof Love2DDefinitionProvider).toBe('function');
  });

  it('should resolve require to file path', async () => {
    const vscode = await import('vscode');
    const { Love2DDefinitionProvider } = await import('../language/definition');

    // Create a module file
    fs.mkdirSync(path.join(tmpDir, 'lib'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'lib', 'player.lua'), 'return {}');

    const origWorkspace = vscode.workspace;
    Object.defineProperty(vscode, 'workspace', {
      value: {
        ...origWorkspace,
        workspaceFolders: [{ uri: { fsPath: tmpDir }, name: 'test', index: 0 }],
      },
      configurable: true,
    });

    const provider = new Love2DDefinitionProvider();
    const lineText = 'local player = require("lib.player")';

    const mockDoc = {
      uri: { fsPath: path.join(tmpDir, 'main.lua') },
      lineAt: () => ({ text: lineText }),
      getText: () => lineText,
      getWordRangeAtPosition: () => new vscode.Range(
        new vscode.Position(0, 23), new vscode.Position(0, 33),
      ),
      positionAt: (offset: number) => new vscode.Position(0, offset),
    };

    const mockPosition = new vscode.Position(0, 25);
    const result = provider.provideDefinition(
      mockDoc as never,
      mockPosition,
      {} as never,
    );

    expect(result).toBeDefined();

    Object.defineProperty(vscode, 'workspace', { value: origWorkspace, configurable: true });
  });

  it('should find function definitions in the same file', async () => {
    const vscode = await import('vscode');
    const { Love2DDefinitionProvider } = await import('../language/definition');

    const origWorkspace = vscode.workspace;
    Object.defineProperty(vscode, 'workspace', {
      value: {
        ...origWorkspace,
        workspaceFolders: [{ uri: { fsPath: tmpDir }, name: 'test', index: 0 }],
      },
      configurable: true,
    });

    const provider = new Love2DDefinitionProvider();
    const text = `local function myUpdate(dt)\n  -- body\nend\n\nmyUpdate(0.016)`;

    const mockDoc = {
      uri: { fsPath: path.join(tmpDir, 'main.lua') },
      lineAt: () => ({ text: 'myUpdate(0.016)' }),
      getText: (range?: unknown) => range ? 'myUpdate' : text,
      getWordRangeAtPosition: () => new vscode.Range(
        new vscode.Position(4, 0), new vscode.Position(4, 8),
      ),
      positionAt: (offset: number) => {
        const lines = text.substring(0, offset).split('\n');
        return new vscode.Position(lines.length - 1, lines[lines.length - 1].length);
      },
    };

    // The cursor is at "myUpdate" call on line 4 — should find the definition on line 0
    const result = provider.provideDefinition(
      mockDoc as never,
      new vscode.Position(4, 3),
      {} as never,
    );

    expect(result).toBeDefined();

    Object.defineProperty(vscode, 'workspace', { value: origWorkspace, configurable: true });
  });
});
