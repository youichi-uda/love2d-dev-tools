import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Sprite/Quad Helper: Opens an image in a Webview where users can
 * draw rectangles to define quads. Generates love.graphics.newQuad() code.
 */

export class SpriteQuadEditor {
  private panel: vscode.WebviewPanel | null = null;

  async show(): Promise<void> {
    // Pick an image file
    const uris = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectMany: false,
      filters: { 'Images': ['png', 'jpg', 'jpeg', 'bmp', 'tga', 'gif'] },
      title: 'Select Sprite Sheet',
    });

    if (!uris || uris.length === 0) return;

    this.showImage(uris[0]);
  }

  showImage(uri: vscode.Uri): void {
    if (this.panel) {
      this.panel.reveal();
    } else {
      this.panel = vscode.window.createWebviewPanel(
        'love2dSpriteEditor',
        'Sprite/Quad Editor',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.file(path.dirname(uri.fsPath))],
        },
      );
      this.panel.onDidDispose(() => { this.panel = null; });
    }

    this.panel.webview.onDidReceiveMessage(async (msg: {
      type: string;
      quads?: Array<{ x: number; y: number; w: number; h: number }>;
      imageWidth?: number;
      imageHeight?: number;
    }) => {
      if (msg.type === 'copyQuads' && msg.quads && msg.imageWidth !== undefined && msg.imageHeight !== undefined) {
        const code = this.generateCode(msg.quads, msg.imageWidth, msg.imageHeight);
        await vscode.env.clipboard.writeText(code);
        vscode.window.showInformationMessage(`Copied ${msg.quads.length} quad definition(s) to clipboard.`);
      } else if (msg.type === 'insertQuads' && msg.quads && msg.imageWidth !== undefined && msg.imageHeight !== undefined) {
        const code = this.generateCode(msg.quads, msg.imageWidth, msg.imageHeight);
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          await editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.active, code);
          });
        }
      }
    });

    const imageUri = this.panel.webview.asWebviewUri(uri);
    this.panel.title = `Quad Editor: ${path.basename(uri.fsPath)}`;
    this.panel.webview.html = this.getHtml(imageUri.toString());
  }

  private generateCode(
    quads: Array<{ x: number; y: number; w: number; h: number }>,
    imageWidth: number,
    imageHeight: number,
  ): string {
    const lines = quads.map((q, i) =>
      `local quad${i + 1} = love.graphics.newQuad(${q.x}, ${q.y}, ${q.w}, ${q.h}, ${imageWidth}, ${imageHeight})`,
    );
    return lines.join('\n') + '\n';
  }

  private getHtml(imageUri: string): string {
    return /* html */ `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    padding: 16px;
    overflow: hidden;
  }
  .toolbar {
    margin-bottom: 8px;
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .toolbar button {
    padding: 4px 10px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
  }
  .toolbar button:hover { background: var(--vscode-button-hoverBackground); }
  .toolbar .info { font-size: 12px; opacity: 0.7; margin-left: 8px; }
  #canvas-container {
    position: relative;
    overflow: auto;
    border: 1px solid var(--vscode-widget-border);
    max-height: calc(100vh - 100px);
  }
  canvas {
    display: block;
    image-rendering: pixelated;
    cursor: crosshair;
  }
  #quad-list {
    margin-top: 8px;
    font-size: 12px;
    max-height: 120px;
    overflow-y: auto;
  }
  .quad-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 4px;
    border-bottom: 1px solid var(--vscode-widget-border);
  }
  .quad-item .delete-btn {
    cursor: pointer;
    opacity: 0.5;
    font-size: 14px;
  }
  .quad-item .delete-btn:hover { opacity: 1; }
</style>
</head>
<body>
  <div class="toolbar">
    <button id="copyBtn">Copy to Clipboard</button>
    <button id="insertBtn">Insert at Cursor</button>
    <button id="clearBtn">Clear All</button>
    <span class="info" id="status">Draw rectangles on the image to define quads</span>
  </div>
  <div id="canvas-container">
    <canvas id="canvas"></canvas>
  </div>
  <div id="quad-list"></div>

  <script>
    const vscode = acquireVsCodeApi();
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const quads = [];
    let drawing = false;
    let startX = 0, startY = 0;
    let currentX = 0, currentY = 0;
    let scale = 2;
    let imageWidth = 0, imageHeight = 0;

    img.onload = () => {
      imageWidth = img.naturalWidth;
      imageHeight = img.naturalHeight;
      canvas.width = imageWidth * scale;
      canvas.height = imageHeight * scale;
      redraw();
      document.getElementById('status').textContent =
        imageWidth + ' x ' + imageHeight + ' — Draw rectangles to define quads';
    };
    img.src = '${imageUri}';

    function redraw() {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw existing quads
      for (let i = 0; i < quads.length; i++) {
        const q = quads[i];
        ctx.strokeStyle = 'rgba(78, 201, 176, 0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(q.x * scale, q.y * scale, q.w * scale, q.h * scale);
        ctx.fillStyle = 'rgba(78, 201, 176, 0.15)';
        ctx.fillRect(q.x * scale, q.y * scale, q.w * scale, q.h * scale);

        // Label
        ctx.fillStyle = '#4ec9b0';
        ctx.font = '12px monospace';
        ctx.fillText('#' + (i + 1), q.x * scale + 3, q.y * scale + 13);
      }

      // Draw current selection
      if (drawing) {
        const x = Math.min(startX, currentX) * scale;
        const y = Math.min(startY, currentY) * scale;
        const w = Math.abs(currentX - startX) * scale;
        const h = Math.abs(currentY - startY) * scale;
        ctx.strokeStyle = 'rgba(244, 71, 71, 0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(244, 71, 71, 0.1)';
        ctx.fillRect(x, y, w, h);
      }

      updateQuadList();
    }

    function getImageCoords(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: Math.round((e.clientX - rect.left) / scale),
        y: Math.round((e.clientY - rect.top) / scale),
      };
    }

    canvas.addEventListener('mousedown', (e) => {
      const pos = getImageCoords(e);
      startX = pos.x;
      startY = pos.y;
      drawing = true;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!drawing) return;
      const pos = getImageCoords(e);
      currentX = pos.x;
      currentY = pos.y;
      redraw();
    });

    canvas.addEventListener('mouseup', (e) => {
      if (!drawing) return;
      drawing = false;
      const pos = getImageCoords(e);
      const x = Math.min(startX, pos.x);
      const y = Math.min(startY, pos.y);
      const w = Math.abs(pos.x - startX);
      const h = Math.abs(pos.y - startY);
      if (w > 1 && h > 1) {
        quads.push({ x, y, w, h });
      }
      redraw();
    });

    function updateQuadList() {
      const list = document.getElementById('quad-list');
      list.innerHTML = quads.map((q, i) =>
        '<div class="quad-item">' +
        '<span class="delete-btn" onclick="removeQuad(' + i + ')">x</span>' +
        '<span>#' + (i + 1) + ': newQuad(' + q.x + ', ' + q.y + ', ' + q.w + ', ' + q.h + ', ' + imageWidth + ', ' + imageHeight + ')</span>' +
        '</div>'
      ).join('');
      document.getElementById('status').textContent =
        imageWidth + ' x ' + imageHeight + ' — ' + quads.length + ' quad(s) defined';
    }

    window.removeQuad = function(i) {
      quads.splice(i, 1);
      redraw();
    };

    document.getElementById('copyBtn').addEventListener('click', () => {
      if (quads.length === 0) return;
      vscode.postMessage({ type: 'copyQuads', quads, imageWidth, imageHeight });
    });

    document.getElementById('insertBtn').addEventListener('click', () => {
      if (quads.length === 0) return;
      vscode.postMessage({ type: 'insertQuads', quads, imageWidth, imageHeight });
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
      quads.length = 0;
      redraw();
    });
  </script>
</body>
</html>`;
  }

  dispose(): void {
    this.panel?.dispose();
  }
}
