import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';

/** Timeout (ms) for detection subprocess calls. */
const DETECT_TIMEOUT = 5000;

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
  if (isExecutable(appPath)) return appPath;

  // Homebrew (Apple Silicon first, then Intel)
  const brewPaths = [
    '/opt/homebrew/bin/love',
    '/usr/local/bin/love',
  ];
  for (const p of brewPaths) {
    if (isExecutable(p)) return p;
  }

  // MacPorts
  const macPortsPath = '/opt/local/bin/love';
  if (isExecutable(macPortsPath)) return macPortsPath;

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
    if (isExecutable(p)) return p;
  }

  // Check if flatpak is available
  const flatpakPath = await checkFlatpak();
  if (flatpakPath) return flatpakPath;

  // PATH
  return findInPath('love');
}

/**
 * Check if a file exists and is executable.
 */
function isExecutable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
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
      execFile('reg', ['query', key, '/ve'], { timeout: DETECT_TIMEOUT }, (err, stdout) => {
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
    execFile('flatpak', ['info', 'org.love2d.love'], { timeout: DETECT_TIMEOUT }, (err) => {
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
    execFile(cmd, [executable], { timeout: DETECT_TIMEOUT }, (err, stdout) => {
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
 * Parse a flatpak-style command string into [command, ...args].
 * E.g. 'flatpak run org.love2d.love' → ['flatpak', ['run', 'org.love2d.love']]
 */
export function parseFlatpakCommand(lovePath: string): { cmd: string; args: string[] } {
  const firstSpace = lovePath.indexOf(' ');
  const cmd = lovePath.substring(0, firstSpace);
  const rest = lovePath.substring(firstSpace + 1).trim();
  // Split remaining args, preserving quoted strings
  const args: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';
  for (const ch of rest) {
    if (inQuote) {
      if (ch === quoteChar) {
        inQuote = false;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === ' ') {
      if (current) { args.push(current); current = ''; }
    } else {
      current += ch;
    }
  }
  if (current) args.push(current);
  return { cmd, args };
}

/**
 * Get Love2D version by running `love --version`.
 */
export function getLoveVersion(lovePath: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    // Flatpak command needs special handling
    if (lovePath.startsWith('flatpak ')) {
      const { args } = parseFlatpakCommand(lovePath);
      args.push('--version');
      execFile('flatpak', args, { timeout: DETECT_TIMEOUT }, (err, stdout) => {
        if (!err && stdout) {
          resolve(parseVersion(stdout));
        } else {
          resolve(undefined);
        }
      });
      return;
    }

    execFile(lovePath, ['--version'], { timeout: DETECT_TIMEOUT }, (err, stdout) => {
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
