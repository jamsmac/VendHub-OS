/**
 * Socket Service Tests
 *
 * Verifies connect/subscribe/disconnect behavior of the singleton socket
 * wrapper. socket.io-client and expo-secure-store are mocked — no real
 * network activity occurs.
 */

type MockListener = (data: unknown) => void;

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { extra: { apiUrl: "http://localhost:4000" } } },
}));

// Minimal Socket mock: tracks listeners and connection state.
interface MockSocket {
  id: string;
  connected: boolean;
  handlers: Map<string, Set<MockListener>>;
  on: jest.Mock;
  off: jest.Mock;
  emit: jest.Mock;
  disconnect: jest.Mock;
  removeAllListeners: jest.Mock;
}

const makeMockSocket = (): MockSocket => {
  const handlers = new Map<string, Set<MockListener>>();
  const self: MockSocket = {
    id: "mock-socket-id",
    connected: false,
    handlers,
    on: jest.fn((event: string, fn: MockListener) => {
      const set = handlers.get(event) ?? new Set<MockListener>();
      set.add(fn);
      handlers.set(event, set);
      return self;
    }),
    off: jest.fn((event: string, fn: MockListener) => {
      handlers.get(event)?.delete(fn);
      return self;
    }),
    emit: jest.fn(),
    disconnect: jest.fn(() => {
      self.connected = false;
    }),
    removeAllListeners: jest.fn(() => {
      handlers.clear();
    }),
  };
  return self;
};

let currentSocket: MockSocket | null = null;
const ioFactory = jest.fn((_url?: string, _opts?: unknown) => {
  currentSocket = makeMockSocket();
  return currentSocket;
});

jest.mock("socket.io-client", () => ({
  io: (url?: string, opts?: unknown) => ioFactory(url, opts),
}));

import * as SecureStore from "expo-secure-store";
import {
  connect,
  disconnect,
  subscribe,
  getSocket,
  isConnected,
} from "../socket";

describe("socket service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure fully disconnected state between tests
    disconnect();
    currentSocket = null;
  });

  describe("connect()", () => {
    it("returns null when no access token is stored", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
      const result = await connect();
      expect(result).toBeNull();
      expect(ioFactory).not.toHaveBeenCalled();
    });

    it("creates a socket with auth token when one is available", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce("tok-xyz");
      const result = await connect();
      expect(result).not.toBeNull();
      expect(ioFactory).toHaveBeenCalledTimes(1);
      const call = ioFactory.mock.calls[0] as unknown as [
        string,
        { auth: { token: string }; reconnection: boolean },
      ];
      const [url, opts] = call;
      expect(url).toContain("/notifications");
      expect(opts.auth.token).toBe("tok-xyz");
      expect(opts.reconnection).toBe(true);
    });

    it("is idempotent when already connected", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("tok");
      await connect();
      if (currentSocket) currentSocket.connected = true;
      await connect();
      expect(ioFactory).toHaveBeenCalledTimes(1);
    });

    it("registers lifecycle handlers (connect, disconnect, connect_error)", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce("tok");
      await connect();
      expect(currentSocket).not.toBeNull();
      const handlers = currentSocket?.handlers;
      expect(handlers?.has("connect")).toBe(true);
      expect(handlers?.has("disconnect")).toBe(true);
      expect(handlers?.has("connect_error")).toBe(true);
    });
  });

  describe("subscribe()", () => {
    it("registers a listener on the live socket", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce("tok");
      await connect();
      const listener = jest.fn();
      const unsub = subscribe("notifications:new", listener);
      expect(currentSocket?.handlers.get("notifications:new")?.size).toBe(1);
      unsub();
      expect(currentSocket?.handlers.get("notifications:new")?.size ?? 0).toBe(
        0,
      );
    });

    it("queues listener before connect and attaches once socket connects", async () => {
      const listener = jest.fn();
      const unsub = subscribe("notifications:new", listener);

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce("tok");
      await connect();

      // Simulate server-side connect event
      const connectHandler = Array.from(
        currentSocket?.handlers.get("connect") ?? [],
      )[0];
      expect(connectHandler).toBeDefined();
      connectHandler?.(undefined);

      expect(currentSocket?.handlers.get("notifications:new")?.size).toBe(1);
      unsub();
    });

    it("returns an unsubscribe function that removes the listener", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce("tok");
      await connect();
      const listener = jest.fn();
      const unsub = subscribe("custom:event", listener);
      unsub();
      expect(currentSocket?.off).toHaveBeenCalledWith("custom:event", listener);
    });
  });

  describe("disconnect()", () => {
    it("cleans up the socket and clears listeners", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce("tok");
      await connect();
      const socketBefore = currentSocket;
      subscribe("notifications:new", jest.fn());

      disconnect();

      expect(socketBefore?.disconnect).toHaveBeenCalled();
      expect(socketBefore?.removeAllListeners).toHaveBeenCalled();
      expect(getSocket()).toBeNull();
      expect(isConnected()).toBe(false);
    });

    it("is safe to call when no socket exists", () => {
      expect(() => disconnect()).not.toThrow();
    });
  });
});
