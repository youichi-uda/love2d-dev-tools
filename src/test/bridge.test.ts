import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as net from 'net';

describe('BridgeClient', () => {
  let server: net.Server;
  let serverPort: number;
  const serverSockets: net.Socket[] = [];

  beforeEach(async () => {
    vi.restoreAllMocks();
    serverSockets.length = 0;

    server = net.createServer();
    server.on('connection', (socket) => serverSockets.push(socket));

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as net.AddressInfo;
        serverPort = addr.port;
        resolve();
      });
    });
  });

  afterEach(async () => {
    // Destroy all sockets first so server.close() doesn't hang
    for (const s of serverSockets) s.destroy();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should connect to a TCP server', async () => {
    const { BridgeClient } = await import('../bridge/client');
    const client = new BridgeClient();

    // Accept connection on server side
    server.on('connection', () => {});

    await client.connect(serverPort);
    expect(client.connected).toBe(true);

    client.dispose();
  });

  it('should fire onConnected event', async () => {
    const { BridgeClient } = await import('../bridge/client');
    const client = new BridgeClient();

    server.on('connection', () => {});

    let connected = false;
    client.onConnected(() => { connected = true; });

    await client.connect(serverPort);
    expect(connected).toBe(true);

    client.dispose();
  });

  it('should fire onDisconnected when server closes', async () => {
    const { BridgeClient } = await import('../bridge/client');
    const client = new BridgeClient();

    let serverSocket: net.Socket | null = null;
    server.on('connection', (socket) => { serverSocket = socket; });

    await client.connect(serverPort);

    const disconnectedPromise = new Promise<void>((resolve) => {
      client.onDisconnected(() => resolve());
    });

    // Server closes the connection
    serverSocket?.destroy();
    await disconnectedPromise;

    expect(client.connected).toBe(false);
    client.dispose();
  });

  it('should send and receive JSON messages', async () => {
    const { BridgeClient } = await import('../bridge/client');
    const client = new BridgeClient();

    server.on('connection', (socket) => {
      socket.on('data', (data) => {
        const msg = JSON.parse(data.toString().trim());
        // Echo back a response with matching id
        const response = JSON.stringify({
          id: msg.id,
          type: 'response',
          success: true,
          data: 'pong',
        }) + '\n';
        socket.write(response);
      });
    });

    await client.connect(serverPort);

    const response = await client.send({ cmd: 'ping' });
    expect(response.success).toBe(true);
    expect(response.data).toBe('pong');

    client.dispose();
  });

  it('should timeout on no response', async () => {
    const { BridgeClient } = await import('../bridge/client');
    const client = new BridgeClient();

    // Server accepts but never responds
    server.on('connection', () => {});

    await client.connect(serverPort);

    await expect(
      client.send({ cmd: 'ping' }, 100),
    ).rejects.toThrow('timed out');

    client.dispose();
  });

  it('should handle log messages from the bridge', async () => {
    const { BridgeClient } = await import('../bridge/client');
    const client = new BridgeClient();

    server.on('connection', (socket) => {
      // Push a log message (no request ID)
      setTimeout(() => {
        socket.write(JSON.stringify({
          type: 'log',
          data: { level: 'info', message: 'hello from game' },
        }) + '\n');
      }, 50);
    });

    const logPromise = new Promise<{ level: string; message: string }>((resolve) => {
      client.onLog((entry) => resolve(entry));
    });

    await client.connect(serverPort);

    const log = await logPromise;
    expect(log.level).toBe('info');
    expect(log.message).toBe('hello from game');

    client.dispose();
  });

  it('should reject pending requests on disconnect', async () => {
    const { BridgeClient } = await import('../bridge/client');
    const client = new BridgeClient();

    let serverSocket: net.Socket | null = null;
    server.on('connection', (socket) => { serverSocket = socket; });

    await client.connect(serverPort);

    const promise = client.send({ cmd: 'ping' }, 5000);

    // Close server side immediately
    setTimeout(() => serverSocket?.destroy(), 50);

    await expect(promise).rejects.toThrow('disconnected');

    client.dispose();
  });

  it('should throw when sending without connection', async () => {
    const { BridgeClient } = await import('../bridge/client');
    const client = new BridgeClient();

    await expect(
      client.send({ cmd: 'ping' }),
    ).rejects.toThrow('not connected');

    client.dispose();
  });

  it('should provide convenience methods', async () => {
    const { BridgeClient } = await import('../bridge/client');
    const client = new BridgeClient();

    server.on('connection', (socket) => {
      socket.on('data', (data) => {
        const msg = JSON.parse(data.toString().trim());
        socket.write(JSON.stringify({
          id: msg.id,
          type: 'response',
          success: true,
          data: msg.cmd,
        }) + '\n');
      });
    });

    await client.connect(serverPort);

    const r1 = await client.reload('player');
    expect(r1.data).toBe('reload');

    const r2 = await client.eval('return 42');
    expect(r2.data).toBe('eval');

    const r3 = await client.perf();
    expect(r3.data).toBe('perf');

    client.dispose();
  });
});
