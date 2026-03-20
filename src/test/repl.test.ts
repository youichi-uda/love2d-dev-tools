import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('repl/panel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export ReplPanel', async () => {
    const { ReplPanel } = await import('../repl/panel');
    expect(typeof ReplPanel).toBe('function');
  });

  it('should create a webview panel on show()', async () => {
    const vscode = await import('vscode');
    const { ReplPanel } = await import('../repl/panel');

    const mockBridge = {
      connected: false,
      eval: vi.fn(),
      onConnected: vi.fn(),
      onDisconnected: vi.fn(),
      onLog: vi.fn(),
    };

    let capturedHtml = '';
    vi.spyOn(vscode.window, 'createWebviewPanel').mockReturnValue({
      webview: {
        html: '',
        set html(val: string) { capturedHtml = val; },
        get html() { return capturedHtml; },
        options: {},
        postMessage: async () => true,
        onDidReceiveMessage: () => ({ dispose: () => {} }),
      },
      reveal: () => {},
      onDidDispose: () => ({ dispose: () => {} }),
      dispose: () => {},
    } as unknown as ReturnType<typeof vscode.window.createWebviewPanel>);

    const panel = new ReplPanel(mockBridge as never);
    await panel.show();

    expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
      'love2dRepl',
      'Love2D REPL',
      expect.anything(),
      expect.objectContaining({ enableScripts: true }),
    );

    expect(capturedHtml).toContain('Enter Lua code');
    panel.dispose();
  });

  it('should have history navigation in the webview HTML', async () => {
    const vscode = await import('vscode');
    const { ReplPanel } = await import('../repl/panel');

    let capturedHtml = '';
    vi.spyOn(vscode.window, 'createWebviewPanel').mockReturnValue({
      webview: {
        html: '',
        set html(val: string) { capturedHtml = val; },
        get html() { return capturedHtml; },
        options: {},
        postMessage: async () => true,
        onDidReceiveMessage: () => ({ dispose: () => {} }),
      },
      reveal: () => {},
      onDidDispose: () => ({ dispose: () => {} }),
      dispose: () => {},
    } as unknown as ReturnType<typeof vscode.window.createWebviewPanel>);

    const panel = new ReplPanel({ connected: false } as never);
    await panel.show();

    expect(capturedHtml).toContain('ArrowUp');
    expect(capturedHtml).toContain('ArrowDown');
    expect(capturedHtml).toContain('history');
    panel.dispose();
  });
});
