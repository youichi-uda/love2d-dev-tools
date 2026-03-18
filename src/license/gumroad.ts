import * as vscode from 'vscode';
import * as https from 'https';

const GUMROAD_PRODUCT_ID = 'BKi_m1QXJpQi5S7d3sj6lQ==';
const VERIFY_URL = 'https://api.gumroad.com/v2/licenses/verify';

const SECRET_KEY_LICENSE = 'love2d.licenseKey';
const SECRET_KEY_VERIFIED_AT = 'love2d.licenseVerifiedAt';
const PURCHASE_URL = 'https://y1uda.gumroad.com/l/love2d?wanted=true';

/** Re-verify cached license every 7 days. */
const REVERIFY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

// ── Gumroad API ─────────────────────────────────────────────────────────

interface GumroadVerifyResponse {
  success: boolean;
  purchase?: {
    refunded: boolean;
    chargebacked: boolean;
  };
}

function verifyLicenseKey(licenseKey: string): Promise<GumroadVerifyResponse> {
  return new Promise((resolve, reject) => {
    const body = `product_id=${encodeURIComponent(GUMROAD_PRODUCT_ID)}&license_key=${encodeURIComponent(licenseKey)}`;

    const url = new URL(VERIFY_URL);
    const options: https.RequestOptions = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk: string) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data) as GumroadVerifyResponse);
        } catch {
          reject(new Error('Failed to parse Gumroad response'));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Gumroad API request timed out'));
    });

    req.write(body);
    req.end();
  });
}

// ── License Manager ─────────────────────────────────────────────────────

export class LicenseManager {
  private licensed = false;
  private secrets: vscode.SecretStorage;
  private _onDidChange = new vscode.EventEmitter<boolean>();
  readonly onDidChange = this._onDidChange.event;

  constructor(secrets: vscode.SecretStorage) {
    this.secrets = secrets;
  }

  isProLicensed(): boolean {
    return this.licensed;
  }

  async activate(key: string): Promise<{ success: boolean; message: string }> {
    try {
      const resp = await verifyLicenseKey(key);

      if (!resp.success) {
        return { success: false, message: vscode.l10n.t('Invalid license key.') };
      }
      if (resp.purchase?.refunded) {
        return { success: false, message: vscode.l10n.t('License has been refunded.') };
      }
      if (resp.purchase?.chargebacked) {
        return { success: false, message: vscode.l10n.t('License has been chargebacked.') };
      }

      await this.secrets.store(SECRET_KEY_LICENSE, key);
      await this.secrets.store(SECRET_KEY_VERIFIED_AT, String(Date.now()));
      this.licensed = true;
      this._onDidChange.fire(true);

      return { success: true, message: vscode.l10n.t('Pro license activated successfully!') };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: vscode.l10n.t('Failed to verify license: {0}', msg) };
    }
  }

  async deactivate(): Promise<void> {
    await this.secrets.delete(SECRET_KEY_LICENSE);
    await this.secrets.delete(SECRET_KEY_VERIFIED_AT);
    this.licensed = false;
    this._onDidChange.fire(false);
  }

  async checkOnStartup(): Promise<void> {
    const cachedKey = await this.secrets.get(SECRET_KEY_LICENSE);
    if (!cachedKey) {
      this.licensed = false;
      return;
    }

    const verifiedAtStr = await this.secrets.get(SECRET_KEY_VERIFIED_AT);
    const verifiedAt = verifiedAtStr ? parseInt(verifiedAtStr, 10) : 0;
    const needsReverify = Date.now() - verifiedAt > REVERIFY_INTERVAL_MS;

    if (!needsReverify) {
      this.licensed = true;
      this._onDidChange.fire(true);
      return;
    }

    try {
      const resp = await verifyLicenseKey(cachedKey);
      if (resp.success && !resp.purchase?.refunded && !resp.purchase?.chargebacked) {
        await this.secrets.store(SECRET_KEY_VERIFIED_AT, String(Date.now()));
        this.licensed = true;
      } else {
        this.licensed = false;
        await this.deactivate();
      }
    } catch {
      // Network error — trust the cache (offline grace)
      this.licensed = true;
    }
    this._onDidChange.fire(this.licensed);
  }

  dispose(): void {
    this._onDidChange.dispose();
  }
}

// ── Singleton & Pro feature gate ────────────────────────────────────────

let _manager: LicenseManager | null = null;

export function isProLicensed(): boolean {
  return _manager?.isProLicensed() ?? false;
}

export function requirePro(featureName: string): boolean {
  if (_manager?.isProLicensed()) return true;

  vscode.window
    .showInformationMessage(
      vscode.l10n.t('{0} is a Pro feature. Activate your license to use it.', featureName),
      vscode.l10n.t('Enter Key'),
      vscode.l10n.t('Purchase'),
    )
    .then((choice) => {
      if (choice === vscode.l10n.t('Enter Key')) {
        vscode.commands.executeCommand('love2d-tools.activateLicense');
      } else if (choice === vscode.l10n.t('Purchase')) {
        vscode.env.openExternal(vscode.Uri.parse(PURCHASE_URL));
      }
    });

  return false;
}

// ── Status bar ──────────────────────────────────────────────────────────

let licenseStatusBar: vscode.StatusBarItem | null = null;

function updateLicenseStatusBar(manager: LicenseManager): void {
  if (!licenseStatusBar) return;
  if (manager.isProLicensed()) {
    licenseStatusBar.text = vscode.l10n.t('♥ Love2D Pro');
    licenseStatusBar.tooltip = vscode.l10n.t('Love2D Dev Tools Pro — All features unlocked');
  } else {
    licenseStatusBar.text = vscode.l10n.t('♥ Love2D');
    licenseStatusBar.tooltip = vscode.l10n.t('Love2D Dev Tools Free — Click to activate Pro');
  }
  licenseStatusBar.show();
}

// ── Public activate ─────────────────────────────────────────────────────

export async function activateLicense(context: vscode.ExtensionContext): Promise<LicenseManager> {
  const manager = new LicenseManager(context.secrets);
  _manager = manager;

  // License status bar
  licenseStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  licenseStatusBar.command = 'love2d-tools.activateLicense';
  context.subscriptions.push(licenseStatusBar);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('love2d-tools.activateLicense', async () => {
      const key = await vscode.window.showInputBox({
        prompt: vscode.l10n.t('Enter your Gumroad license key'),
        placeHolder: vscode.l10n.t('XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX'),
        ignoreFocusOut: true,
      });
      if (!key) return;

      const result = await manager.activate(key);
      if (result.success) {
        vscode.window.showInformationMessage(result.message);
      } else {
        vscode.window.showErrorMessage(result.message);
      }
      updateLicenseStatusBar(manager);
      vscode.commands.executeCommand('love2d-tools.refreshQuickActions');
    }),

    vscode.commands.registerCommand('love2d-tools.deactivateLicense', async () => {
      await manager.deactivate();
      vscode.window.showInformationMessage(vscode.l10n.t('Pro license deactivated.'));
      updateLicenseStatusBar(manager);
      vscode.commands.executeCommand('love2d-tools.refreshQuickActions');
    }),
  );

  await manager.checkOnStartup();
  updateLicenseStatusBar(manager);

  return manager;
}
