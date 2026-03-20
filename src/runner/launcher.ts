import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { detectLovePath, getLoveVersion, parseFlatpakCommand } from './detector';

let gameProcess: ChildProcess | null = null;
let _outputChannel: vscode.OutputChannel | null = null;

/**
 * Returns whether a game is currently running.
 */
export function isGameRunning(): boolean {
  return gameProcess !== null && gameProcess.exitCode === null;
}

/**
 * Set the shared output channel (created once in extension.ts).
 */
export function setOutputChannel(channel: vscode.OutputChannel): void {
  _outputChannel = channel;
}

function getOutputChannel(): vscode.OutputChannel {
  if (!_outputChannel) {
    _outputChannel = vscode.window.createOutputChannel('Love2D');
  }
  return _outputChannel;
}

/**
 * Launch the Love2D game in the given project folder.
 */
export async function launchGame(
  projectPath: string,
  extraArgs: string[] = [],
): Promise<void> {
  // If already running, ask to restart
  if (isGameRunning()) {
    const restart = await vscode.window.showWarningMessage(
      vscode.l10n.t('Game is already running. Restart?'),
      vscode.l10n.t('Restart'),
      vscode.l10n.t('Cancel'),
    );
    if (restart !== vscode.l10n.t('Restart')) return;
    await stopGame();
  }

  const lovePath = await detectLovePath();
  if (!lovePath) {
    const action = await vscode.window.showErrorMessage(
      vscode.l10n.t('Could not find love executable. Please set the path in settings.'),
      vscode.l10n.t('Open Settings'),
    );
    if (action === vscode.l10n.t('Open Settings')) {
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        'love2d-tools.lovePath',
      );
    }
    return;
  }

  const channel = getOutputChannel();
  channel.clear();
  channel.show(true);

  // Deploy bridge module for Pro features (screenshot, perf, hot reload, etc.)
  deployBridge(projectPath);

  const args = [projectPath, ...extraArgs];
  const env = { ...process.env, LOVE2D_TOOLS: '1' };

  // On Windows, love.exe (GUI subsystem) cannot pipe stdout to Node.js,
  // and lovec.exe (console subsystem) also fails to pipe when spawned from
  // Electron. We use love.exe and rely on the bridge TCP connection for
  // log forwarding instead. On other platforms, stdout piping works.
  if (lovePath.startsWith('flatpak ')) {
    const parsed = parseFlatpakCommand(lovePath);
    gameProcess = spawn(parsed.cmd, [...parsed.args, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });
  } else {
    gameProcess = spawn(lovePath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });
  }

  const proc = gameProcess;

  proc.stdout?.on('data', (data: Buffer) => {
    channel.append(data.toString());
  });

  proc.stderr?.on('data', (data: Buffer) => {
    channel.append(data.toString());
  });

  proc.on('error', (err: Error) => {
    channel.appendLine(`[Error] ${err.message}`);
    gameProcess = null;
    onGameStateChanged.fire(false);
  });

  proc.on('exit', (code: number | null) => {
    if (code !== null && code !== 0) {
      channel.appendLine(
        vscode.l10n.t('Game process exited with code {0}.', code),
      );
    }
    gameProcess = null;
    onGameStateChanged.fire(false);
  });

  onGameStateChanged.fire(true);
}

/**
 * Stop the currently running Love2D game.
 */
export async function stopGame(): Promise<void> {
  if (!isGameRunning() || !gameProcess) {
    return;
  }

  return new Promise<void>((resolve) => {
    const proc = gameProcess!;

    proc.on('exit', () => {
      gameProcess = null;
      onGameStateChanged.fire(false);
      resolve();
    });

    // Try graceful kill first
    if (!proc.pid) {
      gameProcess = null;
      onGameStateChanged.fire(false);
      resolve();
      return;
    }
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F']);
    } else {
      proc.kill('SIGTERM');
      // Force kill after 2 seconds
      setTimeout(() => {
        if (proc.exitCode === null) {
          proc.kill('SIGKILL');
        }
      }, 2000);
    }
  });
}

/**
 * Get the detected Love2D version string.
 */
export async function getDetectedVersion(): Promise<string | undefined> {
  const lovePath = await detectLovePath();
  if (!lovePath) return undefined;
  return getLoveVersion(lovePath);
}

/**
 * Event emitter for game state changes (running/stopped).
 */
export const onGameStateChanged = new vscode.EventEmitter<boolean>();

// ── Bridge injection ──

/** Line injected at the top of main.lua to conditionally load the bridge. */
const BRIDGE_REQUIRE_LINE = 'if os.getenv("LOVE2D_TOOLS") then pcall(require, "_love2d_tools_bridge") end';

/**
 * Copy bridge.lua into the project and ensure main.lua loads it.
 * The bridge only activates when LOVE2D_TOOLS env var is set,
 * so release builds are unaffected.
 */
function deployBridge(projectPath: string): void {
  try {
    // Copy bridge.lua → _love2d_tools_bridge.lua
    // __dirname at runtime is out/runner/ (compiled) or src/runner/ (dev)
    // bridge.lua is at src/bridge/bridge.lua from the extension root
    const extRoot = path.join(__dirname, '..', '..');
    const candidates = [
      path.join(extRoot, 'src', 'bridge', 'bridge.lua'),  // dev: extension root → src/bridge/
      path.join(__dirname, '..', 'bridge', 'bridge.lua'),  // compiled: out/bridge/ (if copied)
    ];
    const src = candidates.find(p => fs.existsSync(p));
    const dest = path.join(projectPath, '_love2d_tools_bridge.lua');

    if (src) {
      fs.copyFileSync(src, dest);
    }

    // Inject bridge require into main.lua (idempotent)
    const mainLua = path.join(projectPath, 'main.lua');
    if (fs.existsSync(mainLua)) {
      const content = fs.readFileSync(mainLua, 'utf-8');
      if (!content.includes('_love2d_tools_bridge')) {
        fs.writeFileSync(mainLua, BRIDGE_REQUIRE_LINE + '\n' + content, 'utf-8');
      }
    }
  } catch {
    // Non-critical: bridge features just won't work
  }
}

/**
 * Dispose resources.
 */
export function dispose(): void {
  if (isGameRunning()) {
    stopGame();
  }
  // Output channel is owned by extension.ts — do not dispose here
  onGameStateChanged.dispose();
}
