import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import { detectLovePath, getLoveVersion } from './detector';

let gameProcess: ChildProcess | null = null;
let outputChannel: vscode.OutputChannel | null = null;

/**
 * Returns whether a game is currently running.
 */
export function isGameRunning(): boolean {
  return gameProcess !== null && gameProcess.exitCode === null;
}

/**
 * Get or create the output channel for Love2D console output.
 */
function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Love2D');
  }
  return outputChannel;
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

  const args = [projectPath, ...extraArgs];

  // Handle flatpak command (space-separated command string)
  if (lovePath.startsWith('flatpak ')) {
    const parts = lovePath.split(' ');
    const cmd = parts[0];
    const flatpakArgs = [...parts.slice(1), ...args];
    gameProcess = spawn(cmd, flatpakArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } else {
    gameProcess = spawn(lovePath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
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

/**
 * Dispose resources.
 */
export function dispose(): void {
  if (isGameRunning()) {
    stopGame();
  }
  outputChannel?.dispose();
  onGameStateChanged.dispose();
}
