import * as vscode from 'vscode';

/**
 * Document Symbols: DocumentSymbolProvider for Lua files.
 * Provides outline view with function definitions, local variables, and require statements.
 */

const FUNC_PATTERN = /^(\s*)(?:local\s+)?function\s+([a-zA-Z_]\w*(?:[.:][a-zA-Z_]\w*)*)\s*\(/gm;
const LOCAL_FUNC_PATTERN = /^(\s*)local\s+([a-zA-Z_]\w*)\s*=\s*function\s*\(/gm;
const REQUIRE_PATTERN = /^(\s*)local\s+([a-zA-Z_]\w*)\s*=\s*require\s*[\(]?\s*["']([^"']+)["']/gm;
const LOCAL_VAR_PATTERN = /^(\s*)local\s+([a-zA-Z_]\w*)\s*=\s*(?!function|require)/gm;

export class Love2DDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  provideDocumentSymbols(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken,
  ): vscode.DocumentSymbol[] {
    const symbols: vscode.DocumentSymbol[] = [];
    const text = document.getText();

    // Function definitions
    FUNC_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = FUNC_PATTERN.exec(text)) !== null) {
      const name = match[2];
      const pos = document.positionAt(match.index);
      const endOfLine = document.lineAt(pos.line).range.end;
      const range = new vscode.Range(pos, endOfLine);
      const selectionRange = new vscode.Range(
        document.positionAt(match.index + match[0].indexOf(name)),
        document.positionAt(match.index + match[0].indexOf(name) + name.length),
      );

      const kind = name.includes(':')
        ? vscode.SymbolKind.Method
        : vscode.SymbolKind.Function;

      symbols.push(new vscode.DocumentSymbol(
        name, '', kind, range, selectionRange,
      ));
    }

    // local X = function()
    LOCAL_FUNC_PATTERN.lastIndex = 0;
    while ((match = LOCAL_FUNC_PATTERN.exec(text)) !== null) {
      const name = match[2];
      const pos = document.positionAt(match.index);
      const endOfLine = document.lineAt(pos.line).range.end;
      const range = new vscode.Range(pos, endOfLine);
      const selectionRange = new vscode.Range(
        document.positionAt(match.index + match[0].indexOf(name)),
        document.positionAt(match.index + match[0].indexOf(name) + name.length),
      );

      symbols.push(new vscode.DocumentSymbol(
        name, 'local', vscode.SymbolKind.Function, range, selectionRange,
      ));
    }

    // require statements
    REQUIRE_PATTERN.lastIndex = 0;
    while ((match = REQUIRE_PATTERN.exec(text)) !== null) {
      const name = match[2];
      const modulePath = match[3];
      const pos = document.positionAt(match.index);
      const endOfLine = document.lineAt(pos.line).range.end;
      const range = new vscode.Range(pos, endOfLine);
      const selectionRange = new vscode.Range(
        document.positionAt(match.index + match[0].indexOf(name)),
        document.positionAt(match.index + match[0].indexOf(name) + name.length),
      );

      symbols.push(new vscode.DocumentSymbol(
        name, modulePath, vscode.SymbolKind.Module, range, selectionRange,
      ));
    }

    // Local variable assignments (not functions/requires)
    LOCAL_VAR_PATTERN.lastIndex = 0;
    while ((match = LOCAL_VAR_PATTERN.exec(text)) !== null) {
      const name = match[2];
      const pos = document.positionAt(match.index);
      const endOfLine = document.lineAt(pos.line).range.end;
      const range = new vscode.Range(pos, endOfLine);
      const selectionRange = new vscode.Range(
        document.positionAt(match.index + match[0].indexOf(name)),
        document.positionAt(match.index + match[0].indexOf(name) + name.length),
      );

      symbols.push(new vscode.DocumentSymbol(
        name, 'local', vscode.SymbolKind.Variable, range, selectionRange,
      ));
    }

    return symbols;
  }
}
