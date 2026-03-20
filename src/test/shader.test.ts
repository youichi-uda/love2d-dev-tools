import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('shader/editor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export ShaderLiveEditor', async () => {
    const { ShaderLiveEditor } = await import('../shader/editor');
    expect(typeof ShaderLiveEditor).toBe('function');
  });

  it('should toggle enabled state', async () => {
    const { ShaderLiveEditor } = await import('../shader/editor');

    const mockBridge = {
      connected: false,
      send: vi.fn(),
    };

    const editor = new ShaderLiveEditor(mockBridge as never);

    expect(editor.isEnabled()).toBe(false);

    const enabled = editor.toggle();
    expect(enabled).toBe(true);
    expect(editor.isEnabled()).toBe(true);

    const disabled = editor.toggle();
    expect(disabled).toBe(false);
    expect(editor.isEnabled()).toBe(false);

    editor.dispose();
  });
});
