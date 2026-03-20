import * as vscode from 'vscode';
import * as fs from 'fs';
import { BridgeClient } from '../bridge/client';

/**
 * Shader Live Edit: Watches .glsl/.frag/.vert files and sends
 * shader code to the running game via bridge for instant preview.
 */

export class ShaderLiveEditor {
  private watcher: vscode.FileSystemWatcher | null = null;
  private enabled = false;
  private disposables: vscode.Disposable[] = [];

  constructor(private bridge: BridgeClient) {}

  toggle(): boolean {
    this.enabled = !this.enabled;

    if (this.enabled) {
      this.startWatching();
    } else {
      this.stopWatching();
    }

    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private startWatching(): void {
    if (this.watcher) return;

    this.watcher = vscode.workspace.createFileSystemWatcher('**/*.{glsl,frag,vert}');

    this.disposables.push(
      this.watcher.onDidChange((uri) => this.onShaderChanged(uri)),
      this.watcher.onDidCreate((uri) => this.onShaderChanged(uri)),
      this.watcher,
    );

    // Also watch for save events on open shader files
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((doc) => {
        const ext = doc.uri.fsPath.split('.').pop()?.toLowerCase();
        if (ext === 'glsl' || ext === 'frag' || ext === 'vert') {
          this.onShaderChanged(doc.uri);
        }
      }),
    );
  }

  private stopWatching(): void {
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
    this.watcher = null;
  }

  private async onShaderChanged(uri: vscode.Uri): Promise<void> {
    if (!this.bridge.connected) return;

    try {
      const code = fs.readFileSync(uri.fsPath, 'utf-8');
      const response = await this.bridge.send({
        cmd: 'shader',
        code,
        filename: uri.fsPath,
      });

      if (response.success) {
        // Silently applied
      } else {
        vscode.window.showWarningMessage(
          `Shader error: ${response.error || 'Unknown error'}`,
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      vscode.window.showWarningMessage(`Shader update failed: ${msg}`);
    }
  }

  dispose(): void {
    this.stopWatching();
  }
}
