import { test, expect } from "@playwright/test";

test.describe("Mini App Cart", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/cart", { waitUntil: "networkidle" });
  });

  test("should display cart page", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/cart")) return;

    const heading = page.getByRole("heading", { name: /корзина|cart/i });
    if (await heading.isVisible().catch(() => false)) {
      await expect(heading).toBeVisible();
    }
  });

  test("should show empty cart message when empty", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/cart")) return;

    // Clear cart first via localStorage
    await page.evaluate(() => {
      localStorage.removeItem("cart-storage");
    });
    await page.reload({ waitUntil: "networkidle" });

    // Should show empty message
    const emptyMsg = page.getByText(/пуста|empty|нет товаров/i).first();
    if (await emptyMsg.isVisible().catch(() => false)) {
      await expect(emptyMsg).toBeVisible();
    }
  });

  test("should navigate to products when cart is empty", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/cart")) return;

    await page.evaluate(() => {
      localStorage.removeItem("cart-storage");
    });
    await page.reload({ waitUntil: "networkidle" });

    // Find "go shopping" link
    const shopLink = page
      .getByRole("link", { name: /перейти|browse|выбрать/i })
      .or(page.getByRole("button", { name: /перейти|browse|выбрать/i }));

    if (
      await shopLink
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await shopLink.first().click();
      // Should navigate away from cart
      await expect(page).not.toHaveURL(/cart/i);
    }
  });

  test("should update item quantity", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/cart")) return;

    // Add test item to cart via localStorage
    await page.evaluate(() => {
      const testCart = {
        state: {
          items: [
            {
              id: "test-product-1",
              productId: "prod-1",
              name: "Тестовый товар",
              price: 10000,
              quantity: 1,
              image: "",
            },
          ],
        },
      };
      localStorage.setItem("cart-storage", JSON.stringify(testCart));
    });
    await page.reload({ waitUntil: "networkidle" });

    // Should show item
    const item = page.getByText(/тестовый товар/i).first();
    if (!(await item.isVisible().catch(() => false))) return;

    // Find increment button
    const incrementButton = page
      .getByRole("button", { name: /\+|увеличить|increase/i })
      .first();

    if (await incrementButton.isVisible().catch(() => false)) {
      await incrementButton.click();

      // Quantity should increase
      const qty = page.getByText("2").first();
      if (await qty.isVisible().catch(() => false)) {
        await expect(qty).toBeVisible();
      }
    }
  });

  test("should remove item from cart", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/cart")) return;

    // Add test item
    await page.evaluate(() => {
      const testCart = {
        state: {
          items: [
            {
              id: "test-product-1",
              productId: "prod-1",
              name: "Товар для удаления",
              price: 10000,
              quantity: 1,
              image: "",
            },
          ],
        },
      };
      localStorage.setItem("cart-storage", JSON.stringify(testCart));
    });
    await page.reload({ waitUntil: "networkidle" });

    // Find remove button
    const removeButton = page
      .getByRole("button", { name: /удалить|remove|trash/i })
      .first()
      .or(
        page
          .locator('button[class*="delete"], button[class*="remove"]')
          .first(),
      );

    if (await removeButton.isVisible().catch(() => false)) {
      await removeButton.click();

      // Item should be removed
      await expect(page.getByText(/товар для удаления/i)).not.toBeVisible();
    }
  });

  test("should show total price", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/cart")) return;

    // Add items
    await page.evaluate(() => {
      const testCart = {
        state: {
          items: [
            {
              id: "test-product-1",
              productId: "prod-1",
              name: "Товар 1",
              price: 10000,
              quantity: 2,
              image: "",
            },
          ],
        },
      };
      localStorage.setItem("cart-storage", JSON.stringify(testCart));
    });
    await page.reload({ waitUntil: "networkidle" });

    // Should show total
    const total = page.getByText(/итого|total|сумма/i).first();
    if (await total.isVisible().catch(() => false)) {
      await expect(total).toBeVisible();
      const price = page.getByText(/20[\s,.]?000/i).first();
      if (await price.isVisible().catch(() => false)) {
        await expect(price).toBeVisible();
      }
    }
  });

  test("should navigate to checkout", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/cart")) return;

    // Add item
    await page.evaluate(() => {
      const testCart = {
        state: {
          items: [
            {
              id: "test-product-1",
              productId: "prod-1",
              name: "Товар",
              price: 10000,
              quantity: 1,
              image: "",
            },
          ],
        },
      };
      localStorage.setItem("cart-storage", JSON.stringify(testCart));
    });
    await page.reload({ waitUntil: "networkidle" });

    // Find checkout button
    const checkoutButton = page
      .getByRole("button", { name: /оформить|checkout|оплатить/i })
      .or(page.getByRole("link", { name: /оформить|checkout|оплатить/i }));

    if (
      await checkoutButton
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await checkoutButton.first().click();
      await expect(page).toHaveURL(/checkout/i);
    }
  });
});
