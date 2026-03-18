import * as vscode from 'vscode';
import { BridgeClient } from '../bridge/client';

/**
 * Screenshot preview: periodically captures screenshots from the running game
 * via the bridge and displays them in a webview panel.
 */

export class ScreenshotPreviewPanel {
  private panel: vscode.WebviewPanel | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private bridge: BridgeClient) {}

  /**
   * Show or focus the preview panel and start capturing.
   */
  async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'love2dPreview',
      'Love2D Preview',
      vscode.ViewColumn.Beside,
      { enableScripts: true },
    );

    this.panel.webview.html = this.getHtml();

    this.panel.onDidDispose(() => {
      this.stopCapture();
      this.panel = null;
    });

    this.startCapture();
  }

  /**
   * Start periodic screenshot capture.
   */
  private startCapture(): void {
    const intervalMs = vscode.workspace
      .getConfiguration('love2d-tools')
      .get<number>('screenshot.interval', 500);

    this.timer = setInterval(async () => {
      if (!this.bridge.connected || !this.panel) return;

      try {
        const response = await this.bridge.screenshot();
        if (response.success && response.data) {
          this.panel.webview.postMessage({
            type: 'screenshot',
            data: response.data as string,
          });
        }
      } catch {
        // Silently skip failed captures
      }
    }, intervalMs);
  }

  private stopCapture(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private getHtml(): string {
    return /* html */ `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body {
    margin: 0;
    padding: 0;
    background: #1e1e1e;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    overflow: hidden;
  }
  #preview {
    max-width: 100%;
    max-height: 100vh;
    image-rendering: pixelated;
  }
  #placeholder {
    color: #666;
    font-family: var(--vscode-font-family);
    font-size: 14px;
  }
</style>
</head>
<body>
  <img id="preview" style="display:none;" />
  <div id="placeholder">Waiting for screenshot...</div>
  <script>
    const vscode = acquireVsCodeApi();
    const img = document.getElementById('preview');
    const placeholder = document.getElementById('placeholder');

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'screenshot') {
        img.src = 'data:image/png;base64,' + msg.data;
        img.style.display = 'block';
        placeholder.style.display = 'none';
      }
    });
  </script>
</body>
</html>`;
  }

  dispose(): void {
    this.stopCapture();
    this.panel?.dispose();
  }
}
