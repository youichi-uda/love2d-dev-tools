import * as vscode from 'vscode';
import * as https from 'https';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Library manager: downloads popular Love2D libraries from GitHub
 * and installs them into the project's lib/ directory.
 */

export interface LibraryInfo {
  name: string;
  description: string;
  repo: string;       // "user/repo"
  mainFile: string;   // e.g., "lume.lua"
  branch: string;     // default branch
  files: string[];    // files to download
}

/** Registry of known Love2D libraries. */
export const LIBRARY_REGISTRY: LibraryInfo[] = [
  {
    name: 'Lume',
    description: 'Collection of useful Lua utility functions',
    repo: 'rxi/lume',
    mainFile: 'lume.lua',
    branch: 'master',
    files: ['lume.lua'],
  },
  {
    name: 'Classic',
    description: 'Tiny class module for Lua',
    repo: 'rxi/classic',
    mainFile: 'classic.lua',
    branch: 'master',
    files: ['classic.lua'],
  },
  {
    name: 'STI (Simple Tiled Implementation)',
    description: 'Tiled map loader and renderer',
    repo: 'karai17/Simple-Tiled-Implementation',
    mainFile: 'sti/init.lua',
    branch: 'master',
    files: ['sti/init.lua', 'sti/utils.lua', 'sti/plugins/box2d.lua'],
  },
  {
    name: 'HUMP',
    description: 'Helper Utilities for Massive Progression — camera, gamestates, timer, vector',
    repo: 'vrld/hump',
    mainFile: 'hump/camera.lua',
    branch: 'master',
    files: [
      'camera.lua', 'class.lua', 'gamestate.lua',
      'signal.lua', 'timer.lua', 'vector.lua', 'vector-light.lua',
    ],
  },
  {
    name: 'Windfield',
    description: 'Physics module for Love2D',
    repo: 'a327ex/windfield',
    mainFile: 'windfield/init.lua',
    branch: 'master',
    files: ['windfield/init.lua'],
  },
  {
    name: 'Anim8',
    description: 'Animation library for Love2D',
    repo: 'kikito/anim8',
    mainFile: 'anim8.lua',
    branch: 'main',
    files: ['anim8.lua'],
  },
  {
    name: 'Bump',
    description: 'Collision detection library for axis-aligned rectangles',
    repo: 'kikito/bump.lua',
    mainFile: 'bump.lua',
    branch: 'master',
    files: ['bump.lua'],
  },
];

export class LibraryManager {
  /**
   * Show a picker to select and install a library.
   */
  async addLibrary(projectPath: string): Promise<void> {
    const items = LIBRARY_REGISTRY.map(lib => ({
      label: lib.name,
      description: lib.description,
      detail: `GitHub: ${lib.repo}`,
      lib,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a library to add',
    });

    if (!selected) return;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Installing ${selected.lib.name}...`,
      },
      async () => {
        await this.installLibrary(projectPath, selected.lib);
      },
    );
  }

  /**
   * Download and install a library into the project.
   */
  async installLibrary(projectPath: string, lib: LibraryInfo): Promise<void> {
    const libDir = path.join(projectPath, 'lib');
    if (!fs.existsSync(libDir)) {
      fs.mkdirSync(libDir, { recursive: true });
    }

    for (const file of lib.files) {
      const url = `https://raw.githubusercontent.com/${lib.repo}/${lib.branch}/${file}`;
      const targetPath = path.join(libDir, file);

      // Ensure subdirectories exist
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      try {
        const content = await this.downloadFile(url);
        fs.writeFileSync(targetPath, content, 'utf-8');
      } catch (err) {
        vscode.window.showErrorMessage(
          `Failed to download ${file}: ${err instanceof Error ? err.message : String(err)}`,
        );
        return;
      }
    }

    vscode.window.showInformationMessage(
      `${lib.name} installed to lib/. Use require("lib.${path.basename(lib.mainFile, '.lua')}") to import.`,
    );
  }

  /**
   * Download a file from a URL.
   */
  private downloadFile(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const makeRequest = (requestUrl: string, redirects: number = 0) => {
        if (redirects > 5) {
          reject(new Error('Too many redirects'));
          return;
        }

        https.get(requestUrl, (res) => {
          // Handle redirects
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            makeRequest(res.headers.location, redirects + 1);
            return;
          }

          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }

          let data = '';
          res.on('data', (chunk: string) => data += chunk);
          res.on('end', () => resolve(data));
          res.on('error', reject);
        }).on('error', reject);
      };

      makeRequest(url);
    });
  }

  dispose(): void {}
}
