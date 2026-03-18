import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Asset path checker: scans Lua files for asset-loading calls
 * (love.graphics.newImage, love.audio.newSource, etc.) and
 * validates that the referenced files exist on disk.
 */

const ASSET_PATTERNS: { pattern: RegExp; argIndex: number }[] = [
  { pattern: /love\.graphics\.newImage\s*\(\s*["']([^"']+)["']/g, argIndex: 1 },
  { pattern: /love\.graphics\.newFont\s*\(\s*["']([^"']+)["']/g, argIndex: 1 },
  { pattern: /love\.audio\.newSource\s*\(\s*["']([^"']+)["']/g, argIndex: 1 },
  { pattern: /love\.image\.newImageData\s*\(\s*["']([^"']+)["']/g, argIndex: 1 },
  { pattern: /love\.sound\.newSoundData\s*\(\s*["']([^"']+)["']/g, argIndex: 1 },
  { pattern: /love\.video\.newVideo\s*\(\s*["']([^"']+)["']/g, argIndex: 1 },
  { pattern: /love\.filesystem\.read\s*\(\s*["']([^"']+)["']/g, argIndex: 1 },
  { pattern: /love\.filesystem\.load\s*\(\s*["']([^"']+)["']/g, argIndex: 1 },
];

export class AssetChecker {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('love2d-assets');
  }

  /**
   * Activate the asset checker.  Registers listeners for document changes.
   */
  activate(context: vscode.ExtensionContext): void {
    this.disposables.push(this.diagnosticCollection);

    // Check open documents
    for (const doc of vscode.workspace.textDocuments) {
      if (doc.languageId === 'lua') {
        this.checkDocument(doc);
      }
    }

    // Watch for changes
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.languageId === 'lua') {
          this.checkDocument(e.document);
        }
      }),
    );

    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument((doc) => {
        if (doc.languageId === 'lua') {
          this.checkDocument(doc);
        }
      }),
    );

    this.disposables.push(
      vscode.workspace.onDidCloseTextDocument((doc) => {
        this.diagnosticCollection.delete(doc.uri);
      }),
    );

    context.subscriptions.push(...this.disposables);
  }

  /**
   * Check a single document for missing asset references.
   */
  checkDocument(document: vscode.TextDocument): void {
    const projectRoot = this.findProjectRoot(document.uri);
    if (!projectRoot) return;

    const text = document.getText();
    const diagnostics: vscode.Diagnostic[] = [];

    for (const { pattern } of ASSET_PATTERNS) {
      // Reset regex state
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(text)) !== null) {
        const assetPath = match[1];
        const fullPath = path.join(projectRoot, assetPath);

        if (!fs.existsSync(fullPath)) {
          const startPos = document.positionAt(match.index + match[0].indexOf(assetPath));
          const endPos = document.positionAt(match.index + match[0].indexOf(assetPath) + assetPath.length);
          const range = new vscode.Range(startPos, endPos);

          const diag = new vscode.Diagnostic(
            range,
            `Asset not found: ${assetPath}`,
            vscode.DiagnosticSeverity.Warning,
          );
          diag.source = 'Love2D';
          diag.code = 'missing-asset';
          diagnostics.push(diag);
        }
      }
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * Find the project root (directory containing main.lua) for a given file.
   */
  private findProjectRoot(uri: vscode.Uri): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) return undefined;

    for (const folder of folders) {
      if (uri.fsPath.startsWith(folder.uri.fsPath)) {
        const mainLua = path.join(folder.uri.fsPath, 'main.lua');
        if (fs.existsSync(mainLua)) {
          return folder.uri.fsPath;
        }
      }
    }
    return undefined;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}
