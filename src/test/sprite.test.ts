import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('sprite/editor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export SpriteQuadEditor', async () => {
    const { SpriteQuadEditor } = await import('../sprite/editor');
    expect(typeof SpriteQuadEditor).toBe('function');
  });

  it('should generate correct newQuad code', async () => {
    const { SpriteQuadEditor } = await import('../sprite/editor');

    const editor = new SpriteQuadEditor();

    // Access private method via prototype for testing
    const generateCode = (editor as unknown as {
      generateCode: (
        quads: Array<{ x: number; y: number; w: number; h: number }>,
        imageWidth: number,
        imageHeight: number,
      ) => string;
    }).generateCode.bind(editor);

    const code = generateCode(
      [
        { x: 0, y: 0, w: 32, h: 32 },
        { x: 32, y: 0, w: 32, h: 32 },
      ],
      128, 128,
    );

    expect(code).toContain('love.graphics.newQuad(0, 0, 32, 32, 128, 128)');
    expect(code).toContain('love.graphics.newQuad(32, 0, 32, 32, 128, 128)');
    expect(code).toContain('quad1');
    expect(code).toContain('quad2');

    editor.dispose();
  });
});
