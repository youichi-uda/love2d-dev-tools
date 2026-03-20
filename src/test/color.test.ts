import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('color/provider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export Love2DColorProvider', async () => {
    const { Love2DColorProvider } = await import('../color/provider');
    expect(typeof Love2DColorProvider).toBe('function');
  });

  it('should detect setColor patterns', async () => {
    const vscode = await import('vscode');
    const { Love2DColorProvider } = await import('../color/provider');

    const provider = new Love2DColorProvider();
    const text = 'love.graphics.setColor(0.5, 0.3, 0.8, 1)';

    const mockDoc = {
      getText: () => text,
      positionAt: (offset: number) => new vscode.Position(0, offset),
    };

    const colors = provider.provideDocumentColors(
      mockDoc as never,
      { isCancellationRequested: false } as never,
    );

    expect(colors.length).toBeGreaterThan(0);
    const color = colors[0].color;
    expect(color.red).toBeCloseTo(0.5);
    expect(color.green).toBeCloseTo(0.3);
    expect(color.blue).toBeCloseTo(0.8);
  });

  it('should detect color table patterns', async () => {
    const vscode = await import('vscode');
    const { Love2DColorProvider } = await import('../color/provider');

    const provider = new Love2DColorProvider();
    const text = 'local bg = {0.1, 0.2, 0.3}';

    const mockDoc = {
      getText: () => text,
      positionAt: (offset: number) => new vscode.Position(0, offset),
    };

    const colors = provider.provideDocumentColors(
      mockDoc as never,
      { isCancellationRequested: false } as never,
    );

    expect(colors.length).toBe(1);
    expect(colors[0].color.red).toBeCloseTo(0.1);
    expect(colors[0].color.green).toBeCloseTo(0.2);
    expect(colors[0].color.blue).toBeCloseTo(0.3);
  });

  it('should not detect colors with values > 1', async () => {
    const vscode = await import('vscode');
    const { Love2DColorProvider } = await import('../color/provider');

    const provider = new Love2DColorProvider();
    // Values > 1 → old Love2D 0-255 range, should not match
    const text = 'love.graphics.setColor(255, 128, 64)';

    const mockDoc = {
      getText: () => text,
      positionAt: (offset: number) => new vscode.Position(0, offset),
    };

    const colors = provider.provideDocumentColors(
      mockDoc as never,
      { isCancellationRequested: false } as never,
    );

    expect(colors.length).toBe(0);
  });

  it('should provide color presentations', async () => {
    const vscode = await import('vscode');
    const { Love2DColorProvider } = await import('../color/provider');

    const provider = new Love2DColorProvider();
    const color = new vscode.Color(0.5, 0.3, 0.8, 1);

    const presentations = provider.provideColorPresentations(
      color,
      {
        document: { getText: () => '0.5, 0.3, 0.8, 1' } as never,
        range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 18)),
      },
      { isCancellationRequested: false } as never,
    );

    expect(presentations.length).toBeGreaterThan(0);
    expect(presentations[0].label).toContain('0.5');
  });
});
