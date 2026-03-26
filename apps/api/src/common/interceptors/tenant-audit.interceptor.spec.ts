import { TenantAuditInterceptor } from "./tenant-audit.interceptor";
import { CallHandler, ExecutionContext } from "@nestjs/common";
import { of } from "rxjs";
import { ClsService } from "nestjs-cls";

describe("TenantAuditInterceptor", () => {
  let interceptor: TenantAuditInterceptor;
  let cls: jest.Mocked<ClsService>;
  let warnSpy: jest.SpyInstance;

  const mockContext = {
    getHandler: () => ({ name: "findAll" }),
    getClass: () => ({ name: "MachinesController" }),
    switchToHttp: () => ({ getRequest: () => ({}) }),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    cls = { get: jest.fn() } as unknown as jest.Mocked<ClsService>;
    interceptor = new TenantAuditInterceptor(cls);
    warnSpy = jest.spyOn(
      (interceptor as unknown as { logger: { warn: jest.Mock } }).logger,
      "warn",
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it("passes through when no organizationId in CLS", (done) => {
    cls.get.mockReturnValue(undefined);
    const next: CallHandler = { handle: () => of([{ id: "1" }]) };

    interceptor.intercept(mockContext, next).subscribe({
      next: (val) => expect(val).toEqual([{ id: "1" }]),
      complete: done,
    });
  });

  it("does not warn when organizationId matches", (done) => {
    cls.get.mockReturnValue("org-1");
    const data = [{ id: "1", organizationId: "org-1" }];
    const next: CallHandler = { handle: () => of(data) };

    interceptor.intercept(mockContext, next).subscribe({
      next: () => expect(warnSpy).not.toHaveBeenCalled(),
      complete: done,
    });
  });

  it("warns when response contains different organizationId", (done) => {
    cls.get.mockReturnValue("org-1");
    const data = [{ id: "1", organizationId: "org-OTHER" }];
    const next: CallHandler = { handle: () => of(data) };

    interceptor.intercept(mockContext, next).subscribe({
      next: () => {
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining("TENANT VIOLATION"),
        );
      },
      complete: done,
    });
  });

  it("audits paginated response { data: [...] }", (done) => {
    cls.get.mockReturnValue("org-1");
    const data = { data: [{ id: "1", organizationId: "org-OTHER" }], total: 1 };
    const next: CallHandler = { handle: () => of(data) };

    interceptor.intercept(mockContext, next).subscribe({
      next: () => {
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining("TENANT VIOLATION"),
        );
      },
      complete: done,
    });
  });

  it("does not warn for items without organizationId field", (done) => {
    cls.get.mockReturnValue("org-1");
    const data = [{ id: "1", name: "test" }];
    const next: CallHandler = { handle: () => of(data) };

    interceptor.intercept(mockContext, next).subscribe({
      next: () => expect(warnSpy).not.toHaveBeenCalled(),
      complete: done,
    });
  });
});
