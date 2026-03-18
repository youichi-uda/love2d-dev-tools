/**
 * Love2D Dev Tools — LÖVE Development Suite for VS Code
 *
 * Main extension entry point. Registers all providers and commands.
 *
 * FREE features:
 *   - Cross-platform game launch (Windows / Mac / Linux)
 *   - Love2D API IntelliSense (lua-language-server + type definitions)
 *   - One-click debugger setup (launch.json generation)
 *   - Project template generation (minimal / gamejam / state-machine)
 *   - Snippets (love.load, love.update, love.draw, etc.)
 *   - Console output (stdout/stderr capture)
 *   - Status bar (version, run state)
 *   - Sidebar (Quick Actions)
 *
 * PRO features (license key required):
 *   - Hot reload (bridge), Screenshot preview, Structured console
 *   - Asset path checker, Performance overlay
 *   - Game jam mode (.love build, timer, checklist)
 *   - Library manager (GitHub download)
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  launchGame,
  stopGame,
  isGameRunning,
  getDetectedVersion,
  onGameStateChanged,
  dispose as disposeLauncher,
} from './runner/launcher';
import { setupIntelliSense, promptIntelliSenseSetup } from './intellisense/setup';
import { setupDebugger } from './debug/setup';
import { generateProject } from './template/generator';
import { activateLicense, requirePro } from './license/gumroad';
import { activate as activateQuickActions } from './sidebar/quickActions';
import { BridgeClient } from './bridge/client';
import { HotReloadWatcher } from './hotreload/watcher';
import { ScreenshotPreviewPanel } from './preview/panel';
import { StructuredConsole } from './console/output';
import { PerformancePanel } from './perf/panel';
import { AssetChecker } from './assets/checker';
import { GameJamMode } from './gamejam/mode';
import { LibraryManager } from './library/manager';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // ── Project Detection ──
  const projectDetected = isLove2DProject();
  vscode.commands.executeCommand('setContext', 'love2dTools.projectDetected', projectDetected);

  // ── Core services ──
  const bridge = new BridgeClient();
  const projectPath = findProjectPath();

  // ── Status Bar: Love2D version ──
  const versionStatusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left, 51,
  );
  versionStatusBar.command = 'love2d-tools.launch';
  context.subscriptions.push(versionStatusBar);

  if (projectDetected) {
    const version = await getDetectedVersion();
    if (version) {
      versionStatusBar.text = `$(heart) ${version}`;
      versionStatusBar.tooltip = vscode.l10n.t('love version: {0}', version);
    } else {
      versionStatusBar.text = '$(heart) Love2D';
      versionStatusBar.tooltip = vscode.l10n.t(
        'Could not find love executable. Please set the path in settings.',
      );
    }
    versionStatusBar.show();
  }

  // ── Status Bar: Run state ──
  const runStatusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left, 50,
  );
  context.subscriptions.push(runStatusBar);

  function updateRunStatus(running: boolean): void {
    if (running) {
      runStatusBar.text = vscode.l10n.t('▶ Running');
      runStatusBar.command = 'love2d-tools.stop';
    } else {
      runStatusBar.text = vscode.l10n.t('■ Stopped');
      runStatusBar.command = 'love2d-tools.launch';
    }
    if (projectDetected) runStatusBar.show();
  }

  updateRunStatus(false);
  context.subscriptions.push(
    onGameStateChanged.event((running) => updateRunStatus(running)),
  );

  // ── Bridge connection on game start/stop ──
  const portFilePath = projectPath
    ? path.join(projectPath, '.love2d-tools-port')
    : undefined;
  let bridgeConnectTimer: ReturnType<typeof setInterval> | null = null;

  context.subscriptions.push(
    onGameStateChanged.event((running) => {
      if (running && portFilePath) {
        // Poll for port file written by bridge.lua
        bridgeConnectTimer = setInterval(async () => {
          if (fs.existsSync(portFilePath)) {
            try {
              const port = parseInt(fs.readFileSync(portFilePath, 'utf-8').trim(), 10);
              if (port > 0) {
                await bridge.connect(port);
                if (bridgeConnectTimer) {
                  clearInterval(bridgeConnectTimer);
                  bridgeConnectTimer = null;
                }
              }
            } catch {
              // Retry
            }
          }
        }, 500);
      } else {
        if (bridgeConnectTimer) {
          clearInterval(bridgeConnectTimer);
          bridgeConnectTimer = null;
        }
        bridge.disconnect();
      }
    }),
  );

  // ── Pro feature instances ──
  const hotReload = projectPath ? new HotReloadWatcher(bridge, projectPath) : null;
  const preview = new ScreenshotPreviewPanel(bridge);
  const structuredConsole = new StructuredConsole(bridge);
  const perfPanel = new PerformancePanel(bridge);
  const assetChecker = new AssetChecker();
  const gameJam = new GameJamMode();
  const libraryManager = new LibraryManager();

  // ══════════════════════════════════════════════════════════
  //  FREE Commands
  // ══════════════════════════════════════════════════════════

  context.subscriptions.push(
    vscode.commands.registerCommand('love2d-tools.launch', async () => {
      const pp = findProjectPath();
      if (!pp) {
        vscode.window.showErrorMessage(
          vscode.l10n.t('main.lua not found in workspace.'),
        );
        return;
      }
      await launchGame(pp);
    }),

    vscode.commands.registerCommand('love2d-tools.stop', async () => {
      if (!isGameRunning()) {
        vscode.window.showInformationMessage(vscode.l10n.t('No game is running.'));
        return;
      }
      await stopGame();
      vscode.window.showInformationMessage(vscode.l10n.t('Game stopped.'));
    }),

    vscode.commands.registerCommand('love2d-tools.setupIntelliSense', async () => {
      const folder = await pickWorkspaceFolder();
      if (folder) await setupIntelliSense(folder);
    }),

    vscode.commands.registerCommand('love2d-tools.setupDebugger', async () => {
      const folder = await pickWorkspaceFolder();
      if (folder) await setupDebugger(folder);
    }),

    vscode.commands.registerCommand('love2d-tools.newProject', generateProject),
  );

  // ══════════════════════════════════════════════════════════
  //  PRO Commands
  // ══════════════════════════════════════════════════════════

  context.subscriptions.push(
    vscode.commands.registerCommand('love2d-tools.toggleHotReload', () => {
      if (!requirePro('Hot Reload')) return;
      if (!hotReload) return;
      const enabled = hotReload.toggle();
      vscode.window.showInformationMessage(
        enabled ? 'Hot Reload enabled.' : 'Hot Reload disabled.',
      );
    }),

    vscode.commands.registerCommand('love2d-tools.showPreview', async () => {
      if (!requirePro('Screenshot Preview')) return;
      await preview.show();
    }),

    vscode.commands.registerCommand('love2d-tools.showPerf', async () => {
      if (!requirePro('Performance Monitor')) return;
      await perfPanel.show();
    }),

    vscode.commands.registerCommand('love2d-tools.showConsole', () => {
      if (!requirePro('Structured Console')) return;
      structuredConsole.start();
      structuredConsole.show();
    }),

    vscode.commands.registerCommand('love2d-tools.checkAssets', () => {
      if (!requirePro('Asset Checker')) return;
      for (const doc of vscode.workspace.textDocuments) {
        if (doc.languageId === 'lua') {
          assetChecker.checkDocument(doc);
        }
      }
      vscode.window.showInformationMessage('Asset check complete.');
    }),

    vscode.commands.registerCommand('love2d-tools.buildLove', async () => {
      if (!requirePro('Game Jam Mode')) return;
      const pp = findProjectPath();
      if (!pp) return;
      const outputPath = await gameJam.buildLoveFile(pp);
      if (outputPath) {
        vscode.window.showInformationMessage(`Built: ${path.basename(outputPath)}`);
      }
    }),

    vscode.commands.registerCommand('love2d-tools.jamTimer', async () => {
      if (!requirePro('Game Jam Mode')) return;
      const input = await vscode.window.showInputBox({
        prompt: 'Enter jam duration in hours',
        value: '48',
      });
      if (!input) return;
      const hours = parseFloat(input);
      if (isNaN(hours) || hours <= 0) return;

      const timerBar = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right, 200,
      );
      context.subscriptions.push(timerBar);
      gameJam.startTimer(timerBar, hours);
    }),

    vscode.commands.registerCommand('love2d-tools.jamChecklist', async () => {
      if (!requirePro('Game Jam Mode')) return;
      await gameJam.showChecklist();
    }),

    vscode.commands.registerCommand('love2d-tools.addLibrary', async () => {
      if (!requirePro('Library Manager')) return;
      const pp = findProjectPath();
      if (!pp) return;
      await libraryManager.addLibrary(pp);
    }),
  );

  // ── Asset checker activation (Pro: live diagnostics) ──
  assetChecker.activate(context);

  // ── Structured console: listen when bridge connects ──
  structuredConsole.start();

  // ── Quick Actions sidebar ──
  activateQuickActions(context);

  // ── License ──
  await activateLicense(context);

  // ── Prompt IntelliSense setup ──
  if (projectDetected) {
    promptIntelliSenseSetup(context);
  }

  // ── Cleanup ──
  context.subscriptions.push(
    { dispose: () => disposeLauncher() },
    { dispose: () => bridge.dispose() },
    { dispose: () => hotReload?.dispose() },
    { dispose: () => preview.dispose() },
    { dispose: () => structuredConsole.dispose() },
    { dispose: () => perfPanel.dispose() },
    { dispose: () => assetChecker.dispose() },
    { dispose: () => gameJam.dispose() },
    { dispose: () => libraryManager.dispose() },
  );

  console.log('Love2D Dev Tools activated');
}

// ── Helpers ──

function isLove2DProject(): boolean {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders) return false;
  return folders.some(f => fs.existsSync(path.join(f.uri.fsPath, 'main.lua')));
}

function findProjectPath(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders) return undefined;
  for (const folder of folders) {
    if (fs.existsSync(path.join(folder.uri.fsPath, 'main.lua'))) {
      return folder.uri.fsPath;
    }
  }
  return undefined;
}

async function pickWorkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    vscode.window.showErrorMessage(vscode.l10n.t('main.lua not found in workspace.'));
    return undefined;
  }
  if (folders.length === 1) return folders[0];
  return vscode.window.showWorkspaceFolderPick();
}

export function deactivate(): void {
  // cleanup handled by subscriptions
}
