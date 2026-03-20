import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('dependency/graph', () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'love2d-dep-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should export buildDependencyGraph', async () => {
    const { buildDependencyGraph } = await import('../dependency/graph');
    expect(typeof buildDependencyGraph).toBe('function');
  });

  it('should build graph from require statements', async () => {
    const { buildDependencyGraph } = await import('../dependency/graph');

    fs.writeFileSync(path.join(tmpDir, 'main.lua'), 'local player = require("player")\nlocal enemy = require("enemy")');
    fs.writeFileSync(path.join(tmpDir, 'player.lua'), 'local utils = require("utils")\nreturn {}');
    fs.writeFileSync(path.join(tmpDir, 'enemy.lua'), 'local utils = require("utils")\nreturn {}');
    fs.writeFileSync(path.join(tmpDir, 'utils.lua'), 'return {}');

    const graph = buildDependencyGraph(tmpDir);

    expect(graph.nodes.length).toBe(4);

    const mainNode = graph.nodes.find(n => n.module === 'main');
    expect(mainNode).toBeDefined();
    expect(mainNode!.dependencies).toContain('player');
    expect(mainNode!.dependencies).toContain('enemy');

    const playerNode = graph.nodes.find(n => n.module === 'player');
    expect(playerNode).toBeDefined();
    expect(playerNode!.dependencies).toContain('utils');
  });

  it('should detect circular dependencies', async () => {
    const { buildDependencyGraph } = await import('../dependency/graph');

    fs.writeFileSync(path.join(tmpDir, 'a.lua'), 'require("b")');
    fs.writeFileSync(path.join(tmpDir, 'b.lua'), 'require("a")');

    const graph = buildDependencyGraph(tmpDir);

    expect(graph.circular.length).toBeGreaterThan(0);
  });

  it('should handle empty project', async () => {
    const { buildDependencyGraph } = await import('../dependency/graph');

    const graph = buildDependencyGraph(tmpDir);

    expect(graph.nodes.length).toBe(0);
    expect(graph.circular.length).toBe(0);
  });

  it('should export DependencyGraphPanel', async () => {
    const { DependencyGraphPanel } = await import('../dependency/graph');
    expect(typeof DependencyGraphPanel).toBe('function');
  });
});
