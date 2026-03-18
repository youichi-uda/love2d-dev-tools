import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';

/**
 * Detects the love executable path based on the current platform.
 * Checks user configuration first, then platform-specific common locations.
 */
export async function detectLovePath(): Promise<string | undefined> {
  // 1. User-configured path
  const config = vscode.workspace.getConfiguration('love2d-tools');
  const configured: string = config.get('lovePath', '');
  if (configured && fs.existsSync(configured)) {
    return configured;
  }

  const platform = process.platform;

  // 2. Platform-specific detection
  if (platform === 'win32') {
    return detectWindows();
  } else if (platform === 'darwin') {
    return detectMac();
  } else {
    return detectLinux();
  }
}

async function detectWindows(): Promise<string | undefined> {
  // Common install paths
  const candidates = [
    'C:\\Program Files\\LOVE\\love.exe',
    'C:\\Program Files (x86)\\LOVE\\love.exe',
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  // Try registry
  const regPath = await queryWindowsRegistry();
  if (regPath) return regPath;

  // Try PATH
  return findInPath('love.exe');
}

async function detectMac(): Promise<string | undefined> {
  // App bundle
  const appPath = '/Applications/love.app/Contents/MacOS/love';
  if (fs.existsSync(appPath)) return appPath;

  // Homebrew
  const brewPaths = [
    '/usr/local/bin/love',
    '/opt/homebrew/bin/love',
  ];
  for (const p of brewPaths) {
    if (fs.existsSync(p)) return p;
  }

  // PATH
  return findInPath('love');
}

async function detectLinux(): Promise<string | undefined> {
  // Standard paths
  const standardPaths = [
    '/usr/bin/love',
    '/usr/local/bin/love',
    '/snap/bin/love',
  ];

  for (const p of standardPaths) {
    if (fs.existsSync(p)) return p;
  }

  // Check if flatpak is available
  const flatpakPath = await checkFlatpak();
  if (flatpakPath) return flatpakPath;

  // PATH
  return findInPath('love');
}

function queryWindowsRegistry(): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve(undefined);
      return;
    }

    const regKeys = [
      'HKLM\\SOFTWARE\\LOVE',
      'HKLM\\SOFTWARE\\WOW6432Node\\LOVE',
      'HKCU\\SOFTWARE\\LOVE',
    ];

    let remaining = regKeys.length;
    let found = false;

    for (const key of regKeys) {
      execFile('reg', ['query', key, '/ve'], (err, stdout) => {
        remaining--;
        if (!found && !err && stdout) {
          const match = stdout.match(/REG_SZ\s+(.+)/);
          if (match) {
            const regValue = match[1].trim();
            const lovePath = path.join(regValue, 'love.exe');
            if (fs.existsSync(lovePath)) {
              found = true;
              resolve(lovePath);
              return;
            }
          }
        }
        if (remaining === 0 && !found) {
          resolve(undefined);
        }
      });
    }
  });
}

function checkFlatpak(): Promise<string | undefined> {
  return new Promise((resolve) => {
    execFile('flatpak', ['info', 'org.love2d.love'], (err) => {
      if (!err) {
        resolve('flatpak run org.love2d.love');
      } else {
        resolve(undefined);
      }
    });
  });
}

function findInPath(executable: string): Promise<string | undefined> {
  const cmd = process.platform === 'win32' ? 'where' : 'which';
  return new Promise((resolve) => {
    execFile(cmd, [executable], (err, stdout) => {
      if (!err && stdout) {
        const result = stdout.trim().split('\n')[0].trim();
        if (result && fs.existsSync(result)) {
          resolve(result);
          return;
        }
      }
      resolve(undefined);
    });
  });
}

/**
 * Get Love2D version by running `love --version`.
 */
export function getLoveVersion(lovePath: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    // Flatpak command needs special handling
    if (lovePath.startsWith('flatpak ')) {
      const args = lovePath.split(' ').slice(1);
      args.push('--version');
      execFile('flatpak', args, (err, stdout) => {
        if (!err && stdout) {
          resolve(parseVersion(stdout));
        } else {
          resolve(undefined);
        }
      });
      return;
    }

    execFile(lovePath, ['--version'], (err, stdout) => {
      if (!err && stdout) {
        resolve(parseVersion(stdout));
      } else {
        resolve(undefined);
      }
    });
  });
}

function parseVersion(output: string): string | undefined {
  // Output is like "LOVE 11.5 (Mysterious Mysteries)"
  const match = output.match(/(\d+\.\d+(?:\.\d+)?)/);
  return match ? match[1] : undefined;
}
