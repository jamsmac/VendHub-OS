import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { ObjectLiteral, Repository } from "typeorm";
import { InvestorService } from "./investor.service";
import { InvestorProfile } from "./entities/investor-profile.entity";
import { DividendPayment } from "./entities/dividend-payment.entity";
import { Machine } from "../machines/entities/machine.entity";
import { Transaction } from "../transactions/entities/transaction.entity";

// ----- Mock factory --------------------------------------------------------
type MockRepository<T extends ObjectLiteral = ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepository = <
  T extends ObjectLiteral = ObjectLiteral,
>(): MockRepository<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
});

// ----- Constants -----------------------------------------------------------
const ORG_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const PROFILE_ID = "33333333-3333-3333-3333-333333333333";

// ----- Suite ---------------------------------------------------------------
describe("InvestorService", () => {
  let service: InvestorService;
  let profileRepo: MockRepository<InvestorProfile>;
  let dividendRepo: MockRepository<DividendPayment>;
  let machineRepo: MockRepository<Machine>;
  let transactionRepo: MockRepository<Transaction>;

  // createQueryBuilder chain mock — reused across getDashboard tests
  let qb: Record<string, jest.Mock>;

  beforeEach(async () => {
    profileRepo = createMockRepository<InvestorProfile>();
    dividendRepo = createMockRepository<DividendPayment>();
    machineRepo = createMockRepository<Machine>();
    transactionRepo = createMockRepository<Transaction>();

    // Build a chainable query-builder mock
    qb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: "0" }),
    };
    (transactionRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestorService,
        {
          provide: getRepositoryToken(InvestorProfile),
          useValue: profileRepo,
        },
        {
          provide: getRepositoryToken(DividendPayment),
          useValue: dividendRepo,
        },
        { provide: getRepositoryToken(Machine), useValue: machineRepo },
        { provide: getRepositoryToken(Transaction), useValue: transactionRepo },
      ],
    }).compile();

    service = module.get<InvestorService>(InvestorService);
  });

  afterEach(() => jest.clearAllMocks());

  // =========================================================================
  // findProfile
  // =========================================================================
  describe("findProfile", () => {
    it("returns profile when found", async () => {
      const profile = {
        id: PROFILE_ID,
        organizationId: ORG_ID,
        userId: USER_ID,
      } as InvestorProfile;
      (profileRepo.findOne as jest.Mock).mockResolvedValue(profile);

      const result = await service.findProfile(ORG_ID, USER_ID);

      expect(profileRepo.findOne).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID, userId: USER_ID },
      });
      expect(result).toEqual(profile);
    });

    it("returns null when profile does not exist", async () => {
      (profileRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findProfile(ORG_ID, USER_ID);

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // findAllProfiles
  // =========================================================================
  describe("findAllProfiles", () => {
    it("returns profiles ordered by sharePercent DESC", async () => {
      const profiles = [
        { id: "p1", sharePercent: 60 },
        { id: "p2", sharePercent: 40 },
      ] as InvestorProfile[];
      (profileRepo.find as jest.Mock).mockResolvedValue(profiles);

      const result = await service.findAllProfiles(ORG_ID);

      expect(profileRepo.find).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
        order: { sharePercent: "DESC" },
      });
      expect(result).toEqual(profiles);
    });

    it("returns empty array when no profiles exist", async () => {
      (profileRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.findAllProfiles(ORG_ID);

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // createProfile
  // =========================================================================
  describe("createProfile", () => {
    it("creates and saves profile with all fields", async () => {
      const dto = {
        name: "Investment Fund Alpha",
        sharePercent: 15,
        totalInvested: 500_000_000,
        paybackMonths: 24,
        notes: "Strategic investor",
      };
      const created = { id: PROFILE_ID, ...dto } as InvestorProfile;
      (profileRepo.create as jest.Mock).mockReturnValue(created);
      (profileRepo.save as jest.Mock).mockResolvedValue(created);

      const result = await service.createProfile(ORG_ID, USER_ID, dto);

      expect(profileRepo.create).toHaveBeenCalledWith({
        organizationId: ORG_ID,
        userId: USER_ID,
        name: dto.name,
        sharePercent: dto.sharePercent,
        totalInvested: dto.totalInvested,
        paybackMonths: dto.paybackMonths,
        notes: dto.notes,
        createdById: USER_ID,
      });
      expect(profileRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it("defaults paybackMonths and notes to null when omitted", async () => {
      const dto = { name: "Fund B", sharePercent: 10, totalInvested: 100_000 };
      const created = {
        id: PROFILE_ID,
        ...dto,
        paybackMonths: null,
        notes: null,
      } as unknown as InvestorProfile;
      (profileRepo.create as jest.Mock).mockReturnValue(created);
      (profileRepo.save as jest.Mock).mockResolvedValue(created);

      await service.createProfile(ORG_ID, USER_ID, dto);

      expect(profileRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ paybackMonths: null, notes: null }),
      );
    });
  });

  // =========================================================================
  // updateProfile
  // =========================================================================
  describe("updateProfile", () => {
    it("throws NotFoundException when profile not found", async () => {
      (profileRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateProfile(PROFILE_ID, ORG_ID, { name: "New Name" }),
      ).rejects.toThrow(NotFoundException);

      expect(profileRepo.save).not.toHaveBeenCalled();
    });

    it("applies partial update and saves profile", async () => {
      const existing = {
        id: PROFILE_ID,
        organizationId: ORG_ID,
        name: "Old Name",
        sharePercent: 10,
      } as InvestorProfile;
      const saved = { ...existing, name: "New Name" } as InvestorProfile;
      (profileRepo.findOne as jest.Mock).mockResolvedValue(existing);
      (profileRepo.save as jest.Mock).mockResolvedValue(saved);

      const result = await service.updateProfile(PROFILE_ID, ORG_ID, {
        name: "New Name",
      });

      expect(profileRepo.findOne).toHaveBeenCalledWith({
        where: { id: PROFILE_ID, organizationId: ORG_ID },
      });
      expect(profileRepo.save).toHaveBeenCalled();
      expect(result.name).toBe("New Name");
    });

    it("looks up profile by organizationId to enforce tenant isolation", async () => {
      (profileRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateProfile(PROFILE_ID, "other-org", { status: "inactive" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // getDashboard
  // =========================================================================
  describe("getDashboard", () => {
    const makeProfile = (
      sharePercent: string,
      totalInvested: string,
    ): InvestorProfile =>
      ({
        id: PROFILE_ID,
        organizationId: ORG_ID,
        userId: USER_ID,
        sharePercent,
        totalInvested,
      }) as unknown as InvestorProfile;

    it("throws NotFoundException when investor profile not found", async () => {
      (profileRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getDashboard(ORG_ID, USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("returns correct KPI values for typical scenario", async () => {
      (profileRepo.findOne as jest.Mock).mockResolvedValue(
        makeProfile("20", "500000"),
      );
      (machineRepo.count as jest.Mock).mockResolvedValue(10);
      qb.getRawOne.mockResolvedValue({ total: "1000000" });
      (dividendRepo.find as jest.Mock).mockResolvedValue([
        { amount: "50000" } as unknown as DividendPayment,
        { amount: "30000" } as unknown as DividendPayment,
      ]);

      const result = await service.getDashboard(ORG_ID, USER_ID);

      expect(result.kpis.totalRevenue).toBe(1_000_000);
      expect(result.kpis.netProfit).toBe(Math.round(1_000_000 * 0.63));
      expect(result.kpis.totalMachines).toBe(10);
      expect(result.kpis.avgTransactionsPerDay).toBe(0); // placeholder
      expect(result.kpis.avgCheck).toBe(0); // placeholder
      expect(result.totalDividends).toBe(80_000);
    });

    it("calculates currentValue, totalReturn and roiPercent correctly", async () => {
      // sharePercent=10, totalInvested=1_000_000, revenue=2_000_000, dividends=100_000
      (profileRepo.findOne as jest.Mock).mockResolvedValue(
        makeProfile("10", "1000000"),
      );
      (machineRepo.count as jest.Mock).mockResolvedValue(5);
      qb.getRawOne.mockResolvedValue({ total: "2000000" });
      (dividendRepo.find as jest.Mock).mockResolvedValue([
        { amount: "100000" } as unknown as DividendPayment,
      ]);

      const result = await service.getDashboard(ORG_ID, USER_ID);

      // currentValue = round((2_000_000 * 10 / 100) + 1_000_000) = 1_200_000
      expect(result.currentValue).toBe(1_200_000);
      // totalReturn = 1_200_000 - 1_000_000 + 100_000 = 300_000
      expect(result.totalReturn).toBe(300_000);
      // roiPercent = (300_000 / 1_000_000) * 100 = 30.0
      expect(result.roiPercent).toBe(30.0);
    });

    it("returns roiPercent=0 when totalInvested is zero (no division by zero)", async () => {
      (profileRepo.findOne as jest.Mock).mockResolvedValue(
        makeProfile("0", "0"),
      );
      (machineRepo.count as jest.Mock).mockResolvedValue(0);
      qb.getRawOne.mockResolvedValue({ total: "0" });
      (dividendRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getDashboard(ORG_ID, USER_ID);

      expect(result.roiPercent).toBe(0);
    });

    it("treats null revenue query result as 0", async () => {
      (profileRepo.findOne as jest.Mock).mockResolvedValue(
        makeProfile("15", "500000"),
      );
      (machineRepo.count as jest.Mock).mockResolvedValue(3);
      qb.getRawOne.mockResolvedValue(null); // DB returned nothing
      (dividendRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getDashboard(ORG_ID, USER_ID);

      expect(result.kpis.totalRevenue).toBe(0);
    });

    it("calls createQueryBuilder with correct alias and WHERE clause", async () => {
      (profileRepo.findOne as jest.Mock).mockResolvedValue(
        makeProfile("5", "100000"),
      );
      (machineRepo.count as jest.Mock).mockResolvedValue(1);
      qb.getRawOne.mockResolvedValue({ total: "50000" });
      (dividendRepo.find as jest.Mock).mockResolvedValue([]);

      await service.getDashboard(ORG_ID, USER_ID);

      expect(transactionRepo.createQueryBuilder).toHaveBeenCalledWith("t");
      expect(qb.select).toHaveBeenCalledWith(
        "COALESCE(SUM(t.amount), 0)",
        "total",
      );
      expect(qb.where).toHaveBeenCalledWith(
        "t.organizationId = :organizationId",
        { organizationId: ORG_ID },
      );
    });

    it("fetches dividends for the specific investor profile", async () => {
      (profileRepo.findOne as jest.Mock).mockResolvedValue(
        makeProfile("5", "100000"),
      );
      (machineRepo.count as jest.Mock).mockResolvedValue(1);
      qb.getRawOne.mockResolvedValue({ total: "0" });
      (dividendRepo.find as jest.Mock).mockResolvedValue([]);

      await service.getDashboard(ORG_ID, USER_ID);

      expect(dividendRepo.find).toHaveBeenCalledWith({
        where: { investorProfileId: PROFILE_ID },
        order: { paymentDate: "DESC" },
      });
    });

    it("includes profile and dividends in returned object", async () => {
      const profile = makeProfile("20", "500000");
      const dividends = [{ id: "d1" } as DividendPayment];
      (profileRepo.findOne as jest.Mock).mockResolvedValue(profile);
      (machineRepo.count as jest.Mock).mockResolvedValue(2);
      qb.getRawOne.mockResolvedValue({ total: "200000" });
      (dividendRepo.find as jest.Mock).mockResolvedValue(dividends);

      const result = await service.getDashboard(ORG_ID, USER_ID);

      expect(result.profile).toEqual(profile);
      expect(result.dividends).toEqual(dividends);
    });
  });

  // =========================================================================
  // createDividend
  // =========================================================================
  describe("createDividend", () => {
    it("creates and saves dividend with all fields", async () => {
      const dto = {
        investorProfileId: PROFILE_ID,
        period: "Q1 2026",
        paymentDate: "2026-04-01",
        amount: 15_000_000,
        notes: "Q1 payout",
      };
      const created = {
        id: "div-uuid",
        ...dto,
      } as unknown as DividendPayment;
      (dividendRepo.create as jest.Mock).mockReturnValue(created);
      (dividendRepo.save as jest.Mock).mockResolvedValue(created);

      const result = await service.createDividend(ORG_ID, USER_ID, dto);

      expect(dividendRepo.create).toHaveBeenCalledWith({
        organizationId: ORG_ID,
        investorProfileId: dto.investorProfileId,
        period: dto.period,
        paymentDate: new Date(dto.paymentDate),
        amount: dto.amount,
        notes: dto.notes,
        createdById: USER_ID,
      });
      expect(dividendRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it("sets notes to null when omitted", async () => {
      const dto = {
        investorProfileId: PROFILE_ID,
        period: "Q2 2026",
        paymentDate: "2026-07-01",
        amount: 10_000_000,
      };
      const created = {
        id: "div-uuid",
        notes: null,
      } as unknown as DividendPayment;
      (dividendRepo.create as jest.Mock).mockReturnValue(created);
      (dividendRepo.save as jest.Mock).mockResolvedValue(created);

      await service.createDividend(ORG_ID, USER_ID, dto);

      expect(dividendRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ notes: null }),
      );
    });

    it("converts paymentDate string to Date object", async () => {
      const paymentDate = "2026-04-01";
      const dto = {
        investorProfileId: PROFILE_ID,
        period: "Q1 2026",
        paymentDate,
        amount: 5_000_000,
      };
      const created = {} as DividendPayment;
      (dividendRepo.create as jest.Mock).mockReturnValue(created);
      (dividendRepo.save as jest.Mock).mockResolvedValue(created);

      await service.createDividend(ORG_ID, USER_ID, dto);

      const callArg = (dividendRepo.create as jest.Mock).mock.calls[0][0];
      expect(callArg.paymentDate).toEqual(new Date(paymentDate));
      expect(callArg.paymentDate).toBeInstanceOf(Date);
    });
  });

  // =========================================================================
  // findDividends
  // =========================================================================
  describe("findDividends", () => {
    it("returns dividends ordered by paymentDate DESC", async () => {
      const dividends = [
        { id: "d1", paymentDate: new Date("2026-04-01") } as DividendPayment,
        { id: "d2", paymentDate: new Date("2026-01-01") } as DividendPayment,
      ];
      (dividendRepo.find as jest.Mock).mockResolvedValue(dividends);

      const result = await service.findDividends(PROFILE_ID);

      expect(dividendRepo.find).toHaveBeenCalledWith({
        where: { investorProfileId: PROFILE_ID },
        order: { paymentDate: "DESC" },
      });
      expect(result).toEqual(dividends);
    });

    it("returns empty array when no dividends exist", async () => {
      (dividendRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.findDividends(PROFILE_ID);

      expect(result).toEqual([]);
    });

    it("filters dividends strictly by investorProfileId", async () => {
      (dividendRepo.find as jest.Mock).mockResolvedValue([]);

      await service.findDividends(PROFILE_ID);

      expect(dividendRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { investorProfileId: PROFILE_ID },
        }),
      );
    });
  });
});
