import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Check if sumneko.lua extension is installed.
 */
function isLuaLSInstalled(): boolean {
  return vscode.extensions.getExtension('sumneko.lua') !== undefined;
}

/**
 * Set up lua-language-server with Love2D type definitions.
 * Merges settings into .vscode/settings.json without overwriting existing config.
 */
export async function setupIntelliSense(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
  // Check for sumneko.lua
  if (!isLuaLSInstalled()) {
    const action = await vscode.window.showWarningMessage(
      vscode.l10n.t('Lua Language Server (sumneko.lua) is not installed. Install it for IntelliSense support.'),
      vscode.l10n.t('Install'),
      vscode.l10n.t('Cancel'),
    );
    if (action === vscode.l10n.t('Install')) {
      vscode.commands.executeCommand(
        'workbench.extensions.installExtension',
        'sumneko.lua',
      );
    }
    return;
  }

  const root = workspaceFolder.uri.fsPath;
  const vscodeDir = path.join(root, '.vscode');
  const settingsPath = path.join(vscodeDir, 'settings.json');

  // Ensure .vscode directory exists
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir, { recursive: true });
  }

  // Load existing settings
  let settings: Record<string, unknown> = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch {
      settings = {};
    }
  }

  // Check if already configured
  const existingLibrary = settings['Lua.workspace.library'] as string[] | undefined;
  if (existingLibrary && existingLibrary.some(lib => lib.includes('love2d'))) {
    vscode.window.showInformationMessage(
      vscode.l10n.t('.vscode/settings.json already has Love2D IntelliSense configured.'),
    );
    return;
  }

  // Apply Love2D settings (merge, not overwrite)
  const library = (existingLibrary || []).slice();
  library.push('${3rd}/love2d/library');

  // Add local types dir if we have bundled type definitions
  const typesDir = path.join(vscodeDir, 'types');
  if (!library.includes('.vscode/types')) {
    library.push('.vscode/types');
  }

  settings['Lua.workspace.library'] = library;
  settings['Lua.runtime.version'] = settings['Lua.runtime.version'] || 'LuaJIT';
  settings['Lua.runtime.special'] = settings['Lua.runtime.special'] || {
    'love.filesystem.load': 'loadfile',
  };
  settings['Lua.workspace.checkThirdParty'] = settings['Lua.workspace.checkThirdParty'] || 'Apply';

  // Suppress false positives common in Love2D projects:
  // - duplicate-set-field: love.load, love.update, love.draw etc. are standard
  //   callback definitions that conflict with type definitions.
  // - lowercase-global: Love2D commonly uses lowercase globals (e.g. switchState).
  const disabledDiags = (settings['Lua.diagnostics.disable'] as string[]) || [];
  for (const diag of ['duplicate-set-field', 'lowercase-global']) {
    if (!disabledDiags.includes(diag)) {
      disabledDiags.push(diag);
    }
  }
  settings['Lua.diagnostics.disable'] = disabledDiags;

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');

  // Copy bundled type definitions
  await copyTypeDefs(workspaceFolder);

  const action = await vscode.window.showInformationMessage(
    vscode.l10n.t('IntelliSense configured successfully. Reload window to apply.'),
    vscode.l10n.t('Reload'),
  );
  if (action === vscode.l10n.t('Reload')) {
    vscode.commands.executeCommand('workbench.action.reloadWindow');
  }
}

/**
 * Copy bundled library type definitions to .vscode/types/.
 */
async function copyTypeDefs(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
  const root = workspaceFolder.uri.fsPath;
  const targetDir = path.join(root, '.vscode', 'types');

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Find the extension's typedefs directory
  const ext = vscode.extensions.getExtension('abyo-software.love2d-dev-tools');
  if (!ext) return;

  const libsDir = path.join(ext.extensionPath, 'typedefs', 'libs');
  if (!fs.existsSync(libsDir)) return;

  const files = fs.readdirSync(libsDir);
  for (const file of files) {
    const src = path.join(libsDir, file);
    const dest = path.join(targetDir, file);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
    }
  }

  vscode.window.showInformationMessage(
    vscode.l10n.t('Type definitions copied to {0}.', '.vscode/types/'),
  );
}

/**
 * Prompt IntelliSense setup if Love2D project detected and not already configured.
 */
export function promptIntelliSenseSetup(context: vscode.ExtensionContext): void {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders) return;

  for (const folder of folders) {
    const root = folder.uri.fsPath;

    // Check if main.lua exists (Love2D project)
    if (!fs.existsSync(path.join(root, 'main.lua'))) continue;

    // Check if already configured
    const settingsPath = path.join(root, '.vscode', 'settings.json');
    if (fs.existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        const library = settings['Lua.workspace.library'] as string[] | undefined;
        if (library && library.some((lib: string) => lib.includes('love2d'))) continue;
      } catch {
        // continue to prompt
      }
    }

    // Check if already prompted
    const promptedKey = `love2d.intellisensePrompted.${folder.uri.fsPath}`;
    if (context.globalState.get<boolean>(promptedKey)) continue;

    vscode.window
      .showInformationMessage(
        vscode.l10n.t('Setup IntelliSense'),
        vscode.l10n.t('Setup IntelliSense'),
        vscode.l10n.t('Cancel'),
      )
      .then(choice => {
        if (choice === vscode.l10n.t('Setup IntelliSense')) {
          setupIntelliSense(folder);
        }
        context.globalState.update(promptedKey, true);
      });
  }
}
