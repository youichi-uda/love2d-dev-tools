import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('template/generator', () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'love2d-template-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should export generateProject', async () => {
    const mod = await import('../template/generator');
    expect(typeof mod.generateProject).toBe('function');
  });

  it('should generate minimal template files', async () => {
    const vscode = await import('vscode');

    // Mock user picks 'minimal' and selects tmpDir
    vi.spyOn(vscode.window, 'showQuickPick').mockResolvedValue({
      id: 'minimal',
      label: 'Minimal',
      description: '',
    } as unknown as ReturnType<Awaited<typeof vscode.window.showQuickPick>>);

    vi.spyOn(vscode.window, 'showOpenDialog').mockResolvedValue(
      [{ fsPath: tmpDir }] as unknown as ReturnType<Awaited<typeof vscode.window.showOpenDialog>>,
    );

    const { generateProject } = await import('../template/generator');
    await generateProject();

    expect(fs.existsSync(path.join(tmpDir, 'main.lua'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'conf.lua'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.vscode', 'extensions.json'))).toBe(true);

    const confLua = fs.readFileSync(path.join(tmpDir, 'conf.lua'), 'utf-8');
    expect(confLua).toContain('love.conf');
    expect(confLua).toContain('11.5');

    const mainLua = fs.readFileSync(path.join(tmpDir, 'main.lua'), 'utf-8');
    expect(mainLua).toContain('love.load');
    expect(mainLua).toContain('love.draw');
  });

  it('should generate gamejam template with states', async () => {
    const vscode = await import('vscode');

    vi.spyOn(vscode.window, 'showQuickPick').mockResolvedValue({
      id: 'gamejam',
      label: 'Game Jam',
      description: '',
    } as unknown as ReturnType<Awaited<typeof vscode.window.showQuickPick>>);

    vi.spyOn(vscode.window, 'showOpenDialog').mockResolvedValue(
      [{ fsPath: tmpDir }] as unknown as ReturnType<Awaited<typeof vscode.window.showOpenDialog>>,
    );

    const { generateProject } = await import('../template/generator');
    await generateProject();

    expect(fs.existsSync(path.join(tmpDir, 'main.lua'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'conf.lua'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'states', 'game.lua'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'assets', 'images'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'assets', 'sounds'))).toBe(true);

    const mainLua = fs.readFileSync(path.join(tmpDir, 'main.lua'), 'utf-8');
    expect(mainLua).toContain('switchState');
    expect(mainLua).toContain('require("states.game")');
  });

  it('should generate state-machine template with lib and multiple states', async () => {
    const vscode = await import('vscode');

    vi.spyOn(vscode.window, 'showQuickPick').mockResolvedValue({
      id: 'state-machine',
      label: 'State Machine',
      description: '',
    } as unknown as ReturnType<Awaited<typeof vscode.window.showQuickPick>>);

    vi.spyOn(vscode.window, 'showOpenDialog').mockResolvedValue(
      [{ fsPath: tmpDir }] as unknown as ReturnType<Awaited<typeof vscode.window.showOpenDialog>>,
    );

    const { generateProject } = await import('../template/generator');
    await generateProject();

    expect(fs.existsSync(path.join(tmpDir, 'lib', 'state.lua'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'states', 'menu.lua'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'states', 'game.lua'))).toBe(true);

    const stateLib = fs.readFileSync(path.join(tmpDir, 'lib', 'state.lua'), 'utf-8');
    expect(stateLib).toContain('StateManager');
    expect(stateLib).toContain('switch');

    const menuLua = fs.readFileSync(path.join(tmpDir, 'states', 'menu.lua'), 'utf-8');
    expect(menuLua).toContain('switchState("game")');
  });

  it('should generate .vscode/extensions.json with recommendations', async () => {
    const vscode = await import('vscode');

    vi.spyOn(vscode.window, 'showQuickPick').mockResolvedValue({
      id: 'minimal',
      label: 'Minimal',
      description: '',
    } as unknown as ReturnType<Awaited<typeof vscode.window.showQuickPick>>);

    vi.spyOn(vscode.window, 'showOpenDialog').mockResolvedValue(
      [{ fsPath: tmpDir }] as unknown as ReturnType<Awaited<typeof vscode.window.showOpenDialog>>,
    );

    const { generateProject } = await import('../template/generator');
    await generateProject();

    const extJson = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.vscode', 'extensions.json'), 'utf-8'),
    );
    expect(extJson.recommendations).toContain('abyo-software.love2d-dev-tools');
    expect(extJson.recommendations).toContain('sumneko.lua');
    expect(extJson.recommendations).toContain('tomblind.local-lua-debugger-vscode');
  });

  it('should do nothing when user cancels template pick', async () => {
    const vscode = await import('vscode');
    vi.spyOn(vscode.window, 'showQuickPick').mockResolvedValue(undefined);

    const { generateProject } = await import('../template/generator');
    await generateProject();

    // No files should be created
    expect(fs.readdirSync(tmpDir)).toHaveLength(0);
  });
});
