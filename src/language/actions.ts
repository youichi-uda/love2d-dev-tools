import * as vscode from 'vscode';
import { formatFloat } from '../color/provider';

/**
 * Code Actions: CodeActionProvider for Lua files.
 * Provides quick fixes for diagnostics:
 * - Generate function skeleton for undefined function calls
 * - Remove unused require statements
 * - Convert hex color (#RRGGBB) to Love2D 0-1 format
 * - Convert 0-255 color values to 0-1 format
 */

// Matches hex color in quotes: "#RRGGBB" or "#RRGGBBAA"
const HEX_COLOR_PATTERN = /(["'])#([0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?)\1/g;

// Matches setColor/setBackgroundColor/setClearColor with integer values (0-255 range)
const SET_COLOR_255_PATTERN =
  /love\.graphics\.(setColor|setBackgroundColor|setClearColor)\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+))?\s*\)/g;

// Matches {R, G, B[, A]} table with integer values (0-255 range)
const TABLE_255_PATTERN =
  /\{\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+))?\s*\}/g;

function hexToFloats(hex: string): number[] {
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  if (hex.length === 8) {
    const a = parseInt(hex.substring(6, 8), 16) / 255;
    return [r, g, b, a];
  }
  return [r, g, b];
}

export class Love2DCodeActionProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
    vscode.CodeActionKind.Refactor,
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'Love2D') continue;

      if (diagnostic.code === 'unused-require') {
        actions.push(this.createRemoveRequireAction(document, diagnostic));
      }

      if (diagnostic.code === 'missing-asset') {
        // No auto-fix for missing assets, but offer to create directory
        const match = diagnostic.message.match(/Asset not found: (.+)/);
        if (match) {
          actions.push(this.createOpenAssetPathAction(match[1]));
        }
      }
    }

    // Generate function skeleton from cursor
    const line = document.lineAt(range.start.line).text;
    const callMatch = line.match(/\b([a-zA-Z_]\w*)\s*\(/);
    if (callMatch) {
      const funcName = callMatch[1];
      // Only offer if it looks like an undefined local function call
      const text = document.getText();
      const funcDefPattern = new RegExp(`function\\s+${escapeRegex(funcName)}\\s*\\(`);
      if (!funcDefPattern.test(text)) {
        actions.push(this.createGenerateFunctionAction(document, funcName));
      }
    }

    // Hex color conversion (#RRGGBB → 0-1)
    actions.push(...this.findHexColorActions(document, range));

    // 0-255 to 0-1 conversion
    actions.push(...this.find255ColorActions(document, range));

    return actions;
  }

  private createRemoveRequireAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      'Remove unused require',
      vscode.CodeActionKind.QuickFix,
    );
    action.diagnostics = [diagnostic];
    action.isPreferred = true;

    const edit = new vscode.WorkspaceEdit();
    // Remove the entire line
    const line = document.lineAt(diagnostic.range.start.line);
    const rangeToDelete = line.rangeIncludingLineBreak;
    edit.delete(document.uri, rangeToDelete);
    action.edit = edit;

    return action;
  }

  private createGenerateFunctionAction(
    document: vscode.TextDocument,
    funcName: string,
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      `Generate function '${funcName}'`,
      vscode.CodeActionKind.QuickFix,
    );

    const edit = new vscode.WorkspaceEdit();
    // Insert before current cursor line (at the top of file after last require)
    const text = document.getText();
    let insertLine = 0;

    // Find the last require or first blank line after requires
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*(?:local\s+\w+\s*=\s*)?require/.test(lines[i])) {
        insertLine = i + 1;
      }
    }

    const insertPos = new vscode.Position(insertLine, 0);
    edit.insert(document.uri, insertPos, `\nlocal function ${funcName}()\n  -- TODO: implement\nend\n`);
    action.edit = edit;

    return action;
  }

  private createOpenAssetPathAction(assetPath: string): vscode.CodeAction {
    const action = new vscode.CodeAction(
      `Create missing asset: ${assetPath}`,
      vscode.CodeActionKind.QuickFix,
    );
    // We can't create the file, but we can reveal the expected path
    action.command = {
      title: 'Reveal asset path',
      command: 'revealFileInOS',
      arguments: [],
    };
    return action;
  }

  private findHexColorActions(
    document: vscode.TextDocument,
    range: vscode.Range,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    const line = document.lineAt(range.start.line);
    const lineText = line.text;

    HEX_COLOR_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = HEX_COLOR_PATTERN.exec(lineText)) !== null) {
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;

      // Only offer if cursor is on or near the hex color
      if (range.start.character > matchEnd || range.end.character < matchStart) continue;

      const hex = match[2];
      const floats = hexToFloats(hex);
      const floatStr = floats.map(formatFloat).join(', ');
      const tableStr = `{${floatStr}}`;

      // Action 1: replace with comma-separated values (for setColor args)
      const argsAction = new vscode.CodeAction(
        `Convert #${hex} to Love2D color (${floatStr})`,
        vscode.CodeActionKind.Refactor,
      );
      const argsEdit = new vscode.WorkspaceEdit();
      const matchRange = new vscode.Range(
        new vscode.Position(range.start.line, matchStart),
        new vscode.Position(range.start.line, matchEnd),
      );
      argsEdit.replace(document.uri, matchRange, floatStr);
      argsAction.edit = argsEdit;
      actions.push(argsAction);

      // Action 2: replace with table literal {r, g, b}
      const tableAction = new vscode.CodeAction(
        `Convert #${hex} to Love2D table ${tableStr}`,
        vscode.CodeActionKind.Refactor,
      );
      const tableEdit = new vscode.WorkspaceEdit();
      tableEdit.replace(document.uri, matchRange, tableStr);
      tableAction.edit = tableEdit;
      actions.push(tableAction);
    }

    return actions;
  }

  private find255ColorActions(
    document: vscode.TextDocument,
    range: vscode.Range,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    const line = document.lineAt(range.start.line);
    const lineText = line.text;

    // setColor with 0-255 values
    SET_COLOR_255_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = SET_COLOR_255_PATTERN.exec(lineText)) !== null) {
      const r = parseInt(match[2]);
      const g = parseInt(match[3]);
      const b = parseInt(match[4]);
      const a = match[5] !== undefined ? parseInt(match[5]) : undefined;

      // Only trigger if at least one value > 1 and all <= 255
      if (r <= 1 && g <= 1 && b <= 1 && (a === undefined || a <= 1)) continue;
      if (r > 255 || g > 255 || b > 255 || (a !== undefined && a > 255)) continue;

      const floats = [r / 255, g / 255, b / 255];
      if (a !== undefined) floats.push(a / 255);
      const floatStr = floats.map(formatFloat).join(', ');

      const funcName = match[1];
      const replacement = `love.graphics.${funcName}(${floatStr})`;

      const action = new vscode.CodeAction(
        `Convert 0-255 color to 0-1`,
        vscode.CodeActionKind.Refactor,
      );
      const edit = new vscode.WorkspaceEdit();
      const matchRange = new vscode.Range(
        new vscode.Position(range.start.line, match.index),
        new vscode.Position(range.start.line, match.index + match[0].length),
      );
      edit.replace(document.uri, matchRange, replacement);
      action.edit = edit;
      actions.push(action);
    }

    // Table with 0-255 values
    TABLE_255_PATTERN.lastIndex = 0;
    while ((match = TABLE_255_PATTERN.exec(lineText)) !== null) {
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      const a = match[4] !== undefined ? parseInt(match[4]) : undefined;

      if (r <= 1 && g <= 1 && b <= 1 && (a === undefined || a <= 1)) continue;
      if (r > 255 || g > 255 || b > 255 || (a !== undefined && a > 255)) continue;

      const floats = [r / 255, g / 255, b / 255];
      if (a !== undefined) floats.push(a / 255);
      const floatStr = floats.map(formatFloat).join(', ');
      const replacement = `{${floatStr}}`;

      const action = new vscode.CodeAction(
        `Convert 0-255 color to 0-1`,
        vscode.CodeActionKind.Refactor,
      );
      const edit = new vscode.WorkspaceEdit();
      const matchRange = new vscode.Range(
        new vscode.Position(range.start.line, match.index),
        new vscode.Position(range.start.line, match.index + match[0].length),
      );
      edit.replace(document.uri, matchRange, replacement);
      action.edit = edit;
      actions.push(action);
    }

    return actions;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
