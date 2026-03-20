import * as vscode from 'vscode';
import { BridgeClient } from '../bridge/client';

/**
 * Lua Profiler: Starts/stops profiling via bridge commands and displays
 * results as a flamegraph-style table in a webview.
 */

export interface ProfileEntry {
  name: string;
  source: string;
  line: number;
  calls: number;
  totalTime: number;
  selfTime: number;
}

export class ProfilerPanel {
  private panel: vscode.WebviewPanel | null = null;
  private profiling = false;

  constructor(private bridge: BridgeClient) {}

  async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'love2dProfiler',
      'Love2D Profiler',
      vscode.ViewColumn.Beside,
      { enableScripts: true },
    );

    this.panel.webview.html = this.getHtml([]);

    this.panel.webview.onDidReceiveMessage(async (msg: { type: string }) => {
      if (msg.type === 'start') {
        await this.startProfiling();
      } else if (msg.type === 'stop') {
        await this.stopProfiling();
      }
    });

    this.panel.onDidDispose(() => {
      this.panel = null;
      this.profiling = false;
    });
  }

  private async startProfiling(): Promise<void> {
    if (!this.bridge.connected) {
      this.postMessage('status', 'Bridge not connected');
      return;
    }

    try {
      const response = await this.bridge.send({ cmd: 'profile_start' });
      if (response.success) {
        this.profiling = true;
        this.postMessage('status', 'Profiling...');
      } else {
        this.postMessage('status', `Error: ${response.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.postMessage('status', `Error: ${msg}`);
    }
  }

  private async stopProfiling(): Promise<void> {
    if (!this.bridge.connected) {
      this.postMessage('status', 'Bridge not connected');
      return;
    }

    try {
      const response = await this.bridge.send({ cmd: 'profile_stop' }, 15000);
      if (response.success && response.data) {
        this.profiling = false;
        const entries = response.data as ProfileEntry[];
        if (this.panel) {
          this.panel.webview.html = this.getHtml(entries);
        }
      } else {
        this.postMessage('status', `Error: ${response.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.postMessage('status', `Error: ${msg}`);
    }
  }

  private postMessage(type: string, text: string): void {
    this.panel?.webview.postMessage({ type, text });
  }

  private getHtml(entries: ProfileEntry[]): string {
    const maxTime = entries.length > 0 ? Math.max(...entries.map(e => e.totalTime)) : 1;

    const rows = entries
      .sort((a, b) => b.selfTime - a.selfTime)
      .map((e) => {
        const pct = (e.selfTime / maxTime) * 100;
        const heatClass = pct > 50 ? 'hot' : pct > 20 ? 'warm' : 'cool';
        return `<tr class="${heatClass}">
          <td class="name">${escapeHtml(e.name)}</td>
          <td class="source">${escapeHtml(e.source)}:${e.line}</td>
          <td class="number">${e.calls}</td>
          <td class="number">${(e.totalTime * 1000).toFixed(2)} ms</td>
          <td class="number">${(e.selfTime * 1000).toFixed(2)} ms</td>
          <td><div class="bar" style="width:${Math.max(1, pct)}%"></div></td>
        </tr>`;
      })
      .join('');

    return /* html */ `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body {
    font-family: var(--vscode-font-family);
    font-size: 13px;
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    padding: 16px;
  }
  h2 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.6;
    margin-bottom: 8px;
  }
  .controls {
    margin-bottom: 12px;
    display: flex;
    gap: 8px;
  }
  .controls button {
    padding: 6px 12px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-family: inherit;
  }
  .controls button:hover {
    background: var(--vscode-button-hoverBackground);
  }
  #status {
    margin-left: 8px;
    font-style: italic;
    opacity: 0.7;
    line-height: 30px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  th {
    text-align: left;
    padding: 4px 8px;
    border-bottom: 1px solid var(--vscode-widget-border);
    opacity: 0.7;
    font-weight: 600;
  }
  td {
    padding: 3px 8px;
    border-bottom: 1px solid var(--vscode-widget-border);
  }
  .number { text-align: right; font-variant-numeric: tabular-nums; }
  .name { font-weight: 500; }
  .source { opacity: 0.6; font-size: 11px; }
  .bar {
    height: 12px;
    border-radius: 2px;
    background: var(--vscode-progressBar-background, #0078d4);
  }
  .hot td { background: rgba(244, 71, 71, 0.1); }
  .hot .bar { background: #f44747; }
  .warm td { background: rgba(220, 220, 170, 0.05); }
  .warm .bar { background: #dcdcaa; }
  .cool .bar { background: #4ec9b0; }
</style>
</head>
<body>
  <h2>Profiler</h2>
  <div class="controls">
    <button onclick="vscode.postMessage({type:'start'})">Start Profiling</button>
    <button onclick="vscode.postMessage({type:'stop'})">Stop & Collect</button>
    <span id="status"></span>
  </div>
  ${entries.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>Function</th>
        <th>Source</th>
        <th>Calls</th>
        <th>Total Time</th>
        <th>Self Time</th>
        <th>Heat</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>` : '<p style="opacity:0.5">Click "Start Profiling" then "Stop & Collect" to see results.</p>'}
  <script>
    const vscode = acquireVsCodeApi();
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'status') {
        document.getElementById('status').textContent = msg.text;
      }
    });
  </script>
</body>
</html>`;
  }

  dispose(): void {
    this.panel?.dispose();
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
