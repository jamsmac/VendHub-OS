import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "@/lib/store";

describe("useCartStore", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], machine: null });
  });

  const mockItem = {
    id: "item-1",
    productId: "prod-1",
    productName: "Americano",
    price: 15000,
    imageUrl: "/coffee.jpg",
    category: "Coffee",
  };

  const mockMachine = {
    id: "machine-1",
    name: "VM-001",
    address: "Tashkent, Amir Temur 1",
  };

  // ── addItem ──────────────────────────────────────────────────────────────
  describe("addItem", () => {
    it("adds a new item with quantity 1", () => {
      useCartStore.getState().addItem(mockItem);
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].productName).toBe("Americano");
      expect(items[0].quantity).toBe(1);
    });

    it("increments quantity when adding same product", () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().addItem(mockItem);
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(2);
    });

    it("adds different products as separate items", () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore
        .getState()
        .addItem({
          ...mockItem,
          id: "item-2",
          productId: "prod-2",
          productName: "Latte",
        });
      expect(useCartStore.getState().items).toHaveLength(2);
    });
  });

  // ── removeItem ───────────────────────────────────────────────────────────
  describe("removeItem", () => {
    it("removes item by id", () => {
      useCartStore.getState().addItem(mockItem);
      const itemId = useCartStore.getState().items[0].id;
      useCartStore.getState().removeItem(itemId);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it("does nothing for non-existent id", () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().removeItem("non-existent");
      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  // ── updateQuantity ───────────────────────────────────────────────────────
  describe("updateQuantity", () => {
    it("updates quantity for existing item", () => {
      useCartStore.getState().addItem(mockItem);
      const itemId = useCartStore.getState().items[0].id;
      useCartStore.getState().updateQuantity(itemId, 5);
      expect(useCartStore.getState().items[0].quantity).toBe(5);
    });

    it("caps quantity at 10", () => {
      useCartStore.getState().addItem(mockItem);
      const itemId = useCartStore.getState().items[0].id;
      useCartStore.getState().updateQuantity(itemId, 15);
      expect(useCartStore.getState().items[0].quantity).toBe(10);
    });

    it("removes item when quantity is 0", () => {
      useCartStore.getState().addItem(mockItem);
      const itemId = useCartStore.getState().items[0].id;
      useCartStore.getState().updateQuantity(itemId, 0);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it("removes item when quantity is negative", () => {
      useCartStore.getState().addItem(mockItem);
      const itemId = useCartStore.getState().items[0].id;
      useCartStore.getState().updateQuantity(itemId, -1);
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  // ── clearCart ─────────────────────────────────────────────────────────────
  describe("clearCart", () => {
    it("removes all items and machine", () => {
      useCartStore.getState().setMachine(mockMachine);
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().clearCart();
      expect(useCartStore.getState().items).toHaveLength(0);
      expect(useCartStore.getState().machine).toBeNull();
    });
  });

  // ── setMachine ───────────────────────────────────────────────────────────
  describe("setMachine", () => {
    it("sets machine", () => {
      useCartStore.getState().setMachine(mockMachine);
      expect(useCartStore.getState().machine).toEqual(mockMachine);
    });

    it("clears cart when switching to different machine", () => {
      useCartStore.getState().setMachine(mockMachine);
      useCartStore.getState().addItem(mockItem);
      useCartStore
        .getState()
        .setMachine({ id: "machine-2", name: "VM-002", address: "Samarkand" });
      expect(useCartStore.getState().items).toHaveLength(0);
      expect(useCartStore.getState().machine?.id).toBe("machine-2");
    });

    it("keeps cart when setting same machine", () => {
      useCartStore.getState().setMachine(mockMachine);
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().setMachine(mockMachine);
      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  // ── computed ─────────────────────────────────────────────────────────────
  describe("computed values", () => {
    it("getTotalItems sums quantities", () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().addItem(mockItem); // qty = 2
      useCartStore
        .getState()
        .addItem({
          ...mockItem,
          id: "item-2",
          productId: "prod-2",
          productName: "Latte",
        }); // qty = 1
      expect(useCartStore.getState().getTotalItems()).toBe(3);
    });

    it("getSubtotal calculates price * quantity", () => {
      useCartStore.getState().addItem(mockItem); // 15000 x 1
      useCartStore.getState().addItem(mockItem); // 15000 x 2
      useCartStore.getState().addItem({
        ...mockItem,
        id: "item-2",
        productId: "prod-2",
        productName: "Latte",
        price: 20000,
      }); // 20000 x 1
      expect(useCartStore.getState().getSubtotal()).toBe(50000);
    });

    it("returns 0 for empty cart", () => {
      expect(useCartStore.getState().getTotalItems()).toBe(0);
      expect(useCartStore.getState().getSubtotal()).toBe(0);
    });
  });
});
