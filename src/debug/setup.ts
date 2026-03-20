import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { detectLovePath } from '../runner/detector';

/**
 * Check if Local Lua Debugger extension is installed.
 */
function isLuaDebuggerInstalled(): boolean {
  return vscode.extensions.getExtension('tomblind.local-lua-debugger-vscode') !== undefined;
}

/**
 * Generate launch.json for Love2D debugging with Local Lua Debugger.
 */
export async function setupDebugger(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
  // Check for Local Lua Debugger
  if (!isLuaDebuggerInstalled()) {
    const action = await vscode.window.showWarningMessage(
      vscode.l10n.t('Local Lua Debugger (tomblind.local-lua-debugger-vscode) is not installed. Install it for debugging support.'),
      vscode.l10n.t('Install'),
      vscode.l10n.t('Cancel'),
    );
    if (action === vscode.l10n.t('Install')) {
      vscode.commands.executeCommand(
        'workbench.extensions.installExtension',
        'tomblind.local-lua-debugger-vscode',
      );
    }
    return;
  }

  const root = workspaceFolder.uri.fsPath;
  const vscodeDir = path.join(root, '.vscode');
  const launchPath = path.join(vscodeDir, 'launch.json');

  // Check if launch.json already exists
  if (fs.existsSync(launchPath)) {
    const overwrite = await vscode.window.showWarningMessage(
      vscode.l10n.t('launch.json already exists. Overwrite?'),
      vscode.l10n.t('Overwrite'),
      vscode.l10n.t('Cancel'),
    );
    if (overwrite !== vscode.l10n.t('Overwrite')) return;
  }

  // Ensure .vscode directory exists
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir, { recursive: true });
  }

  // Use the same detection logic as the launcher.
  const lovePath = await detectLovePath() || 'love';

  const launchConfig = {
    version: '0.2.0',
    configurations: [
      {
        type: 'lua-local',
        request: 'launch',
        name: 'Love2D: Debug',
        program: { command: lovePath },
        args: ['.', 'debug'],
        scriptRoots: ['.', 'src'],
        env: { LOVE2D_TOOLS: '1' },
      },
      {
        type: 'lua-local',
        request: 'launch',
        name: 'Love2D: Run',
        program: { command: lovePath },
        args: ['.'],
        env: { LOVE2D_TOOLS: '1' },
      },
    ],
  };

  fs.writeFileSync(launchPath, JSON.stringify(launchConfig, null, 2), 'utf-8');

  vscode.window.showInformationMessage(
    vscode.l10n.t('Debugger configured successfully. Press F5 to start debugging.'),
  );
}
