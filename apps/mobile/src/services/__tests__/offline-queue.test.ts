/**
 * Offline Queue Tests
 * Verify enqueue, flush retry semantics, max-attempt drop, and subscribe.
 */

// Mock AsyncStorage BEFORE importing module under test
jest.mock("@react-native-async-storage/async-storage", () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) =>
        Promise.resolve(store[k] !== undefined ? store[k] : null),
      ),
      setItem: jest.fn((k: string, v: string) => {
        store[k] = v;
        return Promise.resolve();
      }),
      removeItem: jest.fn((k: string) => {
        delete store[k];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store = {};
        return Promise.resolve();
      }),
      __reset: () => {
        store = {};
      },
    },
  };
});

// Mock API client
jest.mock("../api", () => ({
  api: {
    request: jest.fn(),
  },
  setOnSessionExpired: jest.fn(),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api";
import {
  enqueue,
  flush,
  getQueue,
  removeFromQueue,
  clearQueue,
  subscribe,
  isNetworkError,
  __resetForTests,
} from "../offline-queue";

const mockApiRequest = api.request as jest.Mock;

const resetStorage = () => (AsyncStorage as any).__reset?.();

describe("offline-queue", () => {
  beforeEach(() => {
    resetStorage();
    __resetForTests();
    mockApiRequest.mockReset();
  });

  describe("enqueue", () => {
    it("adds a mutation and returns an id", async () => {
      const id = await enqueue({
        method: "POST",
        url: "/tasks/abc/complete",
        body: { notes: "done" },
      });

      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);

      const queue = await getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        id,
        method: "POST",
        url: "/tasks/abc/complete",
        body: { notes: "done" },
        attempts: 0,
      });
      expect(queue[0]?.createdAt).toEqual(expect.any(String));
    });

    it("persists to AsyncStorage", async () => {
      await enqueue({ method: "POST", url: "/x" });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "vendhub:offline-mutation-queue",
        expect.any(String),
      );
    });

    it("drops oldest when exceeding MAX_QUEUE_SIZE (100)", async () => {
      // Fill to 100 — then one more should evict the first
      for (let i = 0; i < 100; i++) {
        await enqueue({ method: "POST", url: `/item/${i}` });
      }
      let q = await getQueue();
      expect(q).toHaveLength(100);
      const firstId = q[0]?.id;

      await enqueue({ method: "POST", url: "/item/overflow" });
      q = await getQueue();
      expect(q).toHaveLength(100);
      expect(q[0]?.id).not.toBe(firstId);
      expect(q[99]?.url).toBe("/item/overflow");
    });
  });

  describe("flush", () => {
    it("removes successful mutations", async () => {
      mockApiRequest.mockResolvedValue({ data: { ok: true } });

      await enqueue({ method: "POST", url: "/a" });
      await enqueue({ method: "POST", url: "/b" });

      const result = await flush();

      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.remaining).toBe(0);
      expect(mockApiRequest).toHaveBeenCalledTimes(2);
      expect(await getQueue()).toHaveLength(0);
    });

    it("retries failed mutations (keeps them in queue) until max attempts", async () => {
      mockApiRequest.mockRejectedValue(new Error("Network request failed"));

      await enqueue({ method: "POST", url: "/retry-me" });

      // Attempt 1..4 — stays in queue, attempts increments
      for (let i = 1; i <= 4; i++) {
        const res = await flush();
        expect(res.failed).toBe(1);
        expect(res.succeeded).toBe(0);
        expect(res.remaining).toBe(1);
        const q = await getQueue();
        expect(q[0]?.attempts).toBe(i);
        expect(q[0]?.lastError).toContain("Network");
      }

      // Attempt 5 hits MAX_ATTEMPTS and drops
      const final = await flush();
      expect(final.failed).toBe(1);
      expect(final.remaining).toBe(0);
      expect(await getQueue()).toHaveLength(0);
    });

    it("processes FIFO order", async () => {
      mockApiRequest.mockResolvedValue({ data: {} });
      await enqueue({ method: "POST", url: "/1" });
      await enqueue({ method: "POST", url: "/2" });
      await enqueue({ method: "POST", url: "/3" });

      await flush();

      const urls = mockApiRequest.mock.calls.map(
        (c: unknown[]) => (c[0] as { url: string }).url,
      );
      expect(urls).toEqual(["/1", "/2", "/3"]);
    });

    it("mixes success and failure correctly", async () => {
      mockApiRequest
        .mockResolvedValueOnce({ data: {} })
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ data: {} });

      await enqueue({ method: "POST", url: "/ok1" });
      await enqueue({ method: "POST", url: "/fail" });
      await enqueue({ method: "POST", url: "/ok2" });

      const result = await flush();
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.remaining).toBe(1);
      const remaining = await getQueue();
      expect(remaining[0]?.url).toBe("/fail");
      expect(remaining[0]?.attempts).toBe(1);
    });
  });

  describe("subscribe", () => {
    it("fires listener on enqueue and remove", async () => {
      const listener = jest.fn();
      const unsub = subscribe(listener);

      await enqueue({ method: "POST", url: "/sub-test" });
      expect(listener).toHaveBeenCalled();
      const firstCallQueue = listener.mock.calls[0][0];
      expect(firstCallQueue).toHaveLength(1);

      listener.mockClear();
      const q = await getQueue();
      await removeFromQueue(q[0]!.id);
      expect(listener).toHaveBeenCalled();
      const lastCall = listener.mock.calls[listener.mock.calls.length - 1];
      expect(lastCall[0]).toHaveLength(0);

      unsub();
      listener.mockClear();
      await enqueue({ method: "POST", url: "/after-unsub" });
      expect(listener).not.toHaveBeenCalled();
    });

    it("fires on clearQueue", async () => {
      await enqueue({ method: "POST", url: "/x" });
      const listener = jest.fn();
      subscribe(listener);
      await clearQueue();
      expect(listener).toHaveBeenCalledWith([]);
    });
  });

  describe("isNetworkError", () => {
    it("detects common network error shapes", () => {
      expect(isNetworkError(new Error("Network request failed"))).toBe(true);
      expect(isNetworkError(new Error("timeout of 30000ms exceeded"))).toBe(
        true,
      );
      const axiosLike = Object.assign(new Error("something"), {
        code: "ERR_NETWORK",
      });
      expect(isNetworkError(axiosLike)).toBe(true);
    });

    it("returns false for non-network errors", () => {
      expect(isNetworkError(new Error("Validation failed"))).toBe(false);
      expect(isNetworkError("string error")).toBe(false);
      expect(isNetworkError(null)).toBe(false);
      const httpError = Object.assign(new Error("Bad request"), {
        response: { status: 400 },
      });
      expect(isNetworkError(httpError)).toBe(false);
    });
  });

  describe("corruption resilience", () => {
    it("treats corrupted JSON as empty queue", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        "{invalid json",
      );
      const q = await getQueue();
      expect(q).toEqual([]);
    });
  });
});
