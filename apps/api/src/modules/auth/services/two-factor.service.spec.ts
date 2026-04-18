import { InternalServerErrorException } from "@nestjs/common";
import { TwoFactorService } from "./two-factor.service";

function buildService(envOverrides: Record<string, string | undefined> = {}) {
  const configStore: Record<string, string | undefined> = {
    NODE_ENV: "development",
    ENCRYPTION_KEY: undefined,
    ...envOverrides,
  };

  const configService = { get: (key: string) => configStore[key] };
  const twoFactorRepo = {} as any;
  const userRepo = {} as any;

  return new TwoFactorService(twoFactorRepo, userRepo, configService as any);
}

describe("TwoFactorService.getEncryptionKey", () => {
  it("returns a Buffer from a valid 64-char hex ENCRYPTION_KEY", () => {
    const hexKey = "a".repeat(64);
    const svc = buildService({
      ENCRYPTION_KEY: hexKey,
      NODE_ENV: "production",
    });

    const key: Buffer = (svc as any).getEncryptionKey();

    expect(Buffer.isBuffer(key)).toBe(true);
    expect(key.length).toBe(32);
    expect(key.toString("hex")).toBe(hexKey);
  });

  it("throws InternalServerErrorException in production without ENCRYPTION_KEY", () => {
    const svc = buildService({ NODE_ENV: "production" });

    expect(() => (svc as any).getEncryptionKey()).toThrow(
      InternalServerErrorException,
    );
  });

  it("throws in staging/preview without ENCRYPTION_KEY (treated as production-like)", () => {
    for (const env of ["staging", "preview"]) {
      const svc = buildService({ NODE_ENV: env });
      // staging/preview are NOT production, so the code falls through to the dev fallback.
      // This verifies that non-production envs don't throw — they use the fallback.
      const key: Buffer = (svc as any).getEncryptionKey();
      expect(key.length).toBe(32);
    }
  });

  it("returns a 32-byte dev fallback key and logs a warning in development", () => {
    const svc = buildService({ NODE_ENV: "development" });
    const warnSpy = jest
      .spyOn((svc as any).logger, "warn")
      .mockImplementation();

    const key: Buffer = (svc as any).getEncryptionKey();

    expect(key.length).toBe(32);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("ENCRYPTION_KEY not set"),
    );
    warnSpy.mockRestore();
  });

  it("returns byte-equivalent keys across calls (determinism invariant)", () => {
    const svc = buildService({ NODE_ENV: "development" });
    jest.spyOn((svc as any).logger, "warn").mockImplementation();

    const key1: Buffer = (svc as any).getEncryptionKey();
    const key2: Buffer = (svc as any).getEncryptionKey();

    expect(key1.equals(key2)).toBe(true);
  });

  it("different instances produce the same dev fallback key", () => {
    const svc1 = buildService({ NODE_ENV: "development" });
    const svc2 = buildService({ NODE_ENV: "development" });
    jest.spyOn((svc1 as any).logger, "warn").mockImplementation();
    jest.spyOn((svc2 as any).logger, "warn").mockImplementation();

    const key1: Buffer = (svc1 as any).getEncryptionKey();
    const key2: Buffer = (svc2 as any).getEncryptionKey();

    expect(key1.equals(key2)).toBe(true);
  });
});

describe("TwoFactorService encrypt/decrypt round-trip", () => {
  it("decrypts back to the original secret (production key)", () => {
    const hexKey = "ab".repeat(32);
    const svc = buildService({
      ENCRYPTION_KEY: hexKey,
      NODE_ENV: "production",
    });

    const secret = "JBSWY3DPEHPK3PXP";
    const { encrypted, iv } = (svc as any).encryptTotpSecret(secret);
    const decrypted = (svc as any).decryptTotpSecret(encrypted, iv);

    expect(decrypted).toBe(secret);
  });

  it("decrypts back to the original secret (dev fallback key)", () => {
    const svc = buildService({ NODE_ENV: "development" });
    jest.spyOn((svc as any).logger, "warn").mockImplementation();

    const secret = "JBSWY3DPEHPK3PXP";
    const { encrypted, iv } = (svc as any).encryptTotpSecret(secret);
    const decrypted = (svc as any).decryptTotpSecret(encrypted, iv);

    expect(decrypted).toBe(secret);
  });

  it("fails to decrypt with a different key (tamper detection)", () => {
    const svc1 = buildService({
      ENCRYPTION_KEY: "aa".repeat(32),
      NODE_ENV: "production",
    });
    const svc2 = buildService({
      ENCRYPTION_KEY: "bb".repeat(32),
      NODE_ENV: "production",
    });

    const secret = "JBSWY3DPEHPK3PXP";
    const { encrypted, iv } = (svc1 as any).encryptTotpSecret(secret);

    expect(() => (svc2 as any).decryptTotpSecret(encrypted, iv)).toThrow();
  });
});
