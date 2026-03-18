import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('preview/panel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export ScreenshotPreviewPanel', async () => {
    const { ScreenshotPreviewPanel } = await import('../preview/panel');
    expect(typeof ScreenshotPreviewPanel).toBe('function');
  });

  it('should show a webview panel', async () => {
    const vscode = await import('vscode');
    const { ScreenshotPreviewPanel } = await import('../preview/panel');
    const { BridgeClient } = await import('../bridge/client');
    const bridge = new BridgeClient();

    const createPanelSpy = vi.spyOn(vscode.window, 'createWebviewPanel');

    const panel = new ScreenshotPreviewPanel(bridge);
    await panel.show();

    expect(createPanelSpy).toHaveBeenCalledWith(
      'love2dPreview',
      'Love2D Preview',
      expect.anything(),
      expect.objectContaining({ enableScripts: true }),
    );

    panel.dispose();
    bridge.dispose();
  });

  it('should reveal existing panel instead of creating new one', async () => {
    const vscode = await import('vscode');
    const { ScreenshotPreviewPanel } = await import('../preview/panel');
    const { BridgeClient } = await import('../bridge/client');
    const bridge = new BridgeClient();

    const createPanelSpy = vi.spyOn(vscode.window, 'createWebviewPanel');

    const panel = new ScreenshotPreviewPanel(bridge);
    await panel.show();
    await panel.show(); // Second call should reveal, not create

    expect(createPanelSpy).toHaveBeenCalledTimes(1);

    panel.dispose();
    bridge.dispose();
  });
});

describe('perf/panel', () => {
  it('should export PerformancePanel', async () => {
    const { PerformancePanel } = await import('../perf/panel');
    expect(typeof PerformancePanel).toBe('function');
  });

  it('should show a webview panel', async () => {
    const vscode = await import('vscode');
    const { PerformancePanel } = await import('../perf/panel');
    const { BridgeClient } = await import('../bridge/client');
    const bridge = new BridgeClient();

    const createPanelSpy = vi.spyOn(vscode.window, 'createWebviewPanel');

    const panel = new PerformancePanel(bridge);
    await panel.show();

    expect(createPanelSpy).toHaveBeenCalledWith(
      'love2dPerf',
      'Love2D Performance',
      expect.anything(),
      expect.objectContaining({ enableScripts: true }),
    );

    panel.dispose();
    bridge.dispose();
  });
});

describe('console/output', () => {
  it('should export StructuredConsole', async () => {
    const { StructuredConsole } = await import('../console/output');
    expect(typeof StructuredConsole).toBe('function');
  });

  it('should format log entries with timestamps', async () => {
    const vscode = await import('vscode');
    const { StructuredConsole } = await import('../console/output');
    const { BridgeClient } = await import('../bridge/client');
    const bridge = new BridgeClient();

    const lines: string[] = [];
    vi.spyOn(vscode.window, 'createOutputChannel').mockReturnValue({
      append: () => {},
      appendLine: (line: string) => { lines.push(line); },
      clear: () => {},
      show: () => {},
      dispose: () => {},
      name: 'Love2D Console',
    } as unknown as import('vscode').OutputChannel);

    const console_ = new StructuredConsole(bridge);
    console_.start();

    // Simulate bridge log event
    (bridge as unknown as { _onLog: import('vscode').EventEmitter<unknown> })._onLog.fire({
      level: 'error',
      message: 'Something went wrong',
    });

    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toContain('[ERROR]');
    expect(lines[0]).toContain('Something went wrong');

    console_.dispose();
    bridge.dispose();
  });
});
