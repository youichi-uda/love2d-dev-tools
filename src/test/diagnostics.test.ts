import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('language/diagnostics', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export EnhancedDiagnostics', async () => {
    const { EnhancedDiagnostics } = await import('../language/diagnostics');
    expect(typeof EnhancedDiagnostics).toBe('function');
  });

  it('should detect unused require statements', async () => {
    const vscode = await import('vscode');
    const { EnhancedDiagnostics } = await import('../language/diagnostics');

    const collectedDiags: unknown[][] = [];
    vi.spyOn(vscode.languages, 'createDiagnosticCollection').mockReturnValue({
      set: (_uri: unknown, diags: unknown[]) => { collectedDiags.push(diags); },
      delete: () => {},
      clear: () => {},
      dispose: () => {},
    } as unknown as ReturnType<typeof vscode.languages.createDiagnosticCollection>);

    const checker = new EnhancedDiagnostics();

    const text = `local unused = require("some.module")\nlocal used = require("other")\nprint(used)`;
    const mockDoc = {
      languageId: 'lua',
      uri: { fsPath: '/test/main.lua' },
      getText: () => text,
      positionAt: (offset: number) => {
        const before = text.substring(0, offset);
        const lines = before.split('\n');
        return new vscode.Position(lines.length - 1, lines[lines.length - 1].length);
      },
    };

    checker.checkDocument(mockDoc as never);

    expect(collectedDiags.length).toBeGreaterThan(0);
    const lastDiags = collectedDiags[collectedDiags.length - 1] as { message: string; code?: string }[];
    const unusedDiag = lastDiags.find(d => d.code === 'unused-require');
    expect(unusedDiag).toBeDefined();
    expect(unusedDiag!.message).toContain('unused');
  });

  it('should not flag used require statements', async () => {
    const vscode = await import('vscode');
    const { EnhancedDiagnostics } = await import('../language/diagnostics');

    const collectedDiags: unknown[][] = [];
    vi.spyOn(vscode.languages, 'createDiagnosticCollection').mockReturnValue({
      set: (_uri: unknown, diags: unknown[]) => { collectedDiags.push(diags); },
      delete: () => {},
      clear: () => {},
      dispose: () => {},
    } as unknown as ReturnType<typeof vscode.languages.createDiagnosticCollection>);

    const checker = new EnhancedDiagnostics();

    const text = `local player = require("player")\nplayer.update()`;
    const mockDoc = {
      languageId: 'lua',
      uri: { fsPath: '/test/main.lua' },
      getText: () => text,
      positionAt: (offset: number) => {
        const before = text.substring(0, offset);
        const lines = before.split('\n');
        return new vscode.Position(lines.length - 1, lines[lines.length - 1].length);
      },
    };

    checker.checkDocument(mockDoc as never);

    const lastDiags = collectedDiags[collectedDiags.length - 1] as { code?: string }[];
    const unusedDiag = lastDiags.find(d => d.code === 'unused-require');
    expect(unusedDiag).toBeUndefined();
  });
});
