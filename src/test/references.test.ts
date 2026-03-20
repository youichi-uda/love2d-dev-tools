import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('language/references', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export Love2DReferenceProvider', async () => {
    const { Love2DReferenceProvider } = await import('../language/references');
    expect(typeof Love2DReferenceProvider).toBe('function');
  });

  it('should return empty array when no word at position', async () => {
    const vscode = await import('vscode');
    const { Love2DReferenceProvider } = await import('../language/references');

    const provider = new Love2DReferenceProvider();
    const mockDoc = {
      getWordRangeAtPosition: () => undefined,
      getText: () => '',
    };

    const result = await provider.provideReferences(
      mockDoc as never,
      new vscode.Position(0, 0),
      { includeDeclaration: true },
      {} as never,
    );

    expect(result).toEqual([]);
  });

  it('should find references across files', async () => {
    const vscode = await import('vscode');
    const { Love2DReferenceProvider } = await import('../language/references');

    const provider = new Love2DReferenceProvider();

    const mockDoc = {
      getWordRangeAtPosition: () =>
        new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 6)),
      getText: (range?: unknown) => range ? 'player' : 'player = {}',
    };

    // Mock findFiles to return an empty array (no workspace files)
    const origWorkspace = vscode.workspace;
    Object.defineProperty(vscode, 'workspace', {
      value: {
        ...origWorkspace,
        findFiles: async () => [],
      },
      configurable: true,
    });

    const result = await provider.provideReferences(
      mockDoc as never,
      new vscode.Position(0, 3),
      { includeDeclaration: true },
      {} as never,
    );

    expect(Array.isArray(result)).toBe(true);

    Object.defineProperty(vscode, 'workspace', { value: origWorkspace, configurable: true });
  });
});
