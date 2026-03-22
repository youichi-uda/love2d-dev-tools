import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { formatFloat, findColors } from './provider';

/**
 * Color Palette: .love-palette.json support.
 * Save/load named colors from a project-level palette file.
 */

const PALETTE_FILENAME = '.love-palette.json';

export interface PaletteData {
  colors: Record<string, number[]>; // name -> [r, g, b] or [r, g, b, a]
}

export function getPalettePath(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return undefined;
  return path.join(folders[0].uri.fsPath, PALETTE_FILENAME);
}

export function loadPalette(palettePath: string): PaletteData {
  try {
    const raw = fs.readFileSync(palettePath, 'utf-8');
    const data = JSON.parse(raw);
    if (data && typeof data.colors === 'object') {
      return data as PaletteData;
    }
  } catch {
    // File doesn't exist or invalid JSON
  }
  return { colors: {} };
}

function savePalette(palettePath: string, data: PaletteData): void {
  fs.writeFileSync(palettePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

export class PaletteColorItem extends vscode.TreeItem {
  constructor(
    public readonly colorName: string,
    public readonly rgba: number[],
  ) {
    super(colorName, vscode.TreeItemCollapsibleState.None);

    const r = formatFloat(rgba[0]);
    const g = formatFloat(rgba[1]);
    const b = formatFloat(rgba[2]);
    const a = rgba.length >= 4 ? formatFloat(rgba[3]) : undefined;
    this.description = a !== undefined ? `{${r}, ${g}, ${b}, ${a}}` : `{${r}, ${g}, ${b}}`;
    this.tooltip = this.description;

    this.command = {
      title: 'Insert Color',
      command: 'love2d-tools.insertPaletteColor',
      arguments: [this],
    };

    this.contextValue = 'paletteColor';
  }
}

export class ColorPaletteProvider implements vscode.TreeDataProvider<PaletteColorItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<PaletteColorItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private watcher: vscode.FileSystemWatcher | undefined;

  constructor() {
    this.watcher = vscode.workspace.createFileSystemWatcher(`**/${PALETTE_FILENAME}`);
    this.watcher.onDidChange(() => this.refresh());
    this.watcher.onDidCreate(() => this.refresh());
    this.watcher.onDidDelete(() => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  dispose(): void {
    this.watcher?.dispose();
    this._onDidChangeTreeData.dispose();
  }

  getTreeItem(element: PaletteColorItem): vscode.TreeItem {
    return element;
  }

  getChildren(): PaletteColorItem[] {
    const palettePath = getPalettePath();
    if (!palettePath) return [];

    const data = loadPalette(palettePath);
    return Object.entries(data.colors).map(
      ([name, rgba]) => new PaletteColorItem(name, rgba),
    );
  }
}

export async function saveColorToPalette(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  const palettePath = getPalettePath();
  if (!palettePath) {
    vscode.window.showWarningMessage('No workspace folder open');
    return;
  }

  // Try to find a color at the cursor position
  const colors = findColors(editor.document);
  const cursorOffset = editor.document.offsetAt(editor.selection.active);

  let rgba: number[] | undefined;
  for (const c of colors) {
    const start = editor.document.offsetAt(c.range.start);
    const end = editor.document.offsetAt(c.range.end);
    if (cursorOffset >= start && cursorOffset <= end) {
      rgba = c.a < 1 ? [c.r, c.g, c.b, c.a] : [c.r, c.g, c.b];
      break;
    }
  }

  if (!rgba) {
    vscode.window.showWarningMessage('No Love2D color found at cursor position');
    return;
  }

  const name = await vscode.window.showInputBox({
    prompt: 'Enter a name for this color',
    placeHolder: 'e.g. sky_blue',
    validateInput: (value) => {
      if (!value.trim()) return 'Name is required';
      if (!/^[a-zA-Z_]\w*$/.test(value)) return 'Use letters, numbers, and underscores';
      return undefined;
    },
  });

  if (!name) return;

  const data = loadPalette(palettePath);
  data.colors[name] = rgba;
  savePalette(palettePath, data);
  vscode.window.showInformationMessage(`Color '${name}' saved to palette`);
}

export async function insertPaletteColor(item: PaletteColorItem): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const rgba = item.rgba;
  const r = formatFloat(rgba[0]);
  const g = formatFloat(rgba[1]);
  const b = formatFloat(rgba[2]);
  const a = rgba.length >= 4 ? formatFloat(rgba[3]) : undefined;
  const text = a !== undefined ? `{${r}, ${g}, ${b}, ${a}}` : `{${r}, ${g}, ${b}}`;

  await editor.edit((editBuilder) => {
    editBuilder.replace(editor.selection, text);
  });
}

export async function removePaletteColor(item: PaletteColorItem): Promise<void> {
  const palettePath = getPalettePath();
  if (!palettePath) return;

  const data = loadPalette(palettePath);
  delete data.colors[item.colorName];
  savePalette(palettePath, data);
}

export async function applyPaletteColor(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  const palettePath = getPalettePath();
  if (!palettePath) {
    vscode.window.showWarningMessage('No workspace folder open');
    return;
  }

  const data = loadPalette(palettePath);
  const entries = Object.entries(data.colors);
  if (entries.length === 0) {
    vscode.window.showWarningMessage('No colors in palette. Save a color first.');
    return;
  }

  // Find color at cursor position
  const colors = findColors(editor.document);
  const cursorOffset = editor.document.offsetAt(editor.selection.active);

  let colorMatch: { range: vscode.Range; kind: string } | undefined;
  for (const c of colors) {
    const start = editor.document.offsetAt(c.range.start);
    const end = editor.document.offsetAt(c.range.end);
    if (cursorOffset >= start && cursorOffset <= end) {
      colorMatch = { range: c.range, kind: c.kind };
      break;
    }
  }

  if (!colorMatch) {
    vscode.window.showWarningMessage('No Love2D color found at cursor position');
    return;
  }

  const isTable = colorMatch.kind === 'table';

  // Build QuickPick items with color preview
  const items = entries.map(([name, rgba]) => {
    const r = formatFloat(rgba[0]);
    const g = formatFloat(rgba[1]);
    const b = formatFloat(rgba[2]);
    const a = rgba.length >= 4 ? formatFloat(rgba[3]) : undefined;
    const colorText = isTable
      ? (a !== undefined ? `{${r}, ${g}, ${b}, ${a}}` : `{${r}, ${g}, ${b}}`)
      : (a !== undefined ? `${r}, ${g}, ${b}, ${a}` : `${r}, ${g}, ${b}`);
    const hex = rgbaToHex(rgba);

    return {
      label: `$(symbol-color) ${name}`,
      description: colorText,
      detail: hex,
      colorText,
    };
  });

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a palette color to apply',
  });

  if (!picked) return;

  await editor.edit((editBuilder) => {
    editBuilder.replace(colorMatch!.range, picked.colorText);
  });
}

