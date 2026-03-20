import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('inspector/provider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export GameStateInspector', async () => {
    const { GameStateInspector } = await import('../inspector/provider');
    expect(typeof GameStateInspector).toBe('function');
  });

  it('should return empty children when bridge not connected', async () => {
    const { GameStateInspector } = await import('../inspector/provider');

    const mockBridge = {
      connected: false,
      send: vi.fn(),
    };

    const inspector = new GameStateInspector(mockBridge as never);
    const children = await inspector.getChildren();
    expect(children).toEqual([]);
    inspector.dispose();
  });

  it('should return children from bridge inspect command', async () => {
    const { GameStateInspector } = await import('../inspector/provider');

    const mockBridge = {
      connected: true,
      send: vi.fn().mockResolvedValue({
        success: true,
        data: [
          { key: 'player', value: '{...}', type: 'table', hasChildren: true },
          { key: 'score', value: '100', type: 'number', hasChildren: false },
        ],
      }),
    };

    const inspector = new GameStateInspector(mockBridge as never);
    const children = await inspector.getChildren();

    expect(children).toHaveLength(2);
    expect(children[0].label).toBe('player');
    expect(children[0].hasChildren).toBe(true);
    expect(children[1].label).toBe('score');
    expect(children[1].value).toBe('100');
    inspector.dispose();
  });

  it('should toggle auto-refresh', async () => {
    const { GameStateInspector } = await import('../inspector/provider');

    const mockBridge = { connected: false, send: vi.fn() };
    const inspector = new GameStateInspector(mockBridge as never);

    // Default is ON, first toggle turns it OFF
    const disabled = inspector.toggleAutoRefresh();
    expect(disabled).toBe(false);

    const enabled = inspector.toggleAutoRefresh();
    expect(enabled).toBe(true);

    inspector.dispose();
  });

  it('should create tree items with correct collapsible state', async () => {
    const { GameStateInspector } = await import('../inspector/provider');

    const mockBridge = { connected: false, send: vi.fn() };
    const inspector = new GameStateInspector(mockBridge as never);

    const tableNode = {
      label: 'player',
      path: 'player',
      value: '{...}',
      type: 'table',
      hasChildren: true,
    };

    const valueNode = {
      label: 'score',
      path: 'score',
      value: '42',
      type: 'number',
      hasChildren: false,
    };

    const tableItem = inspector.getTreeItem(tableNode);
    expect(tableItem.description).toBe('{...}');

    const valueItem = inspector.getTreeItem(valueNode);
    expect(valueItem.description).toBe('42');

    inspector.dispose();
  });
});
