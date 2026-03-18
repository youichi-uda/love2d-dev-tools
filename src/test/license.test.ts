import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('license/gumroad', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export LicenseManager class', async () => {
    const { LicenseManager } = await import('../license/gumroad');
    expect(typeof LicenseManager).toBe('function');
  });

  it('should not be licensed by default', async () => {
    const { LicenseManager } = await import('../license/gumroad');
    const secrets = createMockSecrets();
    const manager = new LicenseManager(secrets);
    expect(manager.isProLicensed()).toBe(false);
  });

  it('should check startup with no cached key', async () => {
    const { LicenseManager } = await import('../license/gumroad');
    const secrets = createMockSecrets();
    const manager = new LicenseManager(secrets);

    await manager.checkOnStartup();
    expect(manager.isProLicensed()).toBe(false);
  });

  it('should trust cached key within 7 days', async () => {
    const { LicenseManager } = await import('../license/gumroad');
    const secrets = createMockSecrets({
      'love2d.licenseKey': 'test-key',
      'love2d.licenseVerifiedAt': String(Date.now()),
    });

    const manager = new LicenseManager(secrets);
    await manager.checkOnStartup();
    expect(manager.isProLicensed()).toBe(true);
  });

  it('should deactivate license', async () => {
    const { LicenseManager } = await import('../license/gumroad');
    const secrets = createMockSecrets({
      'love2d.licenseKey': 'test-key',
      'love2d.licenseVerifiedAt': String(Date.now()),
    });

    const manager = new LicenseManager(secrets);
    await manager.checkOnStartup();
    expect(manager.isProLicensed()).toBe(true);

    await manager.deactivate();
    expect(manager.isProLicensed()).toBe(false);
  });

  it('should fire onDidChange events', async () => {
    const { LicenseManager } = await import('../license/gumroad');
    const secrets = createMockSecrets({
      'love2d.licenseKey': 'test-key',
      'love2d.licenseVerifiedAt': String(Date.now()),
    });

    const manager = new LicenseManager(secrets);
    const events: boolean[] = [];
    manager.onDidChange((licensed) => events.push(licensed));

    await manager.checkOnStartup();
    await manager.deactivate();

    expect(events).toEqual([true, false]);
    manager.dispose();
  });

  it('should export requirePro and isProLicensed helpers', async () => {
    const { requirePro, isProLicensed } = await import('../license/gumroad');
    expect(typeof requirePro).toBe('function');
    expect(typeof isProLicensed).toBe('function');
  });

  it('requirePro should return false when not licensed', async () => {
    const { requirePro } = await import('../license/gumroad');
    // Module-level _manager is null initially
    const result = requirePro('Test Feature');
    expect(result).toBe(false);
  });
});

function createMockSecrets(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    get: async (key: string) => store.get(key),
    store: async (key: string, value: string) => { store.set(key, value); },
    delete: async (key: string) => { store.delete(key); },
    onDidChange: () => ({ dispose: () => {} }),
  } as unknown as import('vscode').SecretStorage;
}
