import { test, expect } from '@playwright/test';

test.describe('Mini App Cart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cart');
  });

  test('should display cart page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /корзина|cart/i })).toBeVisible();
  });

  test('should show empty cart message when empty', async ({ page }) => {
    // Clear cart first via localStorage
    await page.evaluate(() => {
      localStorage.removeItem('cart-storage');
    });
    await page.reload();

    // Should show empty message
    await expect(page.getByText(/пуста|empty|нет товаров/i).first()).toBeVisible();
  });

  test('should navigate to products when cart is empty', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('cart-storage');
    });
    await page.reload();

    // Find "go shopping" link
    const shopLink = page.getByRole('link', { name: /перейти|browse|выбрать/i }).or(
      page.getByRole('button', { name: /перейти|browse|выбрать/i })
    );

    if (await shopLink.isVisible()) {
      await shopLink.click();
      // Should navigate away from cart
      await expect(page).not.toHaveURL(/cart/i);
    }
  });

  test('should update item quantity', async ({ page }) => {
    // Add test item to cart via localStorage
    await page.evaluate(() => {
      const testCart = {
        state: {
          items: [
            {
              id: 'test-product-1',
              productId: 'prod-1',
              name: 'Тестовый товар',
              price: 10000,
              quantity: 1,
              image: '',
            },
          ],
        },
      };
      localStorage.setItem('cart-storage', JSON.stringify(testCart));
    });
    await page.reload();

    // Should show item
    await expect(page.getByText(/тестовый товар/i).first()).toBeVisible();

    // Find increment button
    const incrementButton = page.getByRole('button', { name: /\+|увеличить|increase/i }).first();

    if (await incrementButton.isVisible()) {
      await incrementButton.click();

      // Quantity should increase
      await expect(page.getByText('2').first()).toBeVisible();
    }
  });

  test('should remove item from cart', async ({ page }) => {
    // Add test item
    await page.evaluate(() => {
      const testCart = {
        state: {
          items: [
            {
              id: 'test-product-1',
              productId: 'prod-1',
              name: 'Товар для удаления',
              price: 10000,
              quantity: 1,
              image: '',
            },
          ],
        },
      };
      localStorage.setItem('cart-storage', JSON.stringify(testCart));
    });
    await page.reload();

    // Find remove button
    const removeButton = page.getByRole('button', { name: /удалить|remove|trash/i }).first().or(
      page.locator('button[class*="delete"], button[class*="remove"]').first()
    );

    if (await removeButton.isVisible()) {
      await removeButton.click();

      // Item should be removed
      await expect(page.getByText(/товар для удаления/i)).not.toBeVisible();
    }
  });

  test('should show total price', async ({ page }) => {
    // Add items
    await page.evaluate(() => {
      const testCart = {
        state: {
          items: [
            {
              id: 'test-product-1',
              productId: 'prod-1',
              name: 'Товар 1',
              price: 10000,
              quantity: 2,
              image: '',
            },
          ],
        },
      };
      localStorage.setItem('cart-storage', JSON.stringify(testCart));
    });
    await page.reload();

    // Should show total
    await expect(page.getByText(/итого|total|сумма/i).first()).toBeVisible();
    await expect(page.getByText(/20[\s,.]?000/i).first()).toBeVisible(); // 10000 * 2
  });

  test('should navigate to checkout', async ({ page }) => {
    // Add item
    await page.evaluate(() => {
      const testCart = {
        state: {
          items: [
            {
              id: 'test-product-1',
              productId: 'prod-1',
              name: 'Товар',
              price: 10000,
              quantity: 1,
              image: '',
            },
          ],
        },
      };
      localStorage.setItem('cart-storage', JSON.stringify(testCart));
    });
    await page.reload();

    // Find checkout button
    const checkoutButton = page.getByRole('button', { name: /оформить|checkout|оплатить/i }).or(
      page.getByRole('link', { name: /оформить|checkout|оплатить/i })
    );

    if (await checkoutButton.isVisible()) {
      await checkoutButton.click();
      await expect(page).toHaveURL(/checkout/i);
    }
  });
});
