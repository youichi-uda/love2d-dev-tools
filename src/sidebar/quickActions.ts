import * as vscode from 'vscode';
import { isProLicensed } from '../license/gumroad';

/**
 * Provides the Quick Actions webview in the Love2D sidebar.
 */
export class QuickActionsProvider implements vscode.WebviewViewProvider {
  static readonly viewType = 'love2dQuickActions';

  private _view?: vscode.WebviewView;

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    this.updateHtml();

    webviewView.webview.onDidReceiveMessage((msg: { command: string }) => {
      vscode.commands.executeCommand(msg.command);
    });
  }

  refresh(): void {
    this.updateHtml();
  }

  private updateHtml(): void {
    if (!this._view) return;
    this._view.webview.html = this.getHtml(isProLicensed());
  }

  private btn(cmd: string, icon: string, label: string, pro: boolean, licensed: boolean): string {
    const badge = (pro && !licensed) ? '<span class="pro">PRO</span>' : '';
    return `<button class="btn" onclick="send('${cmd}')"><span class="icon">${icon}</span>${label}${badge}</button>`;
  }

  private getHtml(licensed: boolean): string {
    const b = (cmd: string, icon: string, label: string, pro = false) =>
      this.btn(cmd, icon, label, pro, licensed);

    const body = `
  <div class="section">
    <div class="section-title">${vscode.l10n.t('Run Game')}</div>
    ${b('love2d-tools.launch', '&#x25B6;', vscode.l10n.t('Run Game'))}
    ${b('love2d-tools.stop', '&#x25A0;', vscode.l10n.t('Stop Game'))}
  </div>

  <div class="section">
    <div class="section-title">${vscode.l10n.t('Setup')}</div>
    ${b('love2d-tools.setupIntelliSense', '&#x2699;', vscode.l10n.t('Setup IntelliSense'))}
    ${b('love2d-tools.setupDebugger', '&#x1F41E;', vscode.l10n.t('Setup Debugger'))}
    ${b('love2d-tools.newProject', '+', vscode.l10n.t('New Project'))}
    ${b('love2d-tools.addLibrary', '&#x1F4DA;', vscode.l10n.t('Add Library'))}
  </div>

  <div class="section">
    <div class="section-title">${vscode.l10n.t('Tools')}</div>
    ${b('love2d-tools.showConsole', '&#x1F4DD;', vscode.l10n.t('Structured Console'))}
    ${b('love2d-tools.checkAssets', '&#x1F50D;', vscode.l10n.t('Check Assets'))}
    ${b('love2d-tools.showDependencyGraph', '&#x1F517;', vscode.l10n.t('Dependency Graph'))}
  </div>

  <div class="section">
    <div class="section-title">${vscode.l10n.t('Pro Features')}</div>
    ${b('love2d-tools.toggleHotReload', '&#x26A1;', vscode.l10n.t('Hot Reload'), true)}
    ${b('love2d-tools.showRepl', '&#x1F4BB;', vscode.l10n.t('Live REPL'), true)}
    ${b('love2d-tools.showPreview', '&#x1F4F7;', vscode.l10n.t('Screenshot Preview'), true)}
    ${b('love2d-tools.showPerf', '&#x1F4CA;', vscode.l10n.t('Performance Monitor'), true)}
    ${b('love2d-tools.toggleShaderEdit', '&#x1F3A8;', vscode.l10n.t('Shader Live Edit'), true)}
    ${b('love2d-tools.showProfiler', '&#x1F525;', vscode.l10n.t('Profiler'), true)}
    ${b('love2d-tools.showSpriteEditor', '&#x1F5BC;', vscode.l10n.t('Sprite/Quad Editor'), true)}
  </div>

  <div class="section">
    <div class="section-title">${vscode.l10n.t('Game Jam')}</div>
    ${b('love2d-tools.buildLove', '&#x1F4E6;', vscode.l10n.t('Build .love'), true)}
    ${b('love2d-tools.jamTimer', '&#x23F1;', vscode.l10n.t('Jam Timer'), true)}
    ${b('love2d-tools.jamChecklist', '&#x2611;', vscode.l10n.t('Jam Checklist'), true)}
  </div>

  <div class="section">
    <div class="section-title">${vscode.l10n.t('License')}</div>
    ${b('love2d-tools.activateLicense', '&#x1F511;', vscode.l10n.t('Activate License'))}
    ${b('love2d-tools.deactivateLicense', '&#x1F512;', vscode.l10n.t('Deactivate License'))}
  </div>`;

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    padding: 8px;
  }
  .section {
    margin-bottom: 12px;
  }
  .section-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 4px;
    padding: 0 2px;
  }
  .btn {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 5px 8px;
    margin-bottom: 2px;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: var(--vscode-foreground);
    font-family: inherit;
    font-size: 12px;
    text-align: left;
    cursor: pointer;
    line-height: 1.4;
  }
  .btn:hover {
    background: var(--vscode-list-hoverBackground);
  }
  .btn .icon {
    display: inline-block;
    width: 18px;
    text-align: center;
    margin-right: 4px;
    opacity: 0.8;
    flex-shrink: 0;
  }
  .pro {
    margin-left: auto;
    padding: 0 5px;
    border-radius: 3px;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.5px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    flex-shrink: 0;
  }
</style>
</head>
<body>
  ${body}
  <script>
    const vscode = acquireVsCodeApi();
    function send(command) {
      vscode.postMessage({ command });
    }
  </script>
</body>
</html>`;
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const provider = new QuickActionsProvider();
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      QuickActionsProvider.viewType,
      provider,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('love2d-tools.refreshQuickActions', () => {
      provider.refresh();
    }),
  );
}
