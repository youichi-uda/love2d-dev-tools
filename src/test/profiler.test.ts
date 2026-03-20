import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('profiler/panel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export ProfilerPanel', async () => {
    const { ProfilerPanel } = await import('../profiler/panel');
    expect(typeof ProfilerPanel).toBe('function');
  });

  it('should create a webview panel on show()', async () => {
    const vscode = await import('vscode');
    const { ProfilerPanel } = await import('../profiler/panel');

    const mockBridge = {
      connected: false,
      send: vi.fn(),
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

    const panel = new ProfilerPanel(mockBridge as never);
    await panel.show();

    expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
      'love2dProfiler',
      'Love2D Profiler',
      expect.anything(),
      expect.objectContaining({ enableScripts: true }),
    );

    expect(capturedHtml).toContain('Start Profiling');
    expect(capturedHtml).toContain('Stop');
    panel.dispose();
  });
});
