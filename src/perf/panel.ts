import * as vscode from 'vscode';
import { BridgeClient } from '../bridge/client';

/**
 * Performance monitor: fetches FPS, memory, draw calls from the bridge
 * and displays them in a webview panel.
 */

export interface PerfData {
  fps: number;
  dt: number;
  memory: number;
  drawCalls: number;
  textureMemory: number;
}

export class PerformancePanel {
  private panel: vscode.WebviewPanel | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private bridge: BridgeClient) {}

  async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'love2dPerf',
      'Love2D Performance',
      vscode.ViewColumn.Beside,
      { enableScripts: true },
    );

    this.panel.webview.html = this.getHtml();

    this.panel.onDidDispose(() => {
      this.stopPolling();
      this.panel = null;
    });

    this.startPolling();
  }

  private startPolling(): void {
    this.timer = setInterval(async () => {
      if (!this.bridge.connected || !this.panel) return;

      try {
        const response = await this.bridge.perf();
        if (response.success && response.data) {
          this.panel.webview.postMessage({
            type: 'perf',
            data: response.data as PerfData,
          });
        }
      } catch {
        // Skip
      }
    }, 1000);
  }

  private stopPolling(): void {
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
    font-family: var(--vscode-font-family);
    font-size: 13px;
    color: var(--vscode-foreground);
    padding: 16px;
    background: var(--vscode-editor-background);
  }
  .metric {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid var(--vscode-widget-border);
  }
  .metric-label { opacity: 0.8; }
  .metric-value { font-weight: bold; font-variant-numeric: tabular-nums; }
  .fps-good { color: #4ec9b0; }
  .fps-warn { color: #dcdcaa; }
  .fps-bad { color: #f44747; }
  h2 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.6;
    margin-bottom: 8px;
  }
</style>
</head>
<body>
  <h2>Performance</h2>
  <div class="metric">
    <span class="metric-label">FPS</span>
    <span class="metric-value" id="fps">—</span>
  </div>
  <div class="metric">
    <span class="metric-label">Frame Time</span>
    <span class="metric-value" id="dt">—</span>
  </div>
  <div class="metric">
    <span class="metric-label">Lua Memory</span>
    <span class="metric-value" id="memory">—</span>
  </div>
  <div class="metric">
    <span class="metric-label">Draw Calls</span>
    <span class="metric-value" id="drawCalls">—</span>
  </div>
  <div class="metric">
    <span class="metric-label">Texture Memory</span>
    <span class="metric-value" id="textureMemory">—</span>
  </div>
  <script>
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type !== 'perf') return;
      const d = msg.data;

      const fpsEl = document.getElementById('fps');
      fpsEl.textContent = d.fps;
      fpsEl.className = 'metric-value ' + (d.fps >= 55 ? 'fps-good' : d.fps >= 30 ? 'fps-warn' : 'fps-bad');

      document.getElementById('dt').textContent = (d.dt * 1000).toFixed(1) + ' ms';
      document.getElementById('memory').textContent = (d.memory / 1024).toFixed(1) + ' MB';
      document.getElementById('drawCalls').textContent = d.drawCalls;
      document.getElementById('textureMemory').textContent = (d.textureMemory / 1024 / 1024).toFixed(1) + ' MB';
    });
  </script>
</body>
</html>`;
  }

  dispose(): void {
    this.stopPolling();
    this.panel?.dispose();
  }
}
