import { Markup } from 'telegraf';

// ============================================
// Reply Keyboards (Regular Keyboards)
// ============================================

/**
 * Main menu keyboard
 */
export const mainMenuKeyboard = Markup.keyboard([
  ['🛒 Каталог', '🗺 Найти автоматы'],
  ['💎 Мои баллы', '🎯 Задания'],
  ['📜 История', '⚙️ Настройки'],
]).resize();

/**
 * Request location keyboard
 */
export const locationKeyboard = Markup.keyboard([
  [Markup.button.locationRequest('📍 Отправить геолокацию')],
  ['❌ Отмена'],
]).resize().oneTime();

/**
 * Request phone keyboard
 */
export const phoneKeyboard = Markup.keyboard([
  [Markup.button.contactRequest('📱 Отправить номер телефона')],
  ['❌ Отмена'],
]).resize().oneTime();

/**
 * Cancel keyboard
 */
export const cancelKeyboard = Markup.keyboard([
  ['❌ Отмена'],
]).resize().oneTime();

/**
 * Confirmation keyboard
 */
export const confirmKeyboard = Markup.keyboard([
  ['✅ Подтвердить', '❌ Отмена'],
]).resize().oneTime();

/**
 * Rating keyboard
 */
export const ratingKeyboard = Markup.keyboard([
  ['⭐️', '⭐️⭐️', '⭐️⭐️⭐️'],
  ['⭐️⭐️⭐️⭐️', '⭐️⭐️⭐️⭐️⭐️'],
  ['❌ Отмена'],
]).resize().oneTime();

/**
 * Settings keyboard
 */
export const settingsKeyboard = Markup.keyboard([
  ['🌐 Язык', '🔔 Уведомления'],
  ['📱 Мой номер', '🔙 Назад'],
]).resize();

/**
 * Language selection keyboard
 */
export const languageKeyboard = Markup.keyboard([
  ['🇷🇺 Русский', '🇺🇿 O\'zbekcha'],
  ['🇬🇧 English', '🔙 Назад'],
]).resize();

/**
 * Remove keyboard
 */
export const removeKeyboard = Markup.removeKeyboard();

// ============================================
// Dynamic Keyboards
// ============================================

/**
 * Create quantity selection keyboard
 */
export function quantityKeyboard(current: number = 1, max: number = 10) {
  const buttons = [];

  // Row 1: -/+
  buttons.push([
    current > 1 ? `➖` : '⬜️',
    `${current}`,
    current < max ? `➕` : '⬜️',
  ]);

  // Row 2: Quick select
  const quickOptions = [1, 2, 3, 5];
  buttons.push(quickOptions.map(n => n <= max ? `${n} шт.` : '⬜️'));

  // Row 3: Actions
  buttons.push(['✅ Добавить в корзину', '❌ Отмена']);

  return Markup.keyboard(buttons).resize().oneTime();
}

/**
 * Create cart management keyboard
 */
export function cartKeyboard(itemCount: number) {
  if (itemCount === 0) {
    return Markup.keyboard([
      ['🛒 Каталог'],
      ['🔙 Главное меню'],
    ]).resize();
  }

  return Markup.keyboard([
    ['📋 Показать корзину', '🗑 Очистить корзину'],
    ['✅ Оформить заказ', '➕ Добавить ещё'],
    ['🔙 Главное меню'],
  ]).resize();
}

/**
 * Create category selection keyboard
 */
export function categoryKeyboard(categories: string[]) {
  const buttons: string[][] = [];

  // 2 categories per row
  for (let i = 0; i < categories.length; i += 2) {
    const first = categories[i];
    const second = categories[i + 1];
    if (first) {
      const row: string[] = [first];
      if (second) {
        row.push(second);
      }
      buttons.push(row);
    }
  }

  buttons.push(['🔙 Назад']);

  return Markup.keyboard(buttons).resize();
}

/**
 * Create complaint type keyboard
 */
export const complaintTypeKeyboard = Markup.keyboard([
  ['🔧 Проблема с автоматом', '📦 Проблема с товаром'],
  ['💳 Проблема с оплатой', '❓ Другое'],
  ['❌ Отмена'],
]).resize().oneTime();
