import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('assets/browser', () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'love2d-browser-'));
    fs.writeFileSync(path.join(tmpDir, 'main.lua'), '');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should export AssetBrowserProvider', async () => {
    const { AssetBrowserProvider } = await import('../assets/browser');
    expect(typeof AssetBrowserProvider).toBe('function');
  });

  it('should list asset files in project', async () => {
    const vscode = await import('vscode');
    const { AssetBrowserProvider } = await import('../assets/browser');

    // Create some asset files
    fs.mkdirSync(path.join(tmpDir, 'sprites'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'sprites', 'player.png'), '');
    fs.writeFileSync(path.join(tmpDir, 'sprites', 'enemy.png'), '');
    fs.mkdirSync(path.join(tmpDir, 'sounds'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'sounds', 'jump.wav'), '');

    const origWorkspace = vscode.workspace;
    Object.defineProperty(vscode, 'workspace', {
      value: {
        ...origWorkspace,
        workspaceFolders: [{ uri: { fsPath: tmpDir }, name: 'test', index: 0 }],
      },
      configurable: true,
    });

    const provider = new AssetBrowserProvider();
    const children = await provider.getChildren();

    // Should have directories with assets
    const dirNames = children.filter(c => c.isDirectory).map(c => c.name);
    expect(dirNames).toContain('sprites');
    expect(dirNames).toContain('sounds');

    // Get children of sprites directory
    const spritesDir = children.find(c => c.name === 'sprites');
    if (spritesDir) {
      const spriteFiles = await provider.getChildren(spritesDir);
      const fileNames = spriteFiles.map(f => f.name);
      expect(fileNames).toContain('player.png');
      expect(fileNames).toContain('enemy.png');
    }

    provider.dispose();
    Object.defineProperty(vscode, 'workspace', { value: origWorkspace, configurable: true });
  });

  it('should export AssetPreviewPanel', async () => {
    const { AssetPreviewPanel } = await import('../assets/browser');
    expect(typeof AssetPreviewPanel).toBe('function');
  });
});
