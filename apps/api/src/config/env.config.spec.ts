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

  function loadAppConfig(
    envOverrides: Record<string, string | undefined>,
  ): Record<string, unknown> {
    let result: Record<string, unknown>;
    jest.isolateModules(() => {
      process.env = { ...originalEnv, ...envOverrides };
      delete process.env.JWT_SECRET;
      if (envOverrides.JWT_SECRET !== undefined) {
        process.env.JWT_SECRET = envOverrides.JWT_SECRET;
      }

      const mod = require("./env.config");
      const factory = mod.appConfig as unknown as () => Record<string, unknown>;
      result = factory();
    });
    return result!;
  }

  function loadAppConfigThrows(
    envOverrides: Record<string, string | undefined>,
  ): void {
    jest.isolateModules(() => {
      process.env = { ...originalEnv, ...envOverrides };
      delete process.env.JWT_SECRET;
      if (envOverrides.JWT_SECRET !== undefined) {
        process.env.JWT_SECRET = envOverrides.JWT_SECRET;
      }

      const mod = require("./env.config");
      const factory = mod.appConfig as unknown as () => Record<string, unknown>;
      factory();
    });
  }

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("throws in production without JWT_SECRET", () => {
    expect(() => loadAppConfigThrows({ NODE_ENV: "production" })).toThrow(
      /JWT_SECRET must be set.*production/,
    );
  });

  it("throws in staging without JWT_SECRET", () => {
    expect(() => loadAppConfigThrows({ NODE_ENV: "staging" })).toThrow(
      /JWT_SECRET must be set.*staging/,
    );
  });

  it("throws in preview without JWT_SECRET", () => {
    expect(() => loadAppConfigThrows({ NODE_ENV: "preview" })).toThrow(
      /JWT_SECRET must be set.*preview/,
    );
  });

  it("throws in test without JWT_SECRET and without ALLOW_DEV_FALLBACK", () => {
    expect(() => loadAppConfigThrows({ NODE_ENV: "test" })).toThrow(
      /JWT_SECRET missing in test/,
    );
  });

  it("uses sentinel in test with ALLOW_DEV_FALLBACK=true", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation();
    const config = loadAppConfig({
      NODE_ENV: "test",
      ALLOW_DEV_FALLBACK: "true",
    });
    expect(config.jwtSecret).toBe("vendhub-dev-secret-unsafe");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("insecure dev JWT sentinel"),
    );
  });

  it("uses sentinel in development without JWT_SECRET (no opt-in needed)", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation();
    const config = loadAppConfig({ NODE_ENV: "development" });
    expect(config.jwtSecret).toBe("vendhub-dev-secret-unsafe");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("insecure dev JWT sentinel"),
    );
  });

  it("uses the real secret in any env when JWT_SECRET >=32 chars is set", () => {
    const secret = "a]3kF9!mPqR7xZ2w@LnYv5dH8cBtG0jE";
    const config = loadAppConfig({
      NODE_ENV: "production",
      JWT_SECRET: secret,
    });
    expect(config.jwtSecret).toBe(secret);
  });

  it("rejects a short JWT_SECRET (<32 chars) in production", () => {
    expect(() =>
      loadAppConfigThrows({ NODE_ENV: "production", JWT_SECRET: "tooshort" }),
    ).toThrow(/JWT_SECRET must be set and >=32 chars/);
  });
});
