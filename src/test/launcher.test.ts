import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('launcher', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export all public functions', async () => {
    const mod = await import('../runner/launcher');
    expect(typeof mod.launchGame).toBe('function');
    expect(typeof mod.stopGame).toBe('function');
    expect(typeof mod.isGameRunning).toBe('function');
    expect(typeof mod.getDetectedVersion).toBe('function');
    expect(typeof mod.dispose).toBe('function');
  });

  it('should not be running initially', async () => {
    const { isGameRunning } = await import('../runner/launcher');
    expect(isGameRunning()).toBe(false);
  });

  it('should fire game state events', async () => {
    const { onGameStateChanged } = await import('../runner/launcher');
    const states: boolean[] = [];
    const disposable = onGameStateChanged.event((running) => {
      states.push(running);
    });

    onGameStateChanged.fire(true);
    onGameStateChanged.fire(false);

    expect(states).toEqual([true, false]);
    disposable.dispose();
  });
});
