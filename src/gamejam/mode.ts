import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';

/**
 * Game Jam Mode:
 * - Countdown timer in the status bar
 * - Build .love file (zip with .love extension)
 * - Submission checklist
 */

export class GameJamMode {
  private timerStatusBar: vscode.StatusBarItem | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private deadline: number | null = null;

  constructor() {}

  /**
   * Start a countdown timer.
   */
  startTimer(statusBar: vscode.StatusBarItem, hours: number): void {
    this.timerStatusBar = statusBar;
    this.deadline = Date.now() + hours * 60 * 60 * 1000;

    this.updateTimer();
    this.timerInterval = setInterval(() => this.updateTimer(), 1000);
  }

  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.deadline = null;
    if (this.timerStatusBar) {
      this.timerStatusBar.hide();
    }
  }

  private updateTimer(): void {
    if (!this.deadline || !this.timerStatusBar) return;

    const remaining = this.deadline - Date.now();
    if (remaining <= 0) {
      this.timerStatusBar.text = '$(clock) TIME UP!';
      this.timerStatusBar.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.errorBackground',
      );
      this.stopTimer();
      vscode.window.showWarningMessage('Game Jam: Time is up!');
      return;
    }

    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

    this.timerStatusBar.text = `$(clock) ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    this.timerStatusBar.show();
  }

  /**
   * Build a .love file (zip archive of project directory).
   * Uses the `zip` command on Unix or PowerShell on Windows.
   */
  async buildLoveFile(projectPath: string): Promise<string | undefined> {
    const projectName = path.basename(projectPath);
    const outputPath = path.join(projectPath, `${projectName}.love`);

    // Collect files to include (exclude hidden dirs, .love files, node_modules)
    const filesToInclude = collectProjectFiles(projectPath);

    if (filesToInclude.length === 0) {
      vscode.window.showErrorMessage('No files found to package.');
      return undefined;
    }

    return new Promise<string | undefined>((resolve) => {
      if (process.platform === 'win32') {
        // Use PowerShell to create zip
        const script = `
          $files = @(${filesToInclude.map(f => `'${f.replace(/'/g, "''")}'`).join(',')})
          Compress-Archive -Path $files -DestinationPath '${outputPath.replace(/'/g, "''")}' -Force
        `;
        execFile('powershell', ['-NoProfile', '-Command', script], { cwd: projectPath }, (err) => {
          if (err) {
            vscode.window.showErrorMessage(`Build failed: ${err.message}`);
            resolve(undefined);
          } else {
            resolve(outputPath);
          }
        });
      } else {
        // Use zip command
        const relativeFiles = filesToInclude.map(f => path.relative(projectPath, f));
        execFile('zip', ['-r', outputPath, ...relativeFiles], { cwd: projectPath }, (err) => {
          if (err) {
            vscode.window.showErrorMessage(`Build failed: ${err.message}`);
            resolve(undefined);
          } else {
            resolve(outputPath);
          }
        });
      }
    });
  }

  /**
   * Show a submission checklist as QuickPick items.
   */
  async showChecklist(): Promise<void> {
    const items = [
      { label: '$(check) Game runs without errors', picked: false },
      { label: '$(check) conf.lua has correct title', picked: false },
      { label: '$(check) Window size is appropriate', picked: false },
      { label: '$(check) .love file builds and runs', picked: false },
      { label: '$(check) README / description written', picked: false },
      { label: '$(check) Screenshots prepared', picked: false },
      { label: '$(check) License/credits included', picked: false },
    ];

    await vscode.window.showQuickPick(items, {
      canPickMany: true,
      placeHolder: 'Game Jam Submission Checklist',
    });
  }

  dispose(): void {
    this.stopTimer();
  }
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function collectProjectFiles(dir: string, base?: string): string[] {
  const root = base || dir;
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(root, fullPath);

    // Skip hidden files/dirs, .love files, node_modules, .vscode
    if (entry.name.startsWith('.') ||
        entry.name === 'node_modules' ||
        entry.name.endsWith('.love')) {
      continue;
    }

    if (entry.isDirectory()) {
      results.push(...collectProjectFiles(fullPath, root));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}
