import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Module Dependency Graph: Parses require() statements to build
 * a dependency graph and displays it in a Webview using Mermaid.js.
 * Detects circular dependencies.
 */

export interface DependencyNode {
  module: string;
  file: string;
  dependencies: string[];
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  circular: string[][];
}

const REQUIRE_PATTERN = /require\s*[\(]?\s*["']([^"']+)["']\s*[\)]?/g;

export function buildDependencyGraph(projectRoot: string): DependencyGraph {
  const nodes = new Map<string, DependencyNode>();
  const luaFiles = findLuaFiles(projectRoot);

  for (const filePath of luaFiles) {
    const relPath = path.relative(projectRoot, filePath).replace(/\\/g, '/');
    const moduleName = relPath.replace(/\.lua$/, '').replace(/\/init$/, '').replace(/\//g, '.');

    const content = fs.readFileSync(filePath, 'utf-8');
    const deps: string[] = [];

    REQUIRE_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = REQUIRE_PATTERN.exec(content)) !== null) {
      deps.push(match[1]);
    }

    nodes.set(moduleName, {
      module: moduleName,
      file: relPath,
      dependencies: deps,
    });
  }

  // Detect circular dependencies
  const circular = findCircularDependencies(nodes);

  return {
    nodes: Array.from(nodes.values()),
    circular,
  };
}

function findCircularDependencies(nodes: Map<string, DependencyNode>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(module: string, stack: string[]): void {
    if (inStack.has(module)) {
      const cycleStart = stack.indexOf(module);
      if (cycleStart >= 0) {
        cycles.push(stack.slice(cycleStart).concat(module));
      }
      return;
    }
    if (visited.has(module)) return;

    visited.add(module);
    inStack.add(module);
    stack.push(module);

    const node = nodes.get(module);
    if (node) {
      for (const dep of node.dependencies) {
        // Normalize: module.name format
        const normalizedDep = dep.replace(/\//g, '.');
        dfs(normalizedDep, [...stack]);
      }
    }

    inStack.delete(module);
  }

  for (const module of nodes.keys()) {
    dfs(module, []);
  }

  return cycles;
}

function findLuaFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findLuaFiles(fullPath));
      } else if (entry.name.endsWith('.lua')) {
        results.push(fullPath);
      }
    }
  } catch {
    // skip
  }
  return results;
}

export class DependencyGraphPanel {
  private panel: vscode.WebviewPanel | null = null;

  show(projectRoot: string): void {
    const graph = buildDependencyGraph(projectRoot);

    if (this.panel) {
      this.panel.reveal();
    } else {
      this.panel = vscode.window.createWebviewPanel(
        'love2dDependencyGraph',
        'Module Dependencies',
        vscode.ViewColumn.One,
        { enableScripts: true },
      );
      this.panel.onDidDispose(() => { this.panel = null; });

      this.panel.webview.onDidReceiveMessage((msg: { type: string; file?: string }) => {
        if (msg.type === 'openFile' && msg.file) {
          const uri = vscode.Uri.file(path.join(projectRoot, msg.file));
          vscode.window.showTextDocument(uri);
        }
      });
    }

    this.panel.webview.html = this.getHtml(graph);
  }

  private getHtml(graph: DependencyGraph): string {
    // Build Mermaid diagram
    const lines: string[] = ['graph LR'];
    const circularEdges = new Set<string>();

    for (const cycle of graph.circular) {
      for (let i = 0; i < cycle.length - 1; i++) {
        circularEdges.add(`${cycle[i]}->${cycle[i + 1]}`);
      }
    }

    const nodeIds = new Map<string, string>();
    let nodeId = 0;
    function getId(module: string): string {
      if (!nodeIds.has(module)) {
        nodeIds.set(module, `N${nodeId++}`);
      }
      return nodeIds.get(module)!;
    }

    for (const node of graph.nodes) {
      const id = getId(node.module);
      const shortName = node.module.split('.').pop() || node.module;
      lines.push(`  ${id}["${shortName}"]`);
    }

    for (const node of graph.nodes) {
      for (const dep of node.dependencies) {
        const normalized = dep.replace(/\//g, '.');
        const fromId = getId(node.module);
        const toId = getId(normalized);
        const isCircular = circularEdges.has(`${node.module}->${normalized}`);
        if (isCircular) {
          lines.push(`  ${fromId} -. circular .-> ${toId}`);
        } else {
          lines.push(`  ${fromId} --> ${toId}`);
        }
      }
    }

    const mermaidCode = lines.join('\n');

    // Build file map for click handling
    const fileMap: Record<string, string> = {};
    for (const node of graph.nodes) {
      const id = getId(node.module);
      fileMap[id] = node.file;
    }

    const circularWarnings = graph.circular.length > 0
      ? `<div class="warning">Circular dependencies detected: ${graph.circular.length} cycle(s)</div>`
      : '';

    return /* html */ `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body {
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    padding: 16px;
  }
  h2 {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.6;
    margin-bottom: 8px;
  }
  .warning {
    color: var(--vscode-editorWarning-foreground, #dcdcaa);
    background: var(--vscode-inputValidation-warningBackground, rgba(220, 220, 170, 0.1));
    padding: 8px 12px;
    border-radius: 4px;
    margin-bottom: 12px;
    border: 1px solid var(--vscode-inputValidation-warningBorder, #dcdcaa);
  }
  .stats {
    font-size: 12px;
    opacity: 0.7;
    margin-bottom: 12px;
  }
  .mermaid {
    text-align: center;
  }
  .mermaid .node {
    cursor: pointer;
    pointer-events: all;
  }
</style>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body>
  <h2>Module Dependencies</h2>
  <div class="stats">${graph.nodes.length} modules, ${graph.nodes.reduce((s, n) => s + n.dependencies.length, 0)} dependencies</div>
  ${circularWarnings}
  <div class="mermaid">
${mermaidCode}
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const fileMap = ${JSON.stringify(fileMap)};

    mermaid.initialize({
      startOnLoad: true,
      theme: document.body.classList.contains('vscode-light') ? 'default' : 'dark',
      securityLevel: 'loose',
    });

    document.addEventListener('click', (e) => {
      const node = e.target.closest('.node');
      if (node) {
        // Try direct ID match first, then strip Mermaid prefix (flowchart-N0-XX → N0)
        let id = node.id;
        let file = fileMap[id];
        if (!file) {
          // Mermaid v10+ prefixes IDs: extract the original node ID
          const match = id.match(/flowchart-([^-]+)/);
          if (match) {
            file = fileMap[match[1]];
          }
        }
        if (file) {
          vscode.postMessage({ type: 'openFile', file });
        }
      }
    });
  </script>
</body>
</html>`;
  }

  dispose(): void {
    this.panel?.dispose();
  }
}