function rgbaToHex(rgba: number[]): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(rgba[0])}${toHex(rgba[1])}${toHex(rgba[2])}`;
}

export class PaletteCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] | undefined {
    const palettePath = getPalettePath();
    if (!palettePath) return undefined;

    const data = loadPalette(palettePath);
    if (Object.keys(data.colors).length === 0) return undefined;

    // Check if cursor is inside a string literal
    const line = document.lineAt(position.line).text;
    const beforeCursor = line.substring(0, position.character);
    const afterCursor = line.substring(position.character);

    // Find opening quote before cursor (not already closed)
    const inString = isInsideString(beforeCursor);
    if (!inString) return undefined;

    // Extract the partial text typed so far inside the string
    const quoteChar = inString.quote;
    const typedText = inString.content;

    // Find closing quote after cursor
    const closingIdx = afterCursor.indexOf(quoteChar);

    return Object.entries(data.colors).map(([name, rgba]) => {
      const r = formatFloat(rgba[0]);
      const g = formatFloat(rgba[1]);
      const b = formatFloat(rgba[2]);
      const a = rgba.length >= 4 ? formatFloat(rgba[3]) : undefined;
      const colorText = a !== undefined ? `{${r}, ${g}, ${b}, ${a}}` : `{${r}, ${g}, ${b}}`;
      const hex = rgbaToHex(rgba);

      const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Color);
      item.detail = `${hex}  ${colorText}`;
      item.documentation = new vscode.MarkdownString(
        `Palette color **${name}**\n\n\`${colorText}\``,
      );

      // Replace the entire string (including quotes) with the color table
      const stringStart = position.character - typedText.length - 1; // -1 for opening quote
      const stringEnd = closingIdx >= 0
        ? position.character + closingIdx + 1 // +1 for closing quote
        : position.character; // no closing quote yet

      item.range = new vscode.Range(position.line, stringStart, position.line, stringEnd);
      item.insertText = colorText;
      item.filterText = quoteChar + name;

      return item;
    });
  }
}

function isInsideString(beforeCursor: string): { quote: string; content: string } | undefined {
  // Walk backwards to find an unmatched opening quote
  let i = beforeCursor.length - 1;
  while (i >= 0) {
    const ch = beforeCursor[i];
    if (ch === '"' || ch === "'") {
      // Check it's not escaped
      let backslashes = 0;
      let j = i - 1;
      while (j >= 0 && beforeCursor[j] === '\\') {
        backslashes++;
        j--;
      }
      if (backslashes % 2 === 0) {
        // Check if this is an opening quote (odd count of same quotes before it = closing)
        const content = beforeCursor.substring(i + 1);
        // Verify no unescaped same-quote in content (which would mean the string was closed and reopened)
        if (!hasUnescapedQuote(content, ch)) {
          return { quote: ch, content };
        }
      }
    }
    i--;
  }
  return undefined;
}

function hasUnescapedQuote(text: string, quote: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\\') {
      i++; // skip escaped char
      continue;
    }
    if (text[i] === quote) return true;
  }
  return false;
}
