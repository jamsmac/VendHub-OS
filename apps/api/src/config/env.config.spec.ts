import { parseDatabaseUrl, parseRedisUrl } from "./env.config";

describe("parseDatabaseUrl", () => {
  it("parses a standard PostgreSQL connection string", () => {
    const result = parseDatabaseUrl(
      "postgresql://admin:s3cret@db.example.com:5432/vendhub?sslmode=require",
    );
    expect(result).toEqual({
      host: "db.example.com",
      port: 5432,
      username: "admin",
      password: "s3cret",
      database: "vendhub",
      ssl: true,
    });
  });

  it("defaults port to 5432 when omitted", () => {
    const result = parseDatabaseUrl("postgresql://u:p@host/db?sslmode=require");
    expect(result.port).toBe(5432);
  });

  it("decodes URI-encoded username and password", () => {
    const result = parseDatabaseUrl(
      "postgresql://user%40org:p%23ss%25@host:5432/db",
    );
    expect(result.username).toBe("user@org");
    expect(result.password).toBe("p#ss%");
  });

  it("enables ssl for verify-full", () => {
    const result = parseDatabaseUrl(
      "postgresql://u:p@host:5432/db?sslmode=verify-full",
    );
    expect(result.ssl).toBe(true);
  });

  it("enables ssl when sslmode is absent (safe default)", () => {
    const result = parseDatabaseUrl("postgresql://u:p@host:5432/db");
    expect(result.ssl).toBe(true);
  });

  it("disables ssl when sslmode=disable", () => {
    const result = parseDatabaseUrl(
      "postgresql://u:p@host:5432/db?sslmode=disable",
    );
    expect(result.ssl).toBe(false);
  });
});

describe("parseRedisUrl", () => {
  it("parses a standard Redis URL with password", () => {
    const result = parseRedisUrl("redis://:hunter2@redis.example.com:6380");
    expect(result).toEqual({
      host: "redis.example.com",
      port: 6380,
      password: "hunter2",
      tls: false,
    });
  });

  it("defaults port to 6379 when omitted", () => {
    const result = parseRedisUrl("redis://:pw@host");
    expect(result.port).toBe(6379);
  });

  it("detects TLS from rediss:// scheme", () => {
    const result = parseRedisUrl("rediss://:pw@host:6379");
    expect(result.tls).toBe(true);
  });

  it("returns undefined password when none provided", () => {
    const result = parseRedisUrl("redis://host:6379");
    expect(result.password).toBeUndefined();
  });
});

describe("appConfig — jwtSecret invariant", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.JWT_SECRET;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("throws in production when JWT_SECRET is missing", async () => {
    process.env.NODE_ENV = "production";

    const mod = await import("./env.config");
    const factory = mod.appConfig as unknown as () => Record<string, unknown>;
    expect(() => factory()).toThrow("JWT_SECRET must be set in production");
  });

  it("falls back to dev-only value in development (with warning)", async () => {
    process.env.NODE_ENV = "development";
    const warnSpy = jest.spyOn(console, "warn").mockImplementation();

    const mod = await import("./env.config");
    const factory = mod.appConfig as unknown as () => Record<string, unknown>;
    const config = factory();

    expect(config.jwtSecret).toBe("change-me-dev-only");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("JWT_SECRET not set"),
    );
    warnSpy.mockRestore();
  });

  it("uses the provided JWT_SECRET when set", async () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "real-production-secret-value";

    const mod = await import("./env.config");
    const factory = mod.appConfig as unknown as () => Record<string, unknown>;
    const config = factory();

    expect(config.jwtSecret).toBe("real-production-secret-value");
  });
});
