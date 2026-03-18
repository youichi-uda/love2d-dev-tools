import * as vscode from 'vscode';
import * as net from 'net';

/**
 * TCP client for communicating with the Love2D bridge script.
 * Uses a JSON-line protocol over a localhost TCP socket.
 */

export interface BridgeCommand {
  cmd: string;
  [key: string]: unknown;
}

export interface BridgeResponse {
  type: string;
  success?: boolean;
  data?: unknown;
  error?: string;
}

export class BridgeClient {
  private socket: net.Socket | null = null;
  private port: number = 0;
  private buffer: string = '';
  private pendingRequests: Map<number, {
    resolve: (value: BridgeResponse) => void;
    reject: (reason: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = new Map();
  private requestId: number = 0;
  private _connected: boolean = false;

  private _onConnected = new vscode.EventEmitter<void>();
  private _onDisconnected = new vscode.EventEmitter<void>();
  private _onLog = new vscode.EventEmitter<{ level: string; message: string; data?: unknown }>();

  readonly onConnected = this._onConnected.event;
  readonly onDisconnected = this._onDisconnected.event;
  readonly onLog = this._onLog.event;

  get connected(): boolean {
    return this._connected;
  }

  /**
   * Connect to the bridge server running in the Love2D game.
   */
  async connect(port: number): Promise<void> {
    if (this._connected) {
      this.disconnect();
    }

    this.port = port;

    return new Promise<void>((resolve, reject) => {
      this.socket = new net.Socket();

      this.socket.on('connect', () => {
        this._connected = true;
        this._onConnected.fire();
        resolve();
      });

      this.socket.on('data', (data: Buffer) => {
        this.handleData(data);
      });

      this.socket.on('close', () => {
        this.handleDisconnect();
      });

      this.socket.on('error', (err: Error) => {
        if (!this._connected) {
          reject(err);
        }
        this.handleDisconnect();
      });

      this.socket.connect(port, '127.0.0.1');
    });
  }

  /**
   * Disconnect from the bridge.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.handleDisconnect();
  }

  /**
   * Send a command and wait for a response.
   */
  async send(command: BridgeCommand, timeoutMs: number = 5000): Promise<BridgeResponse> {
    if (!this._connected || !this.socket) {
      throw new Error('Bridge not connected');
    }

    const id = ++this.requestId;
    const message = JSON.stringify({ ...command, id }) + '\n';

    return new Promise<BridgeResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Bridge command "${command.cmd}" timed out`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });
      this.socket!.write(message);
    });
  }

  /**
   * Send a command without waiting for a response (fire-and-forget).
   */
  sendNoWait(command: BridgeCommand): void {
    if (!this._connected || !this.socket) return;
    const id = ++this.requestId;
    const message = JSON.stringify({ ...command, id }) + '\n';
    this.socket.write(message);
  }

  // ── Convenience methods ──

  async reload(module: string): Promise<BridgeResponse> {
    return this.send({ cmd: 'reload', module });
  }

  async screenshot(): Promise<BridgeResponse> {
    return this.send({ cmd: 'screenshot' }, 10000);
  }

  async eval(code: string): Promise<BridgeResponse> {
    return this.send({ cmd: 'eval', code });
  }

  async perf(): Promise<BridgeResponse> {
    return this.send({ cmd: 'perf' });
  }

  // ── Internal ──

  private handleData(data: Buffer): void {
    this.buffer += data.toString('utf-8');

    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.substring(0, newlineIndex).trim();
      this.buffer = this.buffer.substring(newlineIndex + 1);

      if (!line) continue;

      try {
        const msg = JSON.parse(line) as BridgeResponse & { id?: number };
        this.handleMessage(msg);
      } catch {
        // Ignore malformed messages
      }
    }
  }

  private handleMessage(msg: BridgeResponse & { id?: number }): void {
    // Log messages from the game (pushed, no request ID)
    if (msg.type === 'log') {
      this._onLog.fire({
        level: (msg.data as { level?: string })?.level || 'info',
        message: (msg.data as { message?: string })?.message || String(msg.data),
        data: (msg.data as { args?: unknown })?.args,
      });
      return;
    }

    // Response to a pending request
    if (msg.id !== undefined) {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingRequests.delete(msg.id);
        pending.resolve(msg);
      }
    }
  }

  private handleDisconnect(): void {
    if (!this._connected) return;
    this._connected = false;

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Bridge disconnected'));
      this.pendingRequests.delete(id);
    }

    this._onDisconnected.fire();
  }

  dispose(): void {
    this.disconnect();
    this._onConnected.dispose();
    this._onDisconnected.dispose();
    this._onLog.dispose();
  }
}
