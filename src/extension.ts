/**
 * Love2D Dev Tools — LÖVE Development Suite for VS Code
 *
 * Main extension entry point. Registers all providers and commands.
 *
 * FREE features (22):
 *   - Cross-platform game launch (Windows / Mac / Linux)
 *   - Love2D API IntelliSense (lua-language-server + type definitions)
 *   - One-click debugger setup (launch.json generation)
 *   - Project template generation (minimal / gamejam / state-machine)
 *   - Snippets (love.load, love.update, love.draw, etc.)
 *   - Console output (stdout/stderr capture)
 *   - Structured console (formatted log viewer)
 *   - Status bar (version, run state)
 *   - Sidebar (Quick Actions)
 *   - Color Picker (inline color swatches for Love2D colors)
 *   - Color Palette (.love-palette.json project palette)
 *   - Go to Definition (require → file, function definitions)
 *   - Find All References (symbol search across workspace)
 *   - Document Symbols (outline view)
 *   - Inlay Hints (Love2D API parameter names)
 *   - Enhanced Diagnostics (unused requires)
 *   - Code Actions (quick fixes, hex/255 color conversion)
 *   - Asset path checker (missing asset detection)
 *   - Module Dependency Graph (interactive visualization)
 *   - Library manager (GitHub download)
 *   - Third-party type definitions (Lume, Classic, STI, Windfield)
 *   - Hover documentation
 *
 * PRO features (10, license key required):
 *   - Hot reload (bridge)
 *   - Screenshot preview
 *   - Performance overlay
 *   - Game jam mode (.love build, timer, checklist)
 *   - Live REPL (interactive Lua console)
 *   - Game State Inspector (live variable tree)
 *   - Asset Browser (file tree with preview)
 *   - Shader Live Edit (instant GLSL preview)
 *   - Lua Profiler (flamegraph / table)
 *   - Sprite/Quad Helper (visual quad editor)
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
  setOutputChannel,
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
// Phase 1: Bridge features
import { ReplPanel } from './repl/panel';
import { GameStateInspector } from './inspector/provider';
import { Love2DColorProvider } from './color/provider';
import { ColorPaletteProvider, PaletteCompletionProvider, saveColorToPalette, insertPaletteColor, removePaletteColor, applyPaletteColor } from './color/palette';
// Phase 2: Language features
import { Love2DDefinitionProvider } from './language/definition';
import { Love2DReferenceProvider } from './language/references';
import { Love2DDocumentSymbolProvider } from './language/symbols';
import { Love2DInlayHintsProvider } from './language/hints';
import { EnhancedDiagnostics } from './language/diagnostics';
import { Love2DCodeActionProvider } from './language/actions';
// Phase 3: Visual features
import { AssetBrowserProvider, AssetPreviewPanel } from './assets/browser';
import { DependencyGraphPanel } from './dependency/graph';
import { ShaderLiveEditor } from './shader/editor';
// Phase 4: Advanced features
import { ProfilerPanel } from './profiler/panel';
import { SpriteQuadEditor } from './sprite/editor';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // ── Project Detection ──
  const projectDetected = isLove2DProject();
  vscode.commands.executeCommand('setContext', 'love2dTools.projectDetected', projectDetected);

  // ── Core services ──
  const bridge = new BridgeClient();
  const projectPath = findProjectPath();

  // Single shared output channel for all Love2D output
  const loveOutputChannel = vscode.window.createOutputChannel('Love2D');
  context.subscriptions.push(loveOutputChannel);
  setOutputChannel(loveOutputChannel);

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

  // ── Status Bar: Hot Reload state ──
  const hotReloadStatusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left, 49,
  );
  hotReloadStatusBar.command = 'love2d-tools.toggleHotReload';
  context.subscriptions.push(hotReloadStatusBar);

  function updateHotReloadStatus(enabled: boolean): void {
    if (enabled) {
      hotReloadStatusBar.text = '$(zap) Hot Reload';
      hotReloadStatusBar.tooltip = vscode.l10n.t('Hot Reload is ON — click to disable');
    } else {
      hotReloadStatusBar.text = '$(circle-slash) Hot Reload';
      hotReloadStatusBar.tooltip = vscode.l10n.t('Hot Reload is OFF — click to enable');
    }
    if (projectDetected) hotReloadStatusBar.show();
  }

  // Hidden by default — only show after first toggle
  hotReloadStatusBar.hide();

  // ── Bridge connection: port file watcher ──
  // Connects to the bridge whenever .love2d-tools-port appears,
  // regardless of whether the game was started via Launch command or F5 debug.
  const portFilePath = projectPath
    ? path.join(projectPath, '.love2d-tools-port')
    : undefined;
  let bridgeConnectTimer: ReturnType<typeof setInterval> | null = null;

  function startBridgePolling(): void {
    if (!portFilePath || bridgeConnectTimer) return;
    bridgeConnectTimer = setInterval(async () => {
      if (bridge.connected) return;
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
  }

  function stopBridgePolling(): void {
    if (bridgeConnectTimer) {
      clearInterval(bridgeConnectTimer);
      bridgeConnectTimer = null;
    }
  }

  // Start polling on game launch (via Launch command)
  context.subscriptions.push(
    onGameStateChanged.event((running) => {
      if (running) {
        startBridgePolling();
      } else {
        stopBridgePolling();
        bridge.disconnect();
      }
    }),
  );

  // Also watch for port file changes (covers F5 debug and external launches)
  if (portFilePath) {
    const portFilePattern = new vscode.RelativePattern(
      projectPath!, '.love2d-tools-port',
    );
    const portWatcher = vscode.workspace.createFileSystemWatcher(portFilePattern);
    portWatcher.onDidCreate(() => startBridgePolling());
    portWatcher.onDidChange(() => startBridgePolling());
    portWatcher.onDidDelete(() => {
      stopBridgePolling();
      bridge.disconnect();
    });
    context.subscriptions.push(portWatcher);
  }

  // ── Pro feature instances ──
  const hotReload = projectPath ? new HotReloadWatcher(bridge, projectPath) : null;
  const preview = new ScreenshotPreviewPanel(bridge);
  const structuredConsole = new StructuredConsole(bridge);
  const perfPanel = new PerformancePanel(bridge);
  const assetChecker = new AssetChecker();
  const gameJam = new GameJamMode();
  const libraryManager = new LibraryManager();

  // Phase 1: Bridge features
  const replPanel = new ReplPanel(bridge);
  const inspector = new GameStateInspector(bridge);
  const assetPreview = new AssetPreviewPanel();
  const assetBrowser = new AssetBrowserProvider();

  // Phase 3: Visual features
  const dependencyGraph = new DependencyGraphPanel();
  const shaderEditor = new ShaderLiveEditor(bridge);
  const profilerPanel = new ProfilerPanel(bridge);
  const spriteEditor = new SpriteQuadEditor();

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
      updateHotReloadStatus(enabled);
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
      structuredConsole.start();
      structuredConsole.show();
    }),

    vscode.commands.registerCommand('love2d-tools.checkAssets', () => {
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

      // Toggle: if timer is running, stop it
      if (gameJam.isTimerRunning()) {
        gameJam.stopTimer();
        vscode.window.showInformationMessage(vscode.l10n.t('Jam Timer stopped.'));
        return;
      }

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
      const pp = findProjectPath();
      if (!pp) return;
      await libraryManager.addLibrary(pp);
    }),
  );

  // ══════════════════════════════════════════════════════════
  //  Phase 1: Bridge Feature Commands
  // ══════════════════════════════════════════════════════════

  context.subscriptions.push(
    // Live REPL (Pro)
    vscode.commands.registerCommand('love2d-tools.showRepl', async () => {
      if (!requirePro('Live REPL')) return;
      await replPanel.show();
    }),

    // Game State Inspector (Pro)
    vscode.commands.registerCommand('love2d-tools.refreshInspector', () => {
      inspector.refresh();
    }),

    vscode.commands.registerCommand('love2d-tools.toggleInspectorAutoRefresh', () => {
      if (!requirePro('Game State Inspector')) return;
      const enabled = inspector.toggleAutoRefresh();
      vscode.window.showInformationMessage(
        enabled ? 'Inspector auto-refresh enabled.' : 'Inspector auto-refresh disabled.',
      );
    }),

    vscode.commands.registerCommand('love2d-tools.inspectorEdit', (node) => {
      inspector.editValue(node);
    }),
  );

  // ══════════════════════════════════════════════════════════
  //  Phase 2: Language Feature Providers (FREE)
  // ══════════════════════════════════════════════════════════

  const luaSelector = { language: 'lua', scheme: 'file' };

  // Color Palette
  const colorPalette = new ColorPaletteProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('love2dColorPalette', colorPalette),
    vscode.commands.registerCommand('love2d-tools.saveColorToPalette', () => saveColorToPalette()),
    vscode.commands.registerCommand('love2d-tools.insertPaletteColor', (item) => insertPaletteColor(item)),
    vscode.commands.registerCommand('love2d-tools.removePaletteColor', (item) => {
      removePaletteColor(item);
      colorPalette.refresh();
    }),
    vscode.commands.registerCommand('love2d-tools.applyPaletteColor', () => applyPaletteColor()),
    vscode.commands.registerCommand('love2d-tools.refreshPalette', () => colorPalette.refresh()),
    { dispose: () => colorPalette.dispose() },
  );

  context.subscriptions.push(
    // Color Picker
    vscode.languages.registerColorProvider(luaSelector, new Love2DColorProvider()),

    // Palette Autocomplete (type palette name in string → color preview + insert)
    vscode.languages.registerCompletionItemProvider(luaSelector, new PaletteCompletionProvider(), '"', "'"),

    // Go to Definition
    vscode.languages.registerDefinitionProvider(luaSelector, new Love2DDefinitionProvider()),

    // Find All References
    vscode.languages.registerReferenceProvider(luaSelector, new Love2DReferenceProvider()),

    // Document Symbols
    vscode.languages.registerDocumentSymbolProvider(luaSelector, new Love2DDocumentSymbolProvider()),

    // Inlay Hints
    vscode.languages.registerInlayHintsProvider(luaSelector, new Love2DInlayHintsProvider()),

    // Code Actions
    vscode.languages.registerCodeActionsProvider(luaSelector, new Love2DCodeActionProvider(), {
      providedCodeActionKinds: Love2DCodeActionProvider.providedCodeActionKinds,
    }),
  );

  // Enhanced Diagnostics
  const enhancedDiagnostics = new EnhancedDiagnostics();
  enhancedDiagnostics.activate(context);

  // ══════════════════════════════════════════════════════════
  //  Phase 3: Visual Feature Commands (PRO)
  // ══════════════════════════════════════════════════════════

  context.subscriptions.push(
    // Asset Browser
    vscode.commands.registerCommand('love2d-tools.refreshAssetBrowser', () => {
      assetBrowser.refresh();
    }),

    vscode.commands.registerCommand('love2d-tools.previewAsset', (node) => {
      if (!requirePro('Asset Browser')) return;
      assetPreview.show(node);
    }),

    // Module Dependency Graph
    vscode.commands.registerCommand('love2d-tools.showDependencyGraph', () => {
      const pp = findProjectPath();
      if (!pp) return;
      dependencyGraph.show(pp);
    }),

    // Shader Live Edit
    vscode.commands.registerCommand('love2d-tools.toggleShaderEdit', () => {
      if (!requirePro('Shader Live Edit')) return;
      const enabled = shaderEditor.toggle();
      vscode.window.showInformationMessage(
        enabled ? 'Shader live edit enabled.' : 'Shader live edit disabled.',
      );
    }),
  );

  // ══════════════════════════════════════════════════════════
  //  Phase 4: Advanced Feature Commands (PRO)
  // ══════════════════════════════════════════════════════════

  context.subscriptions.push(
    // Lua Profiler
    vscode.commands.registerCommand('love2d-tools.showProfiler', async () => {
      if (!requirePro('Lua Profiler')) return;
      await profilerPanel.show();
    }),

    // Sprite/Quad Helper
    vscode.commands.registerCommand('love2d-tools.showSpriteEditor', async () => {
      if (!requirePro('Sprite/Quad Helper')) return;
      await spriteEditor.show();
    }),
  );

  // ══════════════════════════════════════════════════════════
  //  Tree View Providers
  // ══════════════════════════════════════════════════════════

  // Game State Inspector tree view
  context.subscriptions.push(
    vscode.window.createTreeView('love2dInspector', {
      treeDataProvider: inspector,
      showCollapseAll: true,
    }),
  );

  // Asset Browser tree view
  context.subscriptions.push(
    vscode.window.createTreeView('love2dAssetBrowser', {
      treeDataProvider: assetBrowser,
      showCollapseAll: true,
    }),
  );

  // ── Asset checker activation (Pro: live diagnostics) ──
  assetChecker.activate(context);

  // ── Bridge log → Output Channel ──
  // On Windows, love.exe stdout cannot be piped. Instead we receive logs
  // through the bridge TCP connection (bridge.lua hooks print()).
  // loveOutputChannel is shared with launcher.ts via setOutputChannel().
  bridge.onLog((log) => {
    loveOutputChannel.appendLine(log.message);
  });
  bridge.onConnected(() => {
    loveOutputChannel.appendLine('[bridge] Connected');
  });
  bridge.onDisconnected(() => {
    loveOutputChannel.appendLine('[bridge] Disconnected');
  });

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
    { dispose: () => replPanel.dispose() },
    { dispose: () => inspector.dispose() },
    { dispose: () => assetPreview.dispose() },
    { dispose: () => assetBrowser.dispose() },
    { dispose: () => dependencyGraph.dispose() },
    { dispose: () => shaderEditor.dispose() },
    { dispose: () => profilerPanel.dispose() },
    { dispose: () => spriteEditor.dispose() },
    { dispose: () => enhancedDiagnostics.dispose() },
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
