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

  isTimerRunning(): boolean {
    return this.timerInterval !== null;
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

    // .love files require main.lua at the zip root, so use relative paths
    const relativeFiles = filesToInclude.map(f => path.relative(projectPath, f));

    // Remove existing .love file to avoid stale builds
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    return new Promise<string | undefined>((resolve) => {
      if (process.platform === 'win32') {
        // Use PowerShell: write file list to a temp file to avoid command-line length limits
        const listFile = path.join(projectPath, '.love2d-tools-filelist.txt');
        fs.writeFileSync(listFile, relativeFiles.join('\n'), 'utf-8');

        // Compress-Archive only supports .zip — create as .zip then rename to .love
        const zipPath = outputPath.replace(/\.love$/, '.zip');
        if (fs.existsSync(zipPath)) {
          fs.unlinkSync(zipPath);
        }
        const script = `
          Set-Location -LiteralPath '${projectPath.replace(/'/g, "''")}'
          $files = Get-Content '${listFile.replace(/'/g, "''")}'
          Compress-Archive -Path $files -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force
          Rename-Item -LiteralPath '${zipPath.replace(/'/g, "''")}' -NewName '${path.basename(outputPath).replace(/'/g, "''")}' -Force
          Remove-Item '${listFile.replace(/'/g, "''")}' -ErrorAction SilentlyContinue
        `;
        execFile('powershell', ['-NoProfile', '-Command', script], { cwd: projectPath }, (err, _stdout, stderr) => {
          // Clean up list file on error too
          try { fs.unlinkSync(listFile); } catch { /* ignore */ }
          if (err) {
            vscode.window.showErrorMessage(`Build failed: ${err.message}`);
            resolve(undefined);
          } else if (!fs.existsSync(outputPath)) {
            vscode.window.showErrorMessage(`Build failed: .love file was not created.${stderr ? ' ' + stderr : ''}`);
            resolve(undefined);
          } else {
            resolve(outputPath);
          }
        });
      } else {
        // Verify that 'zip' command is available on this system
        execFile('which', ['zip'], { timeout: 3000 }, (whichErr) => {
          if (whichErr) {
            const installHint = process.platform === 'darwin'
              ? 'Install with: brew install zip'
              : 'Install with: sudo apt install zip (Debian/Ubuntu) or sudo dnf install zip (Fedora)';
            vscode.window.showErrorMessage(
              `Build failed: 'zip' command not found. ${installHint}`,
            );
            resolve(undefined);
            return;
          }
          execFile('zip', ['-r', outputPath, ...relativeFiles], { cwd: projectPath }, (err) => {
            if (err) {
              vscode.window.showErrorMessage(`Build failed: ${err.message}`);
              resolve(undefined);
            } else if (!fs.existsSync(outputPath)) {
              vscode.window.showErrorMessage('Build failed: .love file was not created.');
              resolve(undefined);
            } else {
              resolve(outputPath);
            }
          });
        });
      }
    });
  }

  /**
   * Run automated submission checks and display results.
   * Clicking a failed item triggers a fix action.
   */
  async showChecklist(): Promise<void> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) return;
    const root = folders[0].uri.fsPath;

    const checks = await this.runChecks(root);
    const passed = checks.filter(c => c.ok).length;
    const total = checks.length;

    const items = checks.map(c => ({
      label: `${c.ok ? '$(pass)' : '$(error)'} ${c.name}`,
      description: c.ok ? '' : c.detail,
      detail: c.detail,
      action: c.action,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Jam Checklist: ${passed}/${total} passed — click an item to fix`,
      canPickMany: false,
    });

    if (selected?.action) {
      await selected.action(root);
      // Re-run checklist after action
      await this.showChecklist();
    }
  }

  private async runChecks(root: string): Promise<{ name: string; ok: boolean; detail: string; action?: (root: string) => Promise<void> }[]> {
    type CheckResult = { name: string; ok: boolean; detail: string; action?: (root: string) => Promise<void> };
    const results: CheckResult[] = [];

    // 1. conf.lua exists and has a non-default title
    const confPath = path.join(root, 'conf.lua');
    if (fs.existsSync(confPath)) {
      const conf = fs.readFileSync(confPath, 'utf-8');
      const titleMatch = conf.match(/t\.title\s*=\s*["']([^"']+)["']/);
      const title = titleMatch ? titleMatch[1] : '';
      const isDefault = !title || title === 'My Game' || title === 'Untitled';
      results.push({
        name: 'Game title set',
        ok: !isDefault,
        detail: isDefault ? `Title is "${title || '(empty)'}" — click to open conf.lua` : `Title: "${title}"`,
        action: !isDefault ? undefined : async (r) => {
          const doc = await vscode.workspace.openTextDocument(path.join(r, 'conf.lua'));
          await vscode.window.showTextDocument(doc);
        },
      });
    } else {
      results.push({
        name: 'conf.lua exists',
        ok: false,
        detail: 'Click to create conf.lua',
        action: async (r) => {
          const content = `function love.conf(t)\n    t.title = "My Jam Game"\n    t.version = "11.5"\n    t.window.width = 800\n    t.window.height = 600\nend\n`;
          const filePath = path.join(r, 'conf.lua');
          fs.writeFileSync(filePath, content, 'utf-8');
          const doc = await vscode.workspace.openTextDocument(filePath);
          await vscode.window.showTextDocument(doc);
        },
      });
    }

    // 2. No Lua diagnostic errors
    const diagnostics = vscode.languages.getDiagnostics();
    const luaErrors = diagnostics
      .filter(([uri]) => uri.fsPath.endsWith('.lua'))
      .flatMap(([, diags]) => diags.filter(d => d.severity === vscode.DiagnosticSeverity.Error));
    results.push({
      name: 'No Lua errors',
      ok: luaErrors.length === 0,
      detail: luaErrors.length > 0 ? `${luaErrors.length} error(s) — click to show Problems` : 'No errors',
      action: luaErrors.length === 0 ? undefined : async () => {
        vscode.commands.executeCommand('workbench.actions.view.problems');
      },
    });

    // 3. .love file built
    const loveFiles = fs.readdirSync(root).filter(f => f.endsWith('.love'));
    results.push({
      name: '.love file built',
      ok: loveFiles.length > 0,
      detail: loveFiles.length > 0 ? loveFiles.join(', ') : 'Click to build .love',
      action: loveFiles.length > 0 ? undefined : async () => {
        vscode.commands.executeCommand('love2d-tools.buildLove');
      },
    });

    // 4. README exists
    const readmeNames = ['README.md', 'README.txt', 'README', 'readme.md'];
    const hasReadme = readmeNames.some(n => fs.existsSync(path.join(root, n)));
    results.push({
      name: 'README exists',
      ok: hasReadme,
      detail: hasReadme ? 'Found' : 'Click to create README.md',
      action: hasReadme ? undefined : async (r) => {
        const content = `# My Game\n\nA game made for [jam name] in [hours] hours.\n\n## How to Play\n\n- Arrow keys to move\n- Space to jump\n\n## Credits\n\n- Made with [LÖVE](https://love2d.org)\n`;
        const filePath = path.join(r, 'README.md');
        fs.writeFileSync(filePath, content, 'utf-8');
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
      },
    });

    // 5. No leftover debug prints (excessive print() calls)
    let printCount = 0;
    const luaFiles = this.findLuaFiles(root);
    for (const file of luaFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const matches = content.match(/\bprint\s*\(/g);
      if (matches) printCount += matches.length;
    }
    results.push({
      name: 'Debug prints cleaned up',
      ok: printCount <= 5,
      detail: printCount > 5 ? `${printCount} print() calls — click to search` : `${printCount} print() call(s)`,
      action: printCount <= 5 ? undefined : async () => {
        vscode.commands.executeCommand('workbench.action.findInFiles', {
          query: 'print(',
          filesToInclude: '**/*.lua',
          isRegex: false,
        });
      },
    });

    // 6. LICENSE or CREDITS file
    const licenseNames = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'CREDITS', 'CREDITS.md', 'CREDITS.txt'];
    const hasLicense = licenseNames.some(n => fs.existsSync(path.join(root, n)));
    results.push({
      name: 'License/credits included',
      ok: hasLicense,
      detail: hasLicense ? 'Found' : 'Click to create CREDITS.md',
      action: hasLicense ? undefined : async (r) => {
        const content = `# Credits\n\n## Code\n\n- [Your Name]\n\n## Assets\n\n- [Asset name] by [Author] — [License]\n\n## Libraries\n\n- [Library name] — [License]\n\n## Tools\n\n- Made with [LÖVE](https://love2d.org) (zlib/libpng license)\n`;
        const filePath = path.join(r, 'CREDITS.md');
        fs.writeFileSync(filePath, content, 'utf-8');
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
      },
    });

    // 7. No TODO/FIXME left in code
    let todoCount = 0;
    for (const file of luaFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const matches = content.match(/\b(TODO|FIXME|HACK|XXX)\b/gi);
      if (matches) todoCount += matches.length;
    }
    results.push({
      name: 'No TODO/FIXME left',
      ok: todoCount === 0,
      detail: todoCount > 0 ? `${todoCount} remaining — click to search` : 'Clean',
      action: todoCount === 0 ? undefined : async () => {
        vscode.commands.executeCommand('workbench.action.findInFiles', {
          query: 'TODO|FIXME|HACK|XXX',
          filesToInclude: '**/*.lua',
          isRegex: true,
        });
      },
    });

    return results;
  }

  private findLuaFiles(dir: string): string[] {
    const results: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        if (entry.isSymbolicLink()) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...this.findLuaFiles(full));
        } else if (entry.name.endsWith('.lua') && !entry.name.startsWith('_love2d_tools_')) {
          results.push(full);
        }
      }
    } catch {
      // skip unreadable dirs
    }
    return results;
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
    // Skip hidden files/dirs, .love files, node_modules, dev tools bridge, symlinks
    if (entry.name.startsWith('.') ||
        entry.name === 'node_modules' ||
        entry.name.endsWith('.love') ||
        entry.name.startsWith('_love2d_tools_') ||
        entry.isSymbolicLink()) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...collectProjectFiles(fullPath, root));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}
