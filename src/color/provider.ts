import * as vscode from 'vscode';

/**
 * Color Picker: DocumentColorProvider for Love2D Lua files.
 * Detects love.graphics.setColor(r, g, b[, a]) and {r, g, b[, a]} patterns.
 * Love2D uses 0-1 float range.
 */

interface ColorMatch {
  range: vscode.Range;
  r: number;
  g: number;
  b: number;
  a: number;
  /** The full matched text for replacement */
  kind: 'setColor' | 'setBackgroundColor' | 'setClearColor' | 'table';
}

// Matches love.graphics.setColor(r, g, b[, a])
const SET_COLOR_PATTERN =
  /love\.graphics\.(setColor|setBackgroundColor|setClearColor)\s*\(\s*([0-9]*\.?[0-9]+)\s*,\s*([0-9]*\.?[0-9]+)\s*,\s*([0-9]*\.?[0-9]+)(?:\s*,\s*([0-9]*\.?[0-9]+))?\s*\)/g;

// Matches {r, g, b[, a]} color table literals (must be 3 or 4 numbers between 0-1)
const COLOR_TABLE_PATTERN =
  /\{\s*([01](?:\.\d+)?|0?\.\d+)\s*,\s*([01](?:\.\d+)?|0?\.\d+)\s*,\s*([01](?:\.\d+)?|0?\.\d+)(?:\s*,\s*([01](?:\.\d+)?|0?\.\d+))?\s*\}/g;

export function formatFloat(n: number): string {
  // Round to avoid floating-point artifacts, max 3 decimal places
  const rounded = Math.round(n * 1000) / 1000;
  return String(rounded);
}

export function findColors(document: vscode.TextDocument): ColorMatch[] {
  const text = document.getText();
  const matches: ColorMatch[] = [];

  // setColor / setBackgroundColor / setClearColor
  SET_COLOR_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SET_COLOR_PATTERN.exec(text)) !== null) {
    const r = parseFloat(match[2]);
    const g = parseFloat(match[3]);
    const b = parseFloat(match[4]);
    const a = match[5] !== undefined ? parseFloat(match[5]) : 1;

    // Only treat as color if values are in 0-1 range
    if (r > 1 || g > 1 || b > 1 || a > 1) continue;

    const argsStart = match.index + match[0].indexOf(match[2]);
    const argsEnd = match.index + match[0].lastIndexOf(')');
    const startPos = document.positionAt(argsStart);
    const endPos = document.positionAt(argsEnd);

    matches.push({
      range: new vscode.Range(startPos, endPos),
      r, g, b, a,
      kind: match[1] as ColorMatch['kind'],
    });
  }

  // {r, g, b[, a]} table literals
  COLOR_TABLE_PATTERN.lastIndex = 0;
  while ((match = COLOR_TABLE_PATTERN.exec(text)) !== null) {
    const r = parseFloat(match[1]);
    const g = parseFloat(match[2]);
    const b = parseFloat(match[3]);
    const a = match[4] !== undefined ? parseFloat(match[4]) : 1;

    const startPos = document.positionAt(match.index);
    const endPos = document.positionAt(match.index + match[0].length);

    matches.push({
      range: new vscode.Range(startPos, endPos),
      r, g, b, a,
      kind: 'table',
    });
  }

  return matches;
}

export class Love2DColorProvider implements vscode.DocumentColorProvider {
  provideDocumentColors(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken,
  ): vscode.ColorInformation[] {
    return findColors(document).map((m) => {
      const color = new vscode.Color(m.r, m.g, m.b, m.a);
      return new vscode.ColorInformation(m.range, color);
    });
  }

  provideColorPresentations(
    color: vscode.Color,
    context: { document: vscode.TextDocument; range: vscode.Range },
    _token: vscode.CancellationToken,
  ): vscode.ColorPresentation[] {
    const r = formatFloat(color.red);
    const g = formatFloat(color.green);
    const b = formatFloat(color.blue);
    const a = formatFloat(color.alpha);
    const hasAlpha = color.alpha < 1;

    const text = context.document.getText(context.range);

    let label: string;
    if (text.startsWith('{')) {
      label = hasAlpha ? `{${r}, ${g}, ${b}, ${a}}` : `{${r}, ${g}, ${b}}`;
    } else {
      label = hasAlpha ? `${r}, ${g}, ${b}, ${a}` : `${r}, ${g}, ${b}`;
    }

    const presentation = new vscode.ColorPresentation(label);
    presentation.textEdit = new vscode.TextEdit(context.range, label);
    return [presentation];
  }
}

export function registerColorProvider(context: vscode.ExtensionContext): vscode.Disposable {
  const provider = new Love2DColorProvider();
  return vscode.languages.registerColorProvider(
    { language: 'lua', scheme: 'file' },
    provider,
  );
}
