import { IoAdapter } from "@nestjs/platform-socket.io";
import { INestApplication, Logger } from "@nestjs/common";
import { ServerOptions } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";

/**
 * Socket.IO adapter backed by Redis pub/sub.
 *
 * When multiple API instances run behind a load balancer (K8s pods,
 * Railway replicas, etc.), the default in-memory adapter only delivers
 * events to clients connected to the *same* process.  This adapter
 * uses Redis pub/sub so every `emit` propagates to all instances.
 *
 * Graceful fallback: if no Redis URL is provided or the connection
 * fails, Socket.IO keeps working with the default in-memory adapter
 * (single-instance mode).
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | undefined;
  private pubClient: Redis | undefined;
  private subClient: Redis | undefined;
  private readonly logger = new Logger(RedisIoAdapter.name);

  constructor(
    app: INestApplication,
    private readonly redisUrl: string,
  ) {
    super(app);
  }

  /**
   * Open pub/sub connections to Redis.
   * Must be called (and awaited) before `app.listen()`.
   */
  async connectToRedis(): Promise<void> {
    try {
      this.pubClient = new Redis(this.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryStrategy(times: number) {
          if (times > 5) return null; // stop retrying after 5 attempts
          return Math.min(times * 200, 2000);
        },
      });

      this.subClient = this.pubClient.duplicate();

      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

      this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
      this.logger.log("Socket.IO Redis adapter connected successfully");
    } catch (error) {
      this.logger.warn(
        `Redis adapter connection failed, falling back to in-memory adapter: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // Clean up partial connections
      await this.cleanup();
    }
  }

  createIOServer(port: number, options?: Partial<ServerOptions>) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  /**
   * Disconnect Redis clients on application shutdown.
   */
  async cleanup(): Promise<void> {
    try {
      if (this.pubClient?.status === "ready") {
        this.pubClient.disconnect();
      }
      if (this.subClient?.status === "ready") {
        this.subClient.disconnect();
      }
    } catch {
      // Best-effort cleanup
    }
    this.pubClient = undefined;
    this.subClient = undefined;
    this.adapterConstructor = undefined;
  }
}
