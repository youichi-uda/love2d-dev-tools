import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Go to Definition: DefinitionProvider for Lua files.
 * - require("module.name") → corresponding .lua file
 * - Local function definitions within the file
 */

const REQUIRE_PATTERN = /require\s*[\(]?\s*["']([^"']+)["']\s*[\)]?/;
const FUNC_DEF_PATTERN = /(?:local\s+)?function\s+([a-zA-Z_]\w*(?:[.:][a-zA-Z_]\w*)*)\s*\(/g;
const LOCAL_ASSIGN_FUNC = /local\s+function\s+([a-zA-Z_]\w*)\s*\(/g;
const LOCAL_VAR_PATTERN = /local\s+([a-zA-Z_]\w*)\s*=/g;

export class Love2DDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
  ): vscode.Definition | undefined {
    const line = document.lineAt(position.line).text;
    const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*/);
    if (!wordRange) return undefined;

    const word = document.getText(wordRange);

    // Check if cursor is on a require() string
    const requireMatch = line.match(REQUIRE_PATTERN);
    if (requireMatch && line.indexOf(requireMatch[1]) <= position.character
      && position.character <= line.indexOf(requireMatch[1]) + requireMatch[1].length) {
      return this.resolveRequire(document, requireMatch[1]);
    }

    // Search for function/variable definition in current file
    return this.findDefinitionInFile(document, word);
  }

  private resolveRequire(
    document: vscode.TextDocument,
    moduleName: string,
  ): vscode.Location | undefined {
    const projectRoot = this.findProjectRoot(document.uri);
    if (!projectRoot) return undefined;

    // module.name → module/name.lua or module/name/init.lua
    const relativePath = moduleName.replace(/\./g, '/');
    const candidates = [
      path.join(projectRoot, relativePath + '.lua'),
      path.join(projectRoot, relativePath, 'init.lua'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return new vscode.Location(
          vscode.Uri.file(candidate),
          new vscode.Position(0, 0),
        );
      }
    }

    return undefined;
  }

  private findDefinitionInFile(
    document: vscode.TextDocument,
    word: string,
  ): vscode.Location | undefined {
    const text = document.getText();

    // Search function definitions
    FUNC_DEF_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = FUNC_DEF_PATTERN.exec(text)) !== null) {
      if (match[1] === word) {
        const pos = document.positionAt(match.index);
        return new vscode.Location(document.uri, pos);
      }
    }

    // Search local function definitions
    LOCAL_ASSIGN_FUNC.lastIndex = 0;
    while ((match = LOCAL_ASSIGN_FUNC.exec(text)) !== null) {
      if (match[1] === word) {
        const pos = document.positionAt(match.index);
        return new vscode.Location(document.uri, pos);
      }
    }

    // Search local variable assignments
    LOCAL_VAR_PATTERN.lastIndex = 0;
    while ((match = LOCAL_VAR_PATTERN.exec(text)) !== null) {
      if (match[1] === word) {
        const pos = document.positionAt(match.index);
        return new vscode.Location(document.uri, pos);
      }
    }

    return undefined;
  }

  private findProjectRoot(uri: vscode.Uri): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) return undefined;
    for (const folder of folders) {
      const rel = path.relative(folder.uri.fsPath, uri.fsPath);
      if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
        if (fs.existsSync(path.join(folder.uri.fsPath, 'main.lua'))) {
          return folder.uri.fsPath;
        }
      }
    }
    return undefined;
  }
}
