import { InternalServerErrorException } from "@nestjs/common";
import { TwoFactorService } from "./two-factor.service";

function buildService(
  configOverrides: Record<string, string | undefined> = {},
  envOverrides: Record<string, string | undefined> = {},
) {
  const configStore: Record<string, string | undefined> = {
    TOTP_ENCRYPTION_KEY: undefined,
    ...configOverrides,
  };

  const originalEnv = { ...process.env };
  process.env = {
    ...process.env,
    NODE_ENV: "development",
    ...envOverrides,
  };

  const configService = { get: (key: string) => configStore[key] };
  const twoFactorRepo = {} as any;
  const userRepo = {} as any;

  const svc = new TwoFactorService(
    twoFactorRepo,
    userRepo,
    configService as any,
  );

  const cleanup = () => {
    process.env = originalEnv;
  };
  return { svc, cleanup };
}

describe("TwoFactorService.getEncryptionKey", () => {
  it("returns a Buffer from a valid 64-char hex TOTP_ENCRYPTION_KEY", () => {
    const hexKey = "a".repeat(64);
    const { svc, cleanup } = buildService(
      { TOTP_ENCRYPTION_KEY: hexKey },
      { NODE_ENV: "production" },
    );

    const key: Buffer = (svc as any).getEncryptionKey();

    expect(Buffer.isBuffer(key)).toBe(true);
    expect(key.length).toBe(32);
    expect(key.toString("hex")).toBe(hexKey);
    cleanup();
  });

  it("throws InternalServerErrorException in production without TOTP_ENCRYPTION_KEY", () => {
    const { svc, cleanup } = buildService({}, { NODE_ENV: "production" });

    expect(() => (svc as any).getEncryptionKey()).toThrow(
      InternalServerErrorException,
    );
    cleanup();
  });

  it("throws in staging without ALLOW_DEV_FALLBACK", () => {
    const { svc, cleanup } = buildService({}, { NODE_ENV: "staging" });

    expect(() => (svc as any).getEncryptionKey()).toThrow(
      InternalServerErrorException,
    );
    cleanup();
  });

  it("returns ephemeral key in dev (no opt-in needed)", () => {
    const { svc, cleanup } = buildService({}, { NODE_ENV: "development" });
    jest.spyOn((svc as any).logger, "warn").mockImplementation();

    const key: Buffer = (svc as any).getEncryptionKey();

    expect(key.length).toBe(32);
    cleanup();
  });

  it("returns ephemeral key in test with ALLOW_DEV_FALLBACK=true", () => {
    const { svc, cleanup } = buildService(
      {},
      { NODE_ENV: "test", ALLOW_DEV_FALLBACK: "true" },
    );
    jest.spyOn((svc as any).logger, "warn").mockImplementation();

    const key: Buffer = (svc as any).getEncryptionKey();
    expect(key.length).toBe(32);
    cleanup();
  });

  it("logs a fingerprint warning on first ephemeral key use", () => {
    const { svc, cleanup } = buildService({}, { NODE_ENV: "development" });
    const warnSpy = jest
      .spyOn((svc as any).logger, "warn")
      .mockImplementation();

    (svc as any).getEncryptionKey();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("ephemeral dev TOTP key"),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("fingerprint="),
    );
    warnSpy.mockRestore();
    cleanup();
  });

  it("cache invariant: same instance returns the SAME Buffer (reference equality)", () => {
    const { svc, cleanup } = buildService({}, { NODE_ENV: "development" });
    jest.spyOn((svc as any).logger, "warn").mockImplementation();

    const key1: Buffer = (svc as any).getEncryptionKey();
    const key2: Buffer = (svc as any).getEncryptionKey();

    expect(key1).toBe(key2);
    cleanup();
  });

  it("per-instance uniqueness: different instances produce DIFFERENT keys", () => {
    const { svc: svc1, cleanup: c1 } = buildService(
      {},
      { NODE_ENV: "development" },
    );
    const { svc: svc2, cleanup: c2 } = buildService(
      {},
      { NODE_ENV: "development" },
    );
    jest.spyOn((svc1 as any).logger, "warn").mockImplementation();
    jest.spyOn((svc2 as any).logger, "warn").mockImplementation();

    const key1: Buffer = (svc1 as any).getEncryptionKey();
    const key2: Buffer = (svc2 as any).getEncryptionKey();

    expect(key1.equals(key2)).toBe(false);
    c1();
    c2();
  });
});

describe("TwoFactorService encrypt/decrypt round-trip", () => {
  it("decrypts back to the original secret (production key)", () => {
    const hexKey = "ab".repeat(32);
    const { svc, cleanup } = buildService(
      { TOTP_ENCRYPTION_KEY: hexKey },
      { NODE_ENV: "production" },
    );

    const secret = "JBSWY3DPEHPK3PXP";
    const { encrypted, iv } = (svc as any).encryptTotpSecret(secret);
    const decrypted = (svc as any).decryptTotpSecret(encrypted, iv);

    expect(decrypted).toBe(secret);
    cleanup();
  });

  it("decrypts back to the original secret (ephemeral dev key)", () => {
    const { svc, cleanup } = buildService({}, { NODE_ENV: "development" });
    jest.spyOn((svc as any).logger, "warn").mockImplementation();

    const secret = "JBSWY3DPEHPK3PXP";
    const { encrypted, iv } = (svc as any).encryptTotpSecret(secret);
    const decrypted = (svc as any).decryptTotpSecret(encrypted, iv);

    expect(decrypted).toBe(secret);
    cleanup();
  });

  it("fails to decrypt with a different key (tamper detection)", () => {
    const { svc: svc1, cleanup: c1 } = buildService(
      { TOTP_ENCRYPTION_KEY: "aa".repeat(32) },
      { NODE_ENV: "production" },
    );
    const { svc: svc2, cleanup: c2 } = buildService(
      { TOTP_ENCRYPTION_KEY: "bb".repeat(32) },
      { NODE_ENV: "production" },
    );

    const secret = "JBSWY3DPEHPK3PXP";
    const { encrypted, iv } = (svc1 as any).encryptTotpSecret(secret);

    expect(() => (svc2 as any).decryptTotpSecret(encrypted, iv)).toThrow();
    c1();
    c2();
  });
});
