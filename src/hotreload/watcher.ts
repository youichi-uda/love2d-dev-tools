import * as vscode from 'vscode';
import * as path from 'path';
import { BridgeClient } from '../bridge/client';

/**
 * Hot reload: watches .lua files and sends reload commands via the bridge.
 * Clears the module's `package.loaded` entry and re-requires it.
 */

export class HotReloadWatcher {
  private watcher: vscode.FileSystemWatcher | null = null;
  private enabled: boolean = false;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private outputChannel: vscode.OutputChannel;

  constructor(
    private bridge: BridgeClient,
    private projectPath: string,
  ) {
    this.outputChannel = vscode.window.createOutputChannel('Love2D Hot Reload');
  }

  /**
   * Start watching for file changes.
   */
  start(): void {
    if (this.watcher) return;

    const pattern = new vscode.RelativePattern(this.projectPath, '**/*.lua');
    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);
    this.enabled = true;

    const debounceMs = vscode.workspace
      .getConfiguration('love2d-tools')
      .get<number>('hotReload.debounce', 300);

    this.watcher.onDidChange((uri) => this.onFileChanged(uri, debounceMs));
    this.watcher.onDidCreate((uri) => this.onFileChanged(uri, debounceMs));

    this.outputChannel.appendLine('[Hot Reload] Watching for changes...');
  }

  /**
   * Stop watching.
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.dispose();
      this.watcher = null;
    }
    this.enabled = false;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
    this.outputChannel.appendLine('[Hot Reload] Stopped.');
  }

  toggle(): boolean {
    if (this.enabled) {
      this.stop();
    } else {
      this.start();
    }
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private onFileChanged(uri: vscode.Uri, debounceMs: number): void {
    if (!this.enabled || !this.bridge.connected) return;

    // Skip conf.lua and bridge module
    const relativePath = path.relative(this.projectPath, uri.fsPath);
    if (relativePath === 'conf.lua' || relativePath.includes('.love2d-tools')) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      await this.reloadModule(relativePath);
    }, debounceMs);
  }

  private async reloadModule(relativePath: string): Promise<void> {
    // Convert file path to Lua module name:
    // "states/game.lua" -> "states.game"
    const moduleName = relativePath
      .replace(/\\/g, '/')
      .replace(/\.lua$/, '')
      .replace(/\//g, '.');

    try {
      const response = await this.bridge.reload(moduleName);
      if (response.success) {
        this.outputChannel.appendLine(`[Hot Reload] Reloaded: ${moduleName}`);
      } else {
        this.outputChannel.appendLine(`[Hot Reload] Error: ${response.error}`);
      }
    } catch (err) {
      this.outputChannel.appendLine(
        `[Hot Reload] Failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  dispose(): void {
    this.stop();
    this.outputChannel.dispose();
  }
}
