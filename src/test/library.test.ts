import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('library/manager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export LibraryManager and LIBRARY_REGISTRY', async () => {
    const { LibraryManager, LIBRARY_REGISTRY } = await import('../library/manager');
    expect(typeof LibraryManager).toBe('function');
    expect(Array.isArray(LIBRARY_REGISTRY)).toBe(true);
  });

  it('should have well-known libraries in registry', async () => {
    const { LIBRARY_REGISTRY } = await import('../library/manager');

    const names = LIBRARY_REGISTRY.map(l => l.name);
    expect(names).toContain('Lume');
    expect(names).toContain('Classic');
    expect(names).toContain('STI (Simple Tiled Implementation)');
    expect(names).toContain('HUMP');
    expect(names).toContain('Windfield');
    expect(names).toContain('Anim8');
    expect(names).toContain('Bump');
  });

  it('registry entries should have required fields', async () => {
    const { LIBRARY_REGISTRY } = await import('../library/manager');

    for (const lib of LIBRARY_REGISTRY) {
      expect(lib.name).toBeTruthy();
      expect(lib.repo).toMatch(/^\w+\/[\w.-]+$/);
      expect(lib.branch).toBeTruthy();
      expect(lib.files.length).toBeGreaterThan(0);
      expect(lib.mainFile).toBeTruthy();
    }
  });

  it('should cancel when user picks nothing', async () => {
    const vscode = await import('vscode');
    vi.spyOn(vscode.window, 'showQuickPick').mockResolvedValue(undefined);

    const { LibraryManager } = await import('../library/manager');
    const manager = new LibraryManager();

    // Should not throw
    await manager.addLibrary('/test/project');
    manager.dispose();
  });
});
