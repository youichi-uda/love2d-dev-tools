import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('language/actions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export Love2DCodeActionProvider', async () => {
    const { Love2DCodeActionProvider } = await import('../language/actions');
    expect(typeof Love2DCodeActionProvider).toBe('function');
  });

  it('should provide remove-require action for unused-require diagnostic', async () => {
    const vscode = await import('vscode');
    const { Love2DCodeActionProvider } = await import('../language/actions');

    const provider = new Love2DCodeActionProvider();
    const text = 'local unused = require("foo")\n';

    const mockDoc = {
      getText: () => text,
      lineAt: (line: number) => ({
        text: text.split('\n')[line],
        range: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, text.split('\n')[line].length)),
        rangeIncludingLineBreak: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line + 1, 0)),
      }),
      uri: { fsPath: '/test/main.lua' },
    };

    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 29)),
      'Unused require',
      vscode.DiagnosticSeverity.Hint,
    );
    diagnostic.source = 'Love2D';
    diagnostic.code = 'unused-require';

    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 29));
    const actions = provider.provideCodeActions(
      mockDoc as never,
      range,
      { diagnostics: [diagnostic] },
      {} as never,
    );

    const removeAction = actions.find((a: { title: string }) => a.title.includes('Remove'));
    expect(removeAction).toBeDefined();
  });

  it('should provide generate-function action for undefined function calls', async () => {
    const vscode = await import('vscode');
    const { Love2DCodeActionProvider } = await import('../language/actions');

    const provider = new Love2DCodeActionProvider();
    const text = 'doSomething(42)\n';

    const mockDoc = {
      getText: () => text,
      lineAt: (line: number) => ({
        text: text.split('\n')[line],
        range: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, text.split('\n')[line].length)),
        rangeIncludingLineBreak: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line + 1, 0)),
      }),
      uri: { fsPath: '/test/main.lua' },
    };

    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 15));
    const actions = provider.provideCodeActions(
      mockDoc as never,
      range,
      { diagnostics: [] },
      {} as never,
    );

    const genAction = actions.find((a: { title: string }) => a.title.includes('Generate'));
    expect(genAction).toBeDefined();
    expect(genAction!.title).toContain('doSomething');
  });

  it('should provide hex-to-love2d color conversion', async () => {
    const vscode = await import('vscode');
    const { Love2DCodeActionProvider } = await import('../language/actions');

    const provider = new Love2DCodeActionProvider();
    const text = 'local color = "#FF8800"\n';

    const mockDoc = {
      getText: () => text,
      lineAt: (line: number) => ({
        text: text.split('\n')[line],
        range: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, text.split('\n')[line].length)),
        rangeIncludingLineBreak: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line + 1, 0)),
      }),
      uri: { fsPath: '/test/main.lua' },
    };

    const range = new vscode.Range(new vscode.Position(0, 14), new vscode.Position(0, 23));
    const actions = provider.provideCodeActions(
      mockDoc as never,
      range,
      { diagnostics: [] },
      {} as never,
    );

    const hexAction = actions.find((a: { title: string }) => a.title.includes('Convert #FF8800'));
    expect(hexAction).toBeDefined();
    expect(hexAction!.title).toContain('1, 0.533, 0');
  });

  it('should provide hex with alpha conversion', async () => {
    const vscode = await import('vscode');
    const { Love2DCodeActionProvider } = await import('../language/actions');

    const provider = new Love2DCodeActionProvider();
    const text = 'local c = "#FF880080"\n';

    const mockDoc = {
      getText: () => text,
      lineAt: (line: number) => ({
        text: text.split('\n')[line],
        range: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, text.split('\n')[line].length)),
        rangeIncludingLineBreak: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line + 1, 0)),
      }),
      uri: { fsPath: '/test/main.lua' },
    };

    const range = new vscode.Range(new vscode.Position(0, 10), new vscode.Position(0, 21));
    const actions = provider.provideCodeActions(
      mockDoc as never,
      range,
      { diagnostics: [] },
      {} as never,
    );

    const hexAction = actions.find((a: { title: string }) => a.title.includes('Convert #FF880080'));
    expect(hexAction).toBeDefined();
    expect(hexAction!.title).toContain('0.502');
  });

  it('should provide 0-255 to 0-1 conversion for setColor', async () => {
    const vscode = await import('vscode');
    const { Love2DCodeActionProvider } = await import('../language/actions');

    const provider = new Love2DCodeActionProvider();
    const text = 'love.graphics.setColor(255, 128, 64)\n';

    const mockDoc = {
      getText: () => text,
      lineAt: (line: number) => ({
        text: text.split('\n')[line],
        range: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, text.split('\n')[line].length)),
        rangeIncludingLineBreak: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line + 1, 0)),
      }),
      uri: { fsPath: '/test/main.lua' },
    };

    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 36));
    const actions = provider.provideCodeActions(
      mockDoc as never,
      range,
      { diagnostics: [] },
      {} as never,
    );

    const convAction = actions.find((a: { title: string }) => a.title.includes('Convert 0-255'));
    expect(convAction).toBeDefined();
  });

  it('should provide 0-255 to 0-1 conversion for table literals', async () => {
    const vscode = await import('vscode');
    const { Love2DCodeActionProvider } = await import('../language/actions');

    const provider = new Love2DCodeActionProvider();
    const text = 'local bg = {255, 128, 64}\n';

    const mockDoc = {
      getText: () => text,
      lineAt: (line: number) => ({
        text: text.split('\n')[line],
        range: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, text.split('\n')[line].length)),
        rangeIncludingLineBreak: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line + 1, 0)),
      }),
      uri: { fsPath: '/test/main.lua' },
    };

    const range = new vscode.Range(new vscode.Position(0, 11), new vscode.Position(0, 25));
    const actions = provider.provideCodeActions(
      mockDoc as never,
      range,
      { diagnostics: [] },
      {} as never,
    );

    const convAction = actions.find((a: { title: string }) => a.title.includes('Convert 0-255'));
    expect(convAction).toBeDefined();
  });

  it('should not offer 0-255 conversion for values already in 0-1 range', async () => {
    const vscode = await import('vscode');
    const { Love2DCodeActionProvider } = await import('../language/actions');

    const provider = new Love2DCodeActionProvider();
    const text = 'local bg = {0, 1, 0}\n';

    const mockDoc = {
      getText: () => text,
      lineAt: (line: number) => ({
        text: text.split('\n')[line],
        range: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, text.split('\n')[line].length)),
        rangeIncludingLineBreak: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line + 1, 0)),
      }),
      uri: { fsPath: '/test/main.lua' },
    };

    const range = new vscode.Range(new vscode.Position(0, 11), new vscode.Position(0, 20));
    const actions = provider.provideCodeActions(
      mockDoc as never,
      range,
      { diagnostics: [] },
      {} as never,
    );

    const convAction = actions.find((a: { title: string }) => a.title.includes('Convert 0-255'));
    expect(convAction).toBeUndefined();
  });
});
