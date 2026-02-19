import {
  formatCurrency,
  formatDate,
  formatDateShort,
  getMachineStatusEmoji,
  getMachineStatusText,
  getTierEmoji,
  getTierName,
  getOrderStatusEmoji,
  getOrderStatusText,
  formatWelcomeMessage,
  formatHelpMessage,
  formatLoyaltyMessage,
  formatMachinesList,
  formatMachineInfo,
  formatQuestsList,
  formatOrdersList,
  formatCart,
  formatReferralMessage,
  formatSupportMessage,
  escapeMarkdown,
  truncate,
} from "../utils/formatters";
import type { LoyaltyInfo, Machine, Quest, Order, CartItem } from "../types";

// ============================================
// formatCurrency
// ============================================

describe("formatCurrency", () => {
  it("formats amount with default currency UZS", () => {
    expect(formatCurrency(15000)).toContain("15");
    expect(formatCurrency(15000)).toContain("UZS");
  });

  it("formats amount with custom currency", () => {
    expect(formatCurrency(100, "USD")).toContain("USD");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toContain("0");
  });

  it("handles large numbers with locale grouping", () => {
    const result = formatCurrency(1500000);
    // Russian locale uses space or nbsp as thousand separator
    expect(result).toContain("UZS");
  });
});

// ============================================
// formatDate / formatDateShort
// ============================================

describe("formatDate", () => {
  it("formats ISO date string", () => {
    const result = formatDate("2025-03-15T14:30:00Z");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });
});

describe("formatDateShort", () => {
  it("formats ISO date string short", () => {
    const result = formatDateShort("2025-06-20T00:00:00Z");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });
});

// ============================================
// Machine Status
// ============================================

describe("getMachineStatusEmoji", () => {
  it("returns green for online", () => {
    expect(getMachineStatusEmoji("online")).toBe("🟢");
  });

  it("returns red for offline", () => {
    expect(getMachineStatusEmoji("offline")).toBe("🔴");
  });

  it("returns yellow for maintenance", () => {
    expect(getMachineStatusEmoji("maintenance")).toBe("🟡");
  });

  it("returns default for unknown status", () => {
    expect(getMachineStatusEmoji("unknown")).toBe("⚪");
  });
});

describe("getMachineStatusText", () => {
  it("returns Russian text for known statuses", () => {
    expect(getMachineStatusText("online")).toBe("Работает");
    expect(getMachineStatusText("offline")).toBe("Не работает");
    expect(getMachineStatusText("maintenance")).toBe("Обслуживание");
  });

  it('returns "Неизвестно" for unknown status', () => {
    expect(getMachineStatusText("broken")).toBe("Неизвестно");
  });
});

// ============================================
// Loyalty Tier
// ============================================

describe("getTierEmoji", () => {
  it("returns correct emoji for each tier", () => {
    expect(getTierEmoji("basic")).toBe("🥉");
    expect(getTierEmoji("silver")).toBe("🥈");
    expect(getTierEmoji("gold")).toBe("🥇");
    expect(getTierEmoji("platinum")).toBe("💎");
  });

  it("returns default emoji for unknown tier", () => {
    expect(getTierEmoji("diamond")).toBe("🎖");
  });
});

describe("getTierName", () => {
  it("returns Russian name for each tier", () => {
    expect(getTierName("basic")).toBe("Базовый");
    expect(getTierName("silver")).toBe("Серебряный");
    expect(getTierName("gold")).toBe("Золотой");
    expect(getTierName("platinum")).toBe("Платиновый");
  });

  it("returns raw tier name for unknown tier", () => {
    expect(getTierName("diamond")).toBe("diamond");
  });
});

// ============================================
// Order Status
// ============================================

describe("getOrderStatusEmoji", () => {
  it("returns correct emoji for each status", () => {
    expect(getOrderStatusEmoji("pending")).toBe("⏳");
    expect(getOrderStatusEmoji("processing")).toBe("🔄");
    expect(getOrderStatusEmoji("ready")).toBe("✅");
    expect(getOrderStatusEmoji("completed")).toBe("✔️");
    expect(getOrderStatusEmoji("cancelled")).toBe("❌");
  });

  it("returns question mark for unknown status", () => {
    expect(getOrderStatusEmoji("mystery")).toBe("❓");
  });
});

describe("getOrderStatusText", () => {
  it("returns Russian text for each status", () => {
    expect(getOrderStatusText("pending")).toBe("Ожидает оплаты");
    expect(getOrderStatusText("completed")).toBe("Завершён");
    expect(getOrderStatusText("cancelled")).toBe("Отменён");
  });

  it("returns raw status for unknown", () => {
    expect(getOrderStatusText("mystery")).toBe("mystery");
  });
});

// ============================================
// Message Templates
// ============================================

describe("formatWelcomeMessage", () => {
  it("includes user name", () => {
    const result = formatWelcomeMessage("Алексей");
    expect(result).toContain("Алексей");
    expect(result).toContain("VendHub");
  });
});

describe("formatHelpMessage", () => {
  it("includes all main commands", () => {
    const result = formatHelpMessage();
    expect(result).toContain("/start");
    expect(result).toContain("/find");
    expect(result).toContain("/points");
    expect(result).toContain("/cart");
  });
});

