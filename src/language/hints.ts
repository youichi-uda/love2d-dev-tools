import * as vscode from 'vscode';

/**
 * Inlay Hints: InlayHintsProvider for Love2D API calls.
 * Shows parameter names as inline hints for Love2D API function calls.
 */

/** Parameter name definitions for Love2D API functions. */
const API_PARAMS: Record<string, string[]> = {
  // Graphics
  'love.graphics.rectangle': ['mode', 'x', 'y', 'width', 'height', 'rx', 'ry', 'segments'],
  'love.graphics.circle': ['mode', 'x', 'y', 'radius', 'segments'],
  'love.graphics.ellipse': ['mode', 'x', 'y', 'radiusx', 'radiusy', 'segments'],
  'love.graphics.arc': ['mode', 'x', 'y', 'radius', 'angle1', 'angle2', 'segments'],
  'love.graphics.line': ['x1', 'y1', 'x2', 'y2'],
  'love.graphics.polygon': ['mode', 'vertices...'],
  'love.graphics.print': ['text', 'x', 'y', 'r', 'sx', 'sy', 'ox', 'oy', 'kx', 'ky'],
  'love.graphics.printf': ['text', 'x', 'y', 'limit', 'align', 'r', 'sx', 'sy', 'ox', 'oy', 'kx', 'ky'],
  'love.graphics.draw': ['drawable', 'x', 'y', 'r', 'sx', 'sy', 'ox', 'oy', 'kx', 'ky'],
  'love.graphics.setColor': ['r', 'g', 'b', 'a'],
  'love.graphics.setBackgroundColor': ['r', 'g', 'b', 'a'],
  'love.graphics.setLineWidth': ['width'],
  'love.graphics.setFont': ['font'],
  'love.graphics.newImage': ['filename'],
  'love.graphics.newFont': ['filename', 'size'],
  'love.graphics.newQuad': ['x', 'y', 'width', 'height', 'sw', 'sh'],
  'love.graphics.translate': ['dx', 'dy'],
  'love.graphics.rotate': ['angle'],
  'love.graphics.scale': ['sx', 'sy'],
  'love.graphics.setScissor': ['x', 'y', 'width', 'height'],
  'love.graphics.setCanvas': ['canvas'],
  'love.graphics.newCanvas': ['width', 'height'],
  'love.graphics.newShader': ['code'],

  // Audio
  'love.audio.newSource': ['filename', 'type'],
  'love.audio.setVolume': ['volume'],

  // Physics
  'love.physics.newWorld': ['gravityx', 'gravityy', 'sleep'],
  'love.physics.newBody': ['world', 'x', 'y', 'type'],
  'love.physics.newRectangleShape': ['width', 'height'],
  'love.physics.newCircleShape': ['radius'],
  'love.physics.newFixture': ['body', 'shape', 'density'],

  // Window
  'love.window.setMode': ['width', 'height', 'flags'],
  'love.window.setTitle': ['title'],
  'love.window.setFullscreen': ['fullscreen'],

  // Keyboard / Mouse
  'love.keyboard.isDown': ['key'],
  'love.mouse.getPosition': [],
  'love.mouse.isDown': ['button'],

  // Math
  'love.math.random': ['min', 'max'],
  'love.math.noise': ['x', 'y', 'z'],

  // Timer
  'love.timer.sleep': ['seconds'],

  // Filesystem
  'love.filesystem.read': ['name', 'size'],
  'love.filesystem.write': ['name', 'data', 'size'],
  'love.filesystem.load': ['name'],
};

// Pattern to match love.xxx.yyy(args) calls
const API_CALL_PATTERN = /(love\.[a-zA-Z]+\.[a-zA-Z]+)\s*\(/g;

// Pattern to extract individual arguments (handles strings, numbers, variables, nested calls)
function parseArguments(text: string, startOffset: number): { start: number; end: number }[] {
  const args: { start: number; end: number }[] = [];
  let depth = 0;
  let stringChar: string | null = null;
  let argStart = startOffset;
  let hasContent = false;

  for (let i = startOffset; i < text.length; i++) {
    const ch = text[i];

    if (stringChar) {
      if (ch === stringChar && text[i - 1] !== '\\') {
        stringChar = null;
      }
      hasContent = true;
      continue;
    }

    if (ch === '"' || ch === "'") {
      stringChar = ch;
      hasContent = true;
      continue;
    }

    if (ch === '(' || ch === '{' || ch === '[') {
      depth++;
      hasContent = true;
      continue;
    }

    if (ch === ')' || ch === '}' || ch === ']') {
      if (depth > 0) {
        depth--;
        hasContent = true;
        continue;
      }
      // End of argument list
      if (hasContent) {
        args.push({ start: argStart, end: i });
      }
      break;
    }

    if (ch === ',' && depth === 0) {
      if (hasContent) {
        args.push({ start: argStart, end: i });
      }
      argStart = i + 1;
      hasContent = false;
      continue;
    }

    if (ch !== ' ' && ch !== '\t' && ch !== '\n' && ch !== '\r') {
      hasContent = true;
    }
  }

  return args;
}

export class Love2DInlayHintsProvider implements vscode.InlayHintsProvider {
  provideInlayHints(
    document: vscode.TextDocument,
    range: vscode.Range,
    _token: vscode.CancellationToken,
  ): vscode.InlayHint[] {
    const hints: vscode.InlayHint[] = [];
    const text = document.getText();

    API_CALL_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = API_CALL_PATTERN.exec(text)) !== null) {
      const funcName = match[1];
      const paramNames = API_PARAMS[funcName];
      if (!paramNames || paramNames.length === 0) continue;

      const openParenOffset = match.index + match[0].length;
      const matchPos = document.positionAt(match.index);

      // Only process hints within the requested range
      if (matchPos.line < range.start.line || matchPos.line > range.end.line) continue;

      const args = parseArguments(text, openParenOffset);

      for (let i = 0; i < Math.min(args.length, paramNames.length); i++) {
        // Find the actual start of the argument (skip whitespace)
        let actualStart = args[i].start;
        while (actualStart < args[i].end && /\s/.test(text[actualStart])) {
          actualStart++;
        }

        const pos = document.positionAt(actualStart);
        const hint = new vscode.InlayHint(
          pos,
          `${paramNames[i]}:`,
          vscode.InlayHintKind.Parameter,
        );
        hint.paddingRight = true;
        hints.push(hint);
      }
    }

    return hints;
  }
}
