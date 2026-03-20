import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('snippets/love2d.json', () => {
  const snippetsPath = path.join(__dirname, '..', '..', 'snippets', 'love2d.json');
  const snippets = JSON.parse(fs.readFileSync(snippetsPath, 'utf-8'));

  it('should be valid JSON with snippet entries', () => {
    expect(typeof snippets).toBe('object');
    expect(Object.keys(snippets).length).toBeGreaterThan(0);
  });

  it('each snippet should have prefix, body, and description', () => {
    for (const [name, snippet] of Object.entries(snippets)) {
      const s = snippet as { prefix?: string; body?: string[]; description?: string };
      expect(s.prefix, `${name} missing prefix`).toBeTruthy();
      expect(Array.isArray(s.body), `${name} body should be array`).toBe(true);
      expect(s.body!.length, `${name} body should not be empty`).toBeGreaterThan(0);
      expect(s.description, `${name} missing description`).toBeTruthy();
    }
  });

  it('should include all core Love2D callbacks', () => {
    const prefixes = Object.values(snippets).map((s: unknown) => (s as { prefix: string }).prefix);
    expect(prefixes).toContain('loveload');
    expect(prefixes).toContain('loveupdate');
    expect(prefixes).toContain('lovedraw');
    expect(prefixes).toContain('lovekeypressed');
    expect(prefixes).toContain('lovemousepressed');
    expect(prefixes).toContain('loveconf');
  });

  it('should include the full game loop snippet', () => {
    const prefixes = Object.values(snippets).map((s: unknown) => (s as { prefix: string }).prefix);
    expect(prefixes).toContain('lovegameloop');
  });

  it('should include resource loading snippets', () => {
    const prefixes = Object.values(snippets).map((s: unknown) => (s as { prefix: string }).prefix);
    expect(prefixes).toContain('loveimage');
    expect(prefixes).toContain('lovefont');
    expect(prefixes).toContain('lovesound');
  });

  it('should include pattern snippets (class, state, timer, aabb)', () => {
    const prefixes = Object.values(snippets).map((s: unknown) => (s as { prefix: string }).prefix);
    expect(prefixes).toContain('loveclass');
    expect(prefixes).toContain('lovestate');
    expect(prefixes).toContain('lovetimer');
    expect(prefixes).toContain('loveaabb');
  });

  it('love-gameloop body should contain load, update, and draw', () => {
    const gameloop = snippets['love.gameloop'] as { body: string[] };
    const body = gameloop.body.join('\n');
    expect(body).toContain('love.load');
    expect(body).toContain('love.update');
    expect(body).toContain('love.draw');
  });

  it('love-conf should have version placeholder', () => {
    const conf = snippets['love.conf'] as { body: string[] };
    const body = conf.body.join('\n');
    expect(body).toContain('t.version');
    expect(body).toContain('t.window.width');
  });
});
