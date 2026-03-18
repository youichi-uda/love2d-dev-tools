import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('sidebar/quickActions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export QuickActionsProvider and activate', async () => {
    const { QuickActionsProvider, activate } = await import('../sidebar/quickActions');
    expect(typeof QuickActionsProvider).toBe('function');
    expect(typeof activate).toBe('function');
  });

  it('should have correct viewType', async () => {
    const { QuickActionsProvider } = await import('../sidebar/quickActions');
    expect(QuickActionsProvider.viewType).toBe('love2dQuickActions');
  });

  it('should generate HTML with buttons', async () => {
    const { QuickActionsProvider } = await import('../sidebar/quickActions');
    const provider = new QuickActionsProvider();

    // Simulate resolving webview
    let capturedHtml = '';
    const mockView = {
      webview: {
        options: {},
        set html(value: string) { capturedHtml = value; },
        get html() { return capturedHtml; },
        onDidReceiveMessage: () => ({ dispose: () => {} }),
      },
    };

    provider.resolveWebviewView(
      mockView as unknown as import('vscode').WebviewView,
      {} as unknown as import('vscode').WebviewViewResolveContext,
      { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) } as unknown as import('vscode').CancellationToken,
    );

    expect(capturedHtml).toContain('love2d-tools.launch');
    expect(capturedHtml).toContain('love2d-tools.stop');
    expect(capturedHtml).toContain('love2d-tools.setupIntelliSense');
    expect(capturedHtml).toContain('love2d-tools.setupDebugger');
    expect(capturedHtml).toContain('love2d-tools.newProject');
    expect(capturedHtml).toContain('PRO');
  });

  it('should support refresh', async () => {
    const { QuickActionsProvider } = await import('../sidebar/quickActions');
    const provider = new QuickActionsProvider();

    // Refresh without a view should not throw
    expect(() => provider.refresh()).not.toThrow();
  });

  it('should forward message commands', async () => {
    const vscode = await import('vscode');
    const execSpy = vi.spyOn(vscode.commands, 'executeCommand');

    const { QuickActionsProvider } = await import('../sidebar/quickActions');
    const provider = new QuickActionsProvider();

    let messageHandler: ((msg: { command: string }) => void) | undefined;
    const mockView = {
      webview: {
        options: {},
        html: '',
        onDidReceiveMessage: (handler: (msg: { command: string }) => void) => {
          messageHandler = handler;
          return { dispose: () => {} };
        },
      },
    };

    provider.resolveWebviewView(
      mockView as unknown as import('vscode').WebviewView,
      {} as unknown as import('vscode').WebviewViewResolveContext,
      { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) } as unknown as import('vscode').CancellationToken,
    );

    // Simulate button click
    messageHandler?.({ command: 'love2d-tools.launch' });

    expect(execSpy).toHaveBeenCalledWith('love2d-tools.launch');
  });
});