describe("formatLoyaltyMessage", () => {
  const loyalty: LoyaltyInfo = {
    points: 2500,
    lifetimePoints: 10000,
    tier: "silver",
    tierName: "Серебряный",
    cashbackPercent: 3,
    pointsToNextTier: 2500,
  };

  it("includes points and tier info", () => {
    const result = formatLoyaltyMessage(loyalty);
    expect(result).toContain("2");
    expect(result).toContain("Серебряный");
    expect(result).toContain("3%");
  });
});

// ============================================
// Machines List
// ============================================

describe("formatMachinesList", () => {
  it("returns empty message for no machines", () => {
    const result = formatMachinesList([]);
    expect(result).toContain("не найдено");
  });

  it("lists up to 5 machines", () => {
    const machines: Machine[] = Array.from({ length: 7 }, (_, i) => ({
      id: `m${i}`,
      name: `Автомат ${i + 1}`,
      serialNumber: `SN${i}`,
      address: `Адрес ${i + 1}`,
      city: "Ташкент",
      latitude: 41.3,
      longitude: 69.3,
      status: "online" as const,
      distance: (i + 1) * 100,
    }));

    const result = formatMachinesList(machines);
    expect(result).toContain("Автомат 1");
    expect(result).toContain("Автомат 5");
    expect(result).not.toContain("Автомат 6");
    expect(result).toContain("7"); // total count
  });
});

describe("formatMachineInfo", () => {
  it("formats single machine info", () => {
    const machine: Machine = {
      id: "m1",
      name: "Автомат Навои",
      serialNumber: "SN001",
      address: "ул. Навои 10",
      city: "Ташкент",
      latitude: 41.3,
      longitude: 69.3,
      status: "online",
      productsCount: 42,
    };

    const result = formatMachineInfo(machine);
    expect(result).toContain("Автомат Навои");
    expect(result).toContain("ул. Навои 10");
    expect(result).toContain("Ташкент");
    expect(result).toContain("42");
  });
});

// ============================================
// Quests
// ============================================

describe("formatQuestsList", () => {
  it("returns empty message for no quests", () => {
    const result = formatQuestsList([]);
    expect(result).toContain("нет активных заданий");
  });

  it("formats quests with progress", () => {
    const quests: Quest[] = [
      {
        id: "q1",
        title: "Купи 5 кофе",
        description: "Купите 5 чашек кофе",
        reward: 500,
        progress: 3,
        target: 5,
        completed: false,
      },
    ];

    const result = formatQuestsList(quests);
    expect(result).toContain("Купи 5 кофе");
    expect(result).toContain("60%");
    expect(result).toContain("500");
  });
});

// ============================================
// Orders
// ============================================

describe("formatOrdersList", () => {
  it("returns empty message for no orders", () => {
    expect(formatOrdersList([])).toContain("нет покупок");
  });

  it("formats orders list", () => {
    const orders: Order[] = [
      {
        id: "o1",
        orderNumber: "V-1234",
        status: "completed",
        totalAmount: 25000,
        pointsEarned: 250,
        items: [
          { productId: "p1", productName: "Кофе", quantity: 2, price: 12500 },
        ],
        createdAt: "2025-03-10T12:00:00Z",
      },
    ];

    const result = formatOrdersList(orders);
    expect(result).toContain("V-1234");
    expect(result).toContain("2"); // items count
  });
});

// ============================================
// Cart
// ============================================

describe("formatCart", () => {
  it("returns empty cart message", () => {
    expect(formatCart([])).toContain("пуста");
    expect(formatCart(null as unknown as CartItem[])).toContain("пуста");
  });

  it("formats cart with items and total", () => {
    const cart: CartItem[] = [
      { productId: "p1", name: "Латте", price: 15000, quantity: 2 },
      { productId: "p2", name: "Круассан", price: 10000, quantity: 1 },
    ];

    const result = formatCart(cart);
    expect(result).toContain("Латте");
    expect(result).toContain("Круассан");
    expect(result).toContain("Итого");
  });
});

// ============================================
// Referral / Support
// ============================================

describe("formatReferralMessage", () => {
  it("includes referral code and link", () => {
    const result = formatReferralMessage(
      "ABC123",
      "https://t.me/vendhub_bot?start=ABC123",
      5,
    );
    expect(result).toContain("ABC123");
    expect(result).toContain("https://t.me/vendhub_bot?start=ABC123");
    expect(result).toContain("5");
  });
});

describe("formatSupportMessage", () => {
  it("includes all contact info", () => {
    const result = formatSupportMessage(
      "vendhub_support",
      "help@vendhub.uz",
      "+998901234567",
    );
    expect(result).toContain("vendhub_support");
    expect(result).toContain("help@vendhub.uz");
    expect(result).toContain("+998901234567");
  });
});

// ============================================
// Helpers
// ============================================

describe("escapeMarkdown", () => {
  it("escapes special Telegram MarkdownV2 characters", () => {
    expect(escapeMarkdown("hello_world")).toContain("\\");
    expect(escapeMarkdown("test*bold*")).toContain("\\*");
    expect(escapeMarkdown("no special")).toBe("no special");
  });
});

describe("truncate", () => {
  it("returns full text if shorter than maxLength", () => {
    expect(truncate("hello", 100)).toBe("hello");
  });

  it("truncates with ellipsis", () => {
    const result = truncate("a very long text that should be truncated", 20);
    expect(result).toHaveLength(20);
    expect(result.endsWith("...")).toBe(true);
  });

  it("uses default maxLength of 100", () => {
    const longText = "x".repeat(200);
    const result = truncate(longText);
    expect(result).toHaveLength(100);
  });
});
