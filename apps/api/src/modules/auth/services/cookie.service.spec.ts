/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { CookieService } from "./cookie.service";

describe("CookieService", () => {
  /**
   * Helper to build a CookieService with the given env overrides.
   */
  async function createService(
    envOverrides: Record<string, any> = {},
  ): Promise<CookieService> {
    const configValues: Record<string, any> = {
      NODE_ENV: "development",
      COOKIE_DOMAIN: "",
      COOKIE_SAME_SITE: "lax",
      COOKIE_PATH: "/",
      JWT_ACCESS_EXPIRES: "15m",
      SESSION_DURATION_DAYS: 7,
      ...envOverrides,
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        return key in configValues ? configValues[key] : defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CookieService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    return module.get<CookieService>(CookieService);
  }

  function mockResponse(): any {
    return {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  }

  function mockRequest(cookies: Record<string, string> = {}): any {
    return { cookies };
  }

  // ---------- Initialisation ----------

  it("should be defined", async () => {
    const service = await createService();
    expect(service).toBeDefined();
  });

  // ---------- setTokenCookies ----------

  describe("setTokenCookies", () => {
    it("should set access and refresh token cookies on the response", async () => {
      const service = await createService();
      const res = mockResponse();

      service.setTokenCookies(res, "access-tok", "refresh-tok");

      expect(res.cookie).toHaveBeenCalledTimes(2);

      // Access token cookie
      expect(res.cookie).toHaveBeenCalledWith(
        "vhub_access_token",
        "access-tok",
        expect.objectContaining({
          httpOnly: true,
          path: "/",
        }),
      );

      // Refresh token cookie
      expect(res.cookie).toHaveBeenCalledWith(
        "vhub_refresh_token",
        "refresh-tok",
        expect.objectContaining({
          httpOnly: true,
          path: "/",
        }),
      );
    });

    it("should set correct maxAge for access token (15m = 900000ms)", async () => {
      const service = await createService({ JWT_ACCESS_EXPIRES: "15m" });
      const res = mockResponse();

      service.setTokenCookies(res, "a", "r");

      const accessCall = res.cookie.mock.calls.find(
        (c: any[]) => c[0] === "vhub_access_token",
      );
      expect(accessCall[2].maxAge).toBe(15 * 60 * 1000);
    });

    it("should set correct maxAge for refresh token (7 days)", async () => {
      const service = await createService({ SESSION_DURATION_DAYS: 7 });
      const res = mockResponse();

      service.setTokenCookies(res, "a", "r");

      const refreshCall = res.cookie.mock.calls.find(
        (c: any[]) => c[0] === "vhub_refresh_token",
      );
      expect(refreshCall[2].maxAge).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  // ---------- clearTokenCookies ----------

  describe("clearTokenCookies", () => {
    it("should clear both access and refresh cookies", async () => {
      const service = await createService();
      const res = mockResponse();

      service.clearTokenCookies(res);

      expect(res.clearCookie).toHaveBeenCalledTimes(2);
      expect(res.clearCookie).toHaveBeenCalledWith(
        "vhub_access_token",
        expect.objectContaining({ maxAge: 0 }),
      );
      expect(res.clearCookie).toHaveBeenCalledWith(
        "vhub_refresh_token",
        expect.objectContaining({ maxAge: 0 }),
      );
    });
  });

  // ---------- getAccessTokenFromCookie / getRefreshTokenFromCookie ----------

  describe("getAccessTokenFromCookie", () => {
    it("should return the access token when present", async () => {
      const service = await createService();
      const req = mockRequest({ vhub_access_token: "my-access" });

      expect(service.getAccessTokenFromCookie(req)).toBe("my-access");
    });

    it("should return null when cookie is missing", async () => {
      const service = await createService();
      const req = mockRequest({});

      expect(service.getAccessTokenFromCookie(req)).toBeNull();
    });

    it("should return null when cookies object is undefined", async () => {
      const service = await createService();
      const req = { cookies: undefined } as any;

      expect(service.getAccessTokenFromCookie(req)).toBeNull();
    });
  });

  describe("getRefreshTokenFromCookie", () => {
    it("should return the refresh token when present", async () => {
      const service = await createService();
      const req = mockRequest({ vhub_refresh_token: "my-refresh" });

      expect(service.getRefreshTokenFromCookie(req)).toBe("my-refresh");
    });

    it("should return null when cookie is missing", async () => {
      const service = await createService();
      const req = mockRequest({});

      expect(service.getRefreshTokenFromCookie(req)).toBeNull();
    });
  });

  // ---------- Production vs Development ----------

  describe("production configuration", () => {
    it("should default secure=true in production", async () => {
      const service = await createService({ NODE_ENV: "production" });
      const res = mockResponse();

      service.setTokenCookies(res, "a", "r");

      const opts = res.cookie.mock.calls[0][2];
      expect(opts.secure).toBe(true);
    });

    it("should default secure=false in development", async () => {
      const service = await createService({ NODE_ENV: "development" });
      const res = mockResponse();

      service.setTokenCookies(res, "a", "r");

      const opts = res.cookie.mock.calls[0][2];
      expect(opts.secure).toBe(false);
    });

    it("should allow overriding secure via COOKIE_SECURE env", async () => {
      const service = await createService({
        NODE_ENV: "development",
        COOKIE_SECURE: "true",
      });
      const res = mockResponse();

      service.setTokenCookies(res, "a", "r");

      const opts = res.cookie.mock.calls[0][2];
      expect(opts.secure).toBe(true);
    });
  });

  // ---------- SameSite ----------

  describe("SameSite configuration", () => {
    it("should default to lax", async () => {
      const service = await createService();
      const res = mockResponse();

      service.setTokenCookies(res, "a", "r");

      expect(res.cookie.mock.calls[0][2].sameSite).toBe("lax");
    });

    it("should accept strict", async () => {
      const service = await createService({ COOKIE_SAME_SITE: "strict" });
      const res = mockResponse();

      service.setTokenCookies(res, "a", "r");

      expect(res.cookie.mock.calls[0][2].sameSite).toBe("strict");
    });

    it("should accept none", async () => {
      const service = await createService({ COOKIE_SAME_SITE: "none" });
      const res = mockResponse();

      service.setTokenCookies(res, "a", "r");

      expect(res.cookie.mock.calls[0][2].sameSite).toBe("none");
    });

    it("should fall back to lax for invalid SameSite value", async () => {
      const service = await createService({ COOKIE_SAME_SITE: "invalid" });
      const res = mockResponse();

      service.setTokenCookies(res, "a", "r");

      expect(res.cookie.mock.calls[0][2].sameSite).toBe("lax");
    });
  });

  // ---------- Domain ----------

  describe("cookie domain", () => {
    it("should omit domain property when COOKIE_DOMAIN is empty", async () => {
      const service = await createService({ COOKIE_DOMAIN: "" });
      const res = mockResponse();

      service.setTokenCookies(res, "a", "r");

      expect(res.cookie.mock.calls[0][2].domain).toBeUndefined();
    });

    it("should set domain when COOKIE_DOMAIN is provided", async () => {
      const service = await createService({ COOKIE_DOMAIN: ".vendhub.uz" });
      const res = mockResponse();

      service.setTokenCookies(res, "a", "r");

      expect(res.cookie.mock.calls[0][2].domain).toBe(".vendhub.uz");
    });
  });

  // ---------- Duration parsing ----------

  describe("duration parsing", () => {
    it("should parse seconds correctly", async () => {
      const service = await createService({ JWT_ACCESS_EXPIRES: "30s" });
      const res = mockResponse();

      service.setTokenCookies(res, "a", "r");

      const accessCall = res.cookie.mock.calls.find(
        (c: any[]) => c[0] === "vhub_access_token",
      );
      expect(accessCall[2].maxAge).toBe(30 * 1000);
    });

    it("should parse hours correctly", async () => {
      const service = await createService({ JWT_ACCESS_EXPIRES: "1h" });
      const res = mockResponse();

      service.setTokenCookies(res, "a", "r");

      const accessCall = res.cookie.mock.calls.find(
        (c: any[]) => c[0] === "vhub_access_token",
      );
      expect(accessCall[2].maxAge).toBe(60 * 60 * 1000);
    });

    it("should parse days correctly", async () => {
      const service = await createService({ JWT_ACCESS_EXPIRES: "2d" });
      const res = mockResponse();

      service.setTokenCookies(res, "a", "r");

      const accessCall = res.cookie.mock.calls.find(
        (c: any[]) => c[0] === "vhub_access_token",
      );
      expect(accessCall[2].maxAge).toBe(2 * 24 * 60 * 60 * 1000);
    });

    it("should default to 15 minutes for unrecognised duration format", async () => {
      const service = await createService({ JWT_ACCESS_EXPIRES: "invalid" });
      const res = mockResponse();

      service.setTokenCookies(res, "a", "r");

      const accessCall = res.cookie.mock.calls.find(
        (c: any[]) => c[0] === "vhub_access_token",
      );
      expect(accessCall[2].maxAge).toBe(15 * 60 * 1000);
    });
  });
});
