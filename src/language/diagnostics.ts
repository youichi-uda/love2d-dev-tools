import * as vscode from 'vscode';

/**
 * Enhanced Diagnostics: detects common issues in Lua files.
 * - Undefined global function calls (not in Love2D API or declared in file)
 * - Unused require statements
 */

// Common Love2D globals and Lua builtins that should not be flagged
const KNOWN_GLOBALS = new Set([
  // Lua builtins
  'print', 'type', 'tostring', 'tonumber', 'error', 'assert', 'pcall', 'xpcall',
  'require', 'dofile', 'loadfile', 'load', 'loadstring',
  'pairs', 'ipairs', 'next', 'select', 'unpack', 'rawget', 'rawset', 'rawequal', 'rawlen',
  'setmetatable', 'getmetatable', 'setfenv', 'getfenv',
  'table', 'string', 'math', 'io', 'os', 'debug', 'coroutine', 'package', 'bit',
  'collectgarbage', 'gcinfo',
  '_G', '_VERSION', 'arg', 'self',
  // Love2D
  'love',
  // Common globals
  'true', 'false', 'nil',
]);

const FUNC_CALL_PATTERN = /\b([a-zA-Z_]\w*)\s*\(/g;
const FUNC_DEF_PATTERN = /(?:local\s+)?function\s+([a-zA-Z_]\w*)/g;
const LOCAL_VAR_PATTERN = /local\s+([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)/g;
const REQUIRE_PATTERN = /local\s+([a-zA-Z_]\w*)\s*=\s*require\s*[\(]?\s*["']([^"']+)["']\s*[\)]?/g;
const FOR_VAR_PATTERN = /for\s+([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s*(?:=|in)/g;
const PARAM_PATTERN = /function\s*(?:[a-zA-Z_]\w*(?:[.:][a-zA-Z_]\w*)*)?\s*\(([^)]*)\)/g;

export class EnhancedDiagnostics {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('love2d-lua');
  }

  activate(context: vscode.ExtensionContext): void {
    this.disposables.push(this.diagnosticCollection);

    // Check open documents
    for (const doc of vscode.workspace.textDocuments) {
      if (doc.languageId === 'lua') this.checkDocument(doc);
    }

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.languageId === 'lua') this.checkDocument(e.document);
      }),
      vscode.workspace.onDidOpenTextDocument((doc) => {
        if (doc.languageId === 'lua') this.checkDocument(doc);
      }),
      vscode.workspace.onDidCloseTextDocument((doc) => {
        this.diagnosticCollection.delete(doc.uri);
      }),
    );

    context.subscriptions.push(...this.disposables);
  }

  checkDocument(document: vscode.TextDocument): void {
    const text = document.getText();
    const diagnostics: vscode.Diagnostic[] = [];

    // Collect unused requires
    diagnostics.push(...this.findUnusedRequires(document, text));

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  private findUnusedRequires(document: vscode.TextDocument, text: string): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    REQUIRE_PATTERN.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = REQUIRE_PATTERN.exec(text)) !== null) {
      const varName = match[1];
      const requireIndex = match.index;

      // Check if the variable is used elsewhere in the file
      const beforeRequire = text.substring(0, requireIndex);
      const afterRequire = text.substring(requireIndex + match[0].length);
      const rest = beforeRequire + afterRequire;

      const usagePattern = new RegExp(`\\b${escapeRegex(varName)}\\b`);
      if (!usagePattern.test(rest)) {
        const startPos = document.positionAt(requireIndex);
        const endPos = document.positionAt(requireIndex + match[0].length);
        const diag = new vscode.Diagnostic(
          new vscode.Range(startPos, endPos),
          `Unused require: '${varName}' is never used`,
          vscode.DiagnosticSeverity.Hint,
        );
        diag.source = 'Love2D';
        diag.code = 'unused-require';
        diag.tags = [vscode.DiagnosticTag.Unnecessary];
        diagnostics.push(diag);
      }
    }

    return diagnostics;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
