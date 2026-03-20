import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('language/hints', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export Love2DInlayHintsProvider', async () => {
    const { Love2DInlayHintsProvider } = await import('../language/hints');
    expect(typeof Love2DInlayHintsProvider).toBe('function');
  });

  it('should provide hints for love.graphics.rectangle', async () => {
    const vscode = await import('vscode');
    const { Love2DInlayHintsProvider } = await import('../language/hints');

    const provider = new Love2DInlayHintsProvider();
    const text = 'love.graphics.rectangle("fill", 10, 20, 100, 50)';

    const mockDoc = {
      getText: () => text,
      positionAt: (offset: number) => new vscode.Position(0, offset),
    };

    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, text.length));
    const hints = provider.provideInlayHints(mockDoc as never, range, {} as never);

    expect(hints.length).toBe(5);
    expect(hints[0].label).toBe('mode:');
    expect(hints[1].label).toBe('x:');
    expect(hints[2].label).toBe('y:');
    expect(hints[3].label).toBe('width:');
    expect(hints[4].label).toBe('height:');
  });

  it('should provide hints for love.graphics.setColor', async () => {
    const vscode = await import('vscode');
    const { Love2DInlayHintsProvider } = await import('../language/hints');

    const provider = new Love2DInlayHintsProvider();
    const text = 'love.graphics.setColor(1, 0, 0.5, 1)';

    const mockDoc = {
      getText: () => text,
      positionAt: (offset: number) => new vscode.Position(0, offset),
    };

    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, text.length));
    const hints = provider.provideInlayHints(mockDoc as never, range, {} as never);

    expect(hints.length).toBe(4);
    expect(hints[0].label).toBe('r:');
    expect(hints[1].label).toBe('g:');
    expect(hints[2].label).toBe('b:');
    expect(hints[3].label).toBe('a:');
  });

  it('should not provide hints for unknown functions', async () => {
    const vscode = await import('vscode');
    const { Love2DInlayHintsProvider } = await import('../language/hints');

    const provider = new Love2DInlayHintsProvider();
    const text = 'love.custom.myFunc(1, 2, 3)';

    const mockDoc = {
      getText: () => text,
      positionAt: (offset: number) => new vscode.Position(0, offset),
    };

    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, text.length));
    const hints = provider.provideInlayHints(mockDoc as never, range, {} as never);

    expect(hints.length).toBe(0);
  });
});
