import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('language/symbols', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export Love2DDocumentSymbolProvider', async () => {
    const { Love2DDocumentSymbolProvider } = await import('../language/symbols');
    expect(typeof Love2DDocumentSymbolProvider).toBe('function');
  });

  it('should detect function definitions', async () => {
    const vscode = await import('vscode');
    const { Love2DDocumentSymbolProvider } = await import('../language/symbols');

    const provider = new Love2DDocumentSymbolProvider();
    const text = [
      'function love.load()',
      '  -- init',
      'end',
      '',
      'function love.update(dt)',
      '  -- update',
      'end',
      '',
      'local function draw()',
      '  -- draw',
      'end',
    ].join('\n');

    const mockDoc = {
      getText: () => text,
      positionAt: (offset: number) => {
        const before = text.substring(0, offset);
        const lines = before.split('\n');
        return new vscode.Position(lines.length - 1, lines[lines.length - 1].length);
      },
      lineAt: (line: number) => {
        const lines = text.split('\n');
        const lineText = lines[line] || '';
        return {
          text: lineText,
          range: {
            end: new vscode.Position(line, lineText.length),
          },
        };
      },
    };

    const symbols = provider.provideDocumentSymbols(
      mockDoc as never,
      {} as never,
    );

    const funcNames = symbols.map((s: { name: string }) => s.name);
    expect(funcNames).toContain('love.load');
    expect(funcNames).toContain('love.update');
    expect(funcNames).toContain('draw');
  });

  it('should detect require statements', async () => {
    const vscode = await import('vscode');
    const { Love2DDocumentSymbolProvider } = await import('../language/symbols');

    const provider = new Love2DDocumentSymbolProvider();
    const text = 'local player = require("lib.player")\nlocal enemy = require("lib.enemy")';

    const mockDoc = {
      getText: () => text,
      positionAt: (offset: number) => {
        const before = text.substring(0, offset);
        const lines = before.split('\n');
        return new vscode.Position(lines.length - 1, lines[lines.length - 1].length);
      },
      lineAt: (line: number) => {
        const lines = text.split('\n');
        const lineText = lines[line] || '';
        return {
          text: lineText,
          range: { end: new vscode.Position(line, lineText.length) },
        };
      },
    };

    const symbols = provider.provideDocumentSymbols(mockDoc as never, {} as never);

    const moduleNames = symbols
      .filter((s: { kind: number }) => s.kind === vscode.SymbolKind.Module)
      .map((s: { name: string }) => s.name);

    expect(moduleNames).toContain('player');
    expect(moduleNames).toContain('enemy');
  });
});
