import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Asset Browser: TreeDataProvider for browsing project assets.
 * Shows images, sounds, fonts, and other assets with preview capabilities.
 * Detects unused assets (not referenced in any Lua file).
 */

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.bmp', '.tga', '.gif']);
const AUDIO_EXTENSIONS = new Set(['.wav', '.mp3', '.ogg', '.flac']);
const FONT_EXTENSIONS = new Set(['.ttf', '.otf', '.fnt']);
const SHADER_EXTENSIONS = new Set(['.glsl', '.frag', '.vert']);
const ASSET_EXTENSIONS = new Set([
  ...IMAGE_EXTENSIONS, ...AUDIO_EXTENSIONS, ...FONT_EXTENSIONS, ...SHADER_EXTENSIONS,
]);

export interface AssetNode {
  name: string;
  absolutePath: string;
  relativePath: string;
  isDirectory: boolean;
  kind: 'image' | 'audio' | 'font' | 'shader' | 'other' | 'directory';
  unused?: boolean;
}

export class AssetBrowserProvider implements vscode.TreeDataProvider<AssetNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<AssetNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private projectRoot: string | undefined;
  private usedAssets: Set<string> = new Set();

  constructor() {
    this.detectProjectRoot();
  }

  private detectProjectRoot(): void {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) return;
    for (const folder of folders) {
      if (fs.existsSync(path.join(folder.uri.fsPath, 'main.lua'))) {
        this.projectRoot = folder.uri.fsPath;
        break;
      }
    }
  }

  refresh(): void {
    this.scanUsedAssets();
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: AssetNode): vscode.TreeItem {
    const item = new vscode.TreeItem(
      element.name,
      element.isDirectory
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    );

    if (!element.isDirectory) {
      item.description = element.unused ? '(unused)' : undefined;
      item.tooltip = element.relativePath;
      item.resourceUri = vscode.Uri.file(element.absolutePath);

      const icon = this.getIcon(element.kind);
      if (icon) item.iconPath = new vscode.ThemeIcon(icon);

      if (element.kind === 'image') {
        item.command = {
          title: 'Preview Image',
          command: 'love2d-tools.previewAsset',
          arguments: [element],
        };
      } else {
        item.command = {
          title: 'Open File',
          command: 'vscode.open',
          arguments: [vscode.Uri.file(element.absolutePath)],
        };
      }

      if (element.unused) {
        item.description = '(unused)';
      }
    }

    return item;
  }

  async getChildren(element?: AssetNode): Promise<AssetNode[]> {
    if (!this.projectRoot) return [];

    const dir = element ? element.absolutePath : this.projectRoot;

    if (!fs.existsSync(dir)) return [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const nodes: AssetNode[] = [];

    for (const entry of entries) {
      // Skip hidden files, common non-asset directories, and symlinks
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '.git' || entry.isSymbolicLink()) {
        continue;
      }

      const absPath = path.join(dir, entry.name);
      const relPath = path.relative(this.projectRoot, absPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        // Only include directories that contain assets
        if (this.hasAssets(absPath)) {
          nodes.push({
            name: entry.name,
            absolutePath: absPath,
            relativePath: relPath,
            isDirectory: true,
            kind: 'directory',
          });
        }
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (ASSET_EXTENSIONS.has(ext) || ext === '.lua') continue; // Skip Lua files in asset tree

        if (ASSET_EXTENSIONS.has(ext)) {
          nodes.push({
            name: entry.name,
            absolutePath: absPath,
            relativePath: relPath,
            isDirectory: false,
            kind: this.getKind(ext),
            unused: !this.usedAssets.has(relPath),
          });
        }
      }
    }

    // Also include asset files directly
    for (const entry of entries) {
      if (entry.isDirectory() || entry.name.startsWith('.')) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!ASSET_EXTENSIONS.has(ext)) continue;

      const absPath = path.join(dir, entry.name);
      const relPath = path.relative(this.projectRoot, absPath).replace(/\\/g, '/');

      if (!nodes.some(n => n.absolutePath === absPath)) {
        nodes.push({
          name: entry.name,
          absolutePath: absPath,
          relativePath: relPath,
          isDirectory: false,
          kind: this.getKind(ext),
          unused: !this.usedAssets.has(relPath),
        });
      }
    }

    // Sort: directories first, then by name
    nodes.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return nodes;
  }

  private hasAssets(dir: string): boolean {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) {
          if (this.hasAssets(path.join(dir, entry.name))) return true;
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (ASSET_EXTENSIONS.has(ext)) return true;
        }
      }
    } catch {
      // ignore
    }
    return false;
  }

  private getKind(ext: string): AssetNode['kind'] {
    if (IMAGE_EXTENSIONS.has(ext)) return 'image';
    if (AUDIO_EXTENSIONS.has(ext)) return 'audio';
    if (FONT_EXTENSIONS.has(ext)) return 'font';
    if (SHADER_EXTENSIONS.has(ext)) return 'shader';
    return 'other';
  }

  private getIcon(kind: AssetNode['kind']): string | undefined {
    switch (kind) {
      case 'image': return 'file-media';
      case 'audio': return 'unmute';
      case 'font': return 'text-size';
      case 'shader': return 'symbol-misc';
      default: return 'file';
    }
  }

  private scanUsedAssets(): void {
    this.usedAssets.clear();
    if (!this.projectRoot) return;

    const luaFiles = this.findLuaFiles(this.projectRoot);
    const assetPattern = /["']([^"']+\.\w{2,4})["']/g;

    for (const luaFile of luaFiles) {
      try {
        const content = fs.readFileSync(luaFile, 'utf-8');
        let match: RegExpExecArray | null;
        assetPattern.lastIndex = 0;
        while ((match = assetPattern.exec(content)) !== null) {
          this.usedAssets.add(match[1]);
        }
      } catch {
        // skip
      }
    }
  }

  private findLuaFiles(dir: string): string[] {
    const results: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...this.findLuaFiles(fullPath));
        } else if (entry.name.endsWith('.lua')) {
          results.push(fullPath);
        }
      }
    } catch {
      // skip
    }
    return results;
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}

export class AssetPreviewPanel {
  private panel: vscode.WebviewPanel | null = null;

  show(node: AssetNode): void {
    if (this.panel) {
      this.panel.reveal();
    } else {
      this.panel = vscode.window.createWebviewPanel(
        'love2dAssetPreview',
        'Asset Preview',
        vscode.ViewColumn.Beside,
        { enableScripts: false, localResourceRoots: [vscode.Uri.file(path.dirname(node.absolutePath))] },
      );
      this.panel.onDidDispose(() => { this.panel = null; });
    }

    this.panel.title = node.name;
    const imageUri = this.panel.webview.asWebviewUri(vscode.Uri.file(node.absolutePath));

    this.panel.webview.html = /* html */ `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body {
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--vscode-editor-background);
  }
  img {
    max-width: 100%;
    max-height: 90vh;
    image-rendering: pixelated;
    border: 1px solid var(--vscode-widget-border);
  }
  .info {
    position: fixed;
    bottom: 8px;
    left: 8px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-font-family);
    font-size: 12px;
  }
</style>
</head>
<body>
  <img src="${imageUri}" alt="${node.name}" />
  <div class="info">${node.relativePath}</div>
</body>
</html>`;
  }

  dispose(): void {
    this.panel?.dispose();
  }
}
