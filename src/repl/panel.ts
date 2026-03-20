import * as vscode from 'vscode';
import { BridgeClient } from '../bridge/client';

/**
 * Live REPL: Webview panel for interactive Lua code execution.
 * Uses bridge.eval() to send code to the running Love2D game.
 */

export class ReplPanel {
  private panel: vscode.WebviewPanel | null = null;

  constructor(private bridge: BridgeClient) {}

  async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'love2dRepl',
      'Love2D REPL',
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true },
    );

    this.panel.webview.html = this.getHtml();

    this.panel.webview.onDidReceiveMessage(async (msg: { type: string; code?: string }) => {
      if (msg.type === 'eval' && msg.code) {
        await this.evalCode(msg.code);
      }
    });

    this.panel.onDidDispose(() => {
      this.panel = null;
    });
  }

  private async evalCode(code: string): Promise<void> {
    if (!this.panel) return;

    if (!this.bridge.connected) {
      this.panel.webview.postMessage({
        type: 'result',
        error: true,
        text: 'Bridge not connected. Run your game first.',
      });
      return;
    }

    try {
      const response = await this.bridge.eval(code);
      if (response.success) {
        this.panel.webview.postMessage({
          type: 'result',
          error: false,
          text: response.data !== undefined && response.data !== 'nil'
            ? String(response.data)
            : '',
        });
      } else {
        this.panel.webview.postMessage({
          type: 'result',
          error: true,
          text: response.error || 'Unknown error',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.panel.webview.postMessage({
        type: 'result',
        error: true,
        text: msg,
      });
    }
  }

  private getHtml(): string {
    return /* html */ `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: var(--vscode-editor-font-size, 13px);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding: 8px;
  }
  #output {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    margin-bottom: 8px;
    border: 1px solid var(--vscode-widget-border);
    border-radius: 3px;
    white-space: pre-wrap;
    word-break: break-all;
  }
  .entry { margin-bottom: 4px; }
  .entry-input { color: var(--vscode-terminal-ansiBrightCyan, #4ec9b0); }
  .entry-result { color: var(--vscode-foreground); }
  .entry-error { color: var(--vscode-terminal-ansiRed, #f44747); }
  #input-row {
    display: flex;
    gap: 4px;
  }
  #input {
    flex: 1;
    padding: 6px 8px;
    font-family: inherit;
    font-size: inherit;
    color: var(--vscode-input-foreground);
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, var(--vscode-widget-border));
    border-radius: 3px;
    outline: none;
  }
  #input:focus {
    border-color: var(--vscode-focusBorder);
  }
  #send-btn {
    padding: 6px 12px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
  }
  #send-btn:hover {
    background: var(--vscode-button-hoverBackground);
  }
</style>
</head>
<body>
  <div id="output"></div>
  <div id="input-row">
    <input id="input" type="text" placeholder="Enter Lua code..." autofocus />
    <button id="send-btn">Run</button>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const output = document.getElementById('output');
    const input = document.getElementById('input');
    const sendBtn = document.getElementById('send-btn');
    const history = [];
    let historyIndex = -1;

    function addEntry(cls, text) {
      const div = document.createElement('div');
      div.className = 'entry ' + cls;
      div.textContent = text;
      output.appendChild(div);
      output.scrollTop = output.scrollHeight;
    }

    function send() {
      const code = input.value.trim();
      if (!code) return;

      addEntry('entry-input', '> ' + code);
      vscode.postMessage({ type: 'eval', code });

      // History
      if (history[history.length - 1] !== code) {
        history.push(code);
      }
      historyIndex = history.length;
      input.value = '';
    }

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        send();
      } else if (e.key === 'ArrowUp') {
        if (historyIndex > 0) {
          historyIndex--;
          input.value = history[historyIndex];
        }
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        if (historyIndex < history.length - 1) {
          historyIndex++;
          input.value = history[historyIndex];
        } else {
          historyIndex = history.length;
          input.value = '';
        }
        e.preventDefault();
      }
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'result') {
        if (msg.error) {
          addEntry('entry-error', msg.text);
        } else if (msg.text) {
          addEntry('entry-result', msg.text);
        }
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
