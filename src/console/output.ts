import * as vscode from 'vscode';
import { BridgeClient } from '../bridge/client';

/**
 * Structured console: enhanced console panel that receives structured log
 * messages from the bridge (Pro feature).
 *
 * The free console is just stdout/stderr piped to an OutputChannel,
 * handled by the launcher. This provides richer formatting.
 */

export class StructuredConsole {
  private outputChannel: vscode.OutputChannel;
  private disposables: vscode.Disposable[] = [];

  constructor(private bridge: BridgeClient) {
    this.outputChannel = vscode.window.createOutputChannel('Love2D Console');
  }

  /**
   * Start listening for log events from the bridge.
   */
  start(): void {
    this.disposables.push(
      this.bridge.onLog((entry) => {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = this.getLevelPrefix(entry.level);
        this.outputChannel.appendLine(`[${timestamp}] ${prefix} ${entry.message}`);

        // If structured data is available, format it
        if (entry.data && typeof entry.data === 'object') {
          try {
            const formatted = JSON.stringify(entry.data, null, 2);
            this.outputChannel.appendLine(formatted);
          } catch {
            // ignore
          }
        }
      }),
    );
  }

  show(): void {
    this.outputChannel.show(true);
  }

  clear(): void {
    this.outputChannel.clear();
  }

  private getLevelPrefix(level: string): string {
    switch (level) {
      case 'error': return '[ERROR]';
      case 'warn': return '[WARN] ';
      case 'debug': return '[DEBUG]';
      default: return '[INFO] ';
    }
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.outputChannel.dispose();
  }
}
