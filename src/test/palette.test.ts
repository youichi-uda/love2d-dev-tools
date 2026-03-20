import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('color/palette', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export ColorPaletteProvider', async () => {
    const { ColorPaletteProvider } = await import('../color/palette');
    expect(typeof ColorPaletteProvider).toBe('function');
  });

  it('should load palette from JSON file', async () => {
    const { loadPalette } = await import('../color/palette');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'love2d-test-'));
    const palettePath = path.join(tmpDir, '.love-palette.json');
    fs.writeFileSync(palettePath, JSON.stringify({
      colors: {
        sky_blue: [0.529, 0.808, 0.922],
        enemy_red: [0.8, 0.1, 0.1, 1],
      },
    }));

    const data = loadPalette(palettePath);
    expect(Object.keys(data.colors)).toHaveLength(2);
    expect(data.colors['sky_blue']).toEqual([0.529, 0.808, 0.922]);
    expect(data.colors['enemy_red']).toEqual([0.8, 0.1, 0.1, 1]);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('should return empty palette for non-existent file', async () => {
    const { loadPalette } = await import('../color/palette');

    const data = loadPalette('/nonexistent/.love-palette.json');
    expect(data.colors).toEqual({});
  });

  it('should create PaletteColorItem with correct description', async () => {
    const { PaletteColorItem } = await import('../color/palette');

    const item = new PaletteColorItem('sky_blue', [0.529, 0.808, 0.922]);
    expect(item.colorName).toBe('sky_blue');
    expect(item.description).toBe('{0.529, 0.808, 0.922}');
  });

  it('should create PaletteColorItem with alpha in description', async () => {
    const { PaletteColorItem } = await import('../color/palette');

    const item = new PaletteColorItem('semi_transparent', [0.5, 0.5, 0.5, 0.5]);
    expect(item.description).toBe('{0.5, 0.5, 0.5, 0.5}');
  });
});
