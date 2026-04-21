/**
 * VendHub OS — Design Tokens
 *
 * Источник истины для цветов, типографики, радиусов, теней и анимаций.
 * Импортируется в apps/web/tailwind.config.js и при необходимости в компонентах.
 *
 * Существующий apps/web/src/app/globals.css задаёт HSL-переменные для shadcn/ui.
 * Этот файл — TypeScript-версия тех же значений + расширения.
 */

// ────────────────────────────────────────────────────────────────────
// 1. Фирменные цвета (заморожены)
// ────────────────────────────────────────────────────────────────────

export const brand = {
  /** Hub Sand — единственный акцентный цвет. Primary везде. */
  sand: "#D3A066",
  /** Hub Black — тёмный фон. Background в dark mode. */
  black: "#1A1919",
  /** Hub White — светлый фон. Background в light mode. */
  white: "#FFFFFF",
} as const;

// ────────────────────────────────────────────────────────────────────
// 2. Coffee scale (уже в tailwind.config.js — для справки)
// ────────────────────────────────────────────────────────────────────

export const coffee = {
  50: "#fdf8f6",
  100: "#f2e8e5",
  200: "#eaddd7",
  300: "#e0cec7",
  400: "#d2bab0",
  500: "#bfa094",
  600: "#a18072",
  700: "#977669",
  800: "#846358",
  900: "#43302b",
} as const;

// ────────────────────────────────────────────────────────────────────
// 3. Semantic system tokens (HSL — совместимо с globals.css)
// ────────────────────────────────────────────────────────────────────

export const semantic = {
  success: "hsl(152 60% 40%)",
  successForeground: "hsl(0 0% 100%)",
  warning: "hsl(38 92% 50%)",
  warningForeground: "hsl(25 30% 8%)",
  info: "hsl(210 70% 50%)",
  infoForeground: "hsl(0 0% 100%)",
  danger: "hsl(0 72% 51%)",
  dangerForeground: "hsl(0 0% 100%)",
} as const;

// ────────────────────────────────────────────────────────────────────
// 4. Типографика
// ────────────────────────────────────────────────────────────────────

export const fonts = {
  sans: ["Montserrat", "system-ui", "sans-serif"],
  mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
} as const;

export const fontSize = {
  // Брендовая шкала (px)
  xs: "11px", // captions, mono labels
  sm: "13px", // body-small, table cells
  base: "14px", // body default
  md: "15px", // panel titles
  lg: "18px", // card titles
  xl: "22px", // section titles
  "2xl": "26px", // page titles (H1)
  "3xl": "32px", // hero
  "4xl": "48px", // display
  "5xl": "64px", // marketing display
} as const;

export const fontWeight = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  black: 800,
} as const;

export const letterSpacing = {
  tightest: "-0.03em", // display
  tighter: "-0.02em", // H1
  tight: "-0.01em", // H2
  normal: "0",
  wide: "0.04em", // crumbs
  wider: "0.08em", // mono captions
  widest: "0.1em", // brand sub-kicker
} as const;

// ────────────────────────────────────────────────────────────────────
// 5. Радиусы
// ────────────────────────────────────────────────────────────────────

export const radius = {
  none: "0",
  sm: "4px", // badges, chips
  md: "8px", // buttons, inputs
  lg: "12px", // cards
  xl: "16px", // panels
  "2xl": "20px", // modals
  full: "9999px", // pills, avatars
} as const;

// ────────────────────────────────────────────────────────────────────
// 6. Тени
// ────────────────────────────────────────────────────────────────────

export const shadow = {
  xs: "0 1px 2px hsl(25 30% 8% / 0.04)",
  sm: "0 2px 4px hsl(25 30% 8% / 0.06)",
  md: "0 4px 12px hsl(25 30% 8% / 0.08)",
  lg: "0 8px 24px hsl(25 30% 8% / 0.12)",
  xl: "0 16px 48px hsl(25 30% 8% / 0.16)",
  glow: "0 0 0 1px hsl(var(--primary) / 0.3), 0 2px 12px hsl(var(--primary) / 0.15)",
} as const;

// ────────────────────────────────────────────────────────────────────
// 7. Анимации
// ────────────────────────────────────────────────────────────────────

export const duration = {
  micro: "120ms", // hover, focus
  short: "200ms", // dropdown open, tooltip
  medium: "320ms", // modal enter/exit
  long: "500ms", // page transitions
} as const;

export const easing = {
  out: "cubic-bezier(0.16, 1, 0.3, 1)", // default easing
  inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)", // playful
} as const;

// ────────────────────────────────────────────────────────────────────
// 8. Отступы (Tailwind spacing scale — для справки)
// ────────────────────────────────────────────────────────────────────

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  base: "16px",
  lg: "20px",
  xl: "24px",
  "2xl": "32px",
  "3xl": "48px",
  "4xl": "64px",
  "5xl": "96px",
} as const;

// ────────────────────────────────────────────────────────────────────
// 9. Z-index (рекомендованная шкала)
// ────────────────────────────────────────────────────────────────────

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  topbar: 300,
  sidebar: 400,
  overlay: 1000,
  modal: 1100,
  popover: 1200,
  tooltip: 1300,
  toast: 1400,
} as const;

// ────────────────────────────────────────────────────────────────────
// 10. Breakpoints (Tailwind default + наши для Admin)
// ────────────────────────────────────────────────────────────────────

export const screens = {
  sm: "640px", // mobile landscape
  md: "768px", // tablet
  lg: "1024px", // tablet-large / small desktop
  xl: "1280px", // desktop
  "2xl": "1536px", // wide desktop
  /** Admin min-width — ниже показываем заглушку "оптимизировано для desktop" */
  admin: "1024px",
} as const;

// ────────────────────────────────────────────────────────────────────
// Export all (для использования в компонентах)
// ────────────────────────────────────────────────────────────────────

export const tokens = {
  brand,
  coffee,
  semantic,
  fonts,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  shadow,
  duration,
  easing,
  spacing,
  zIndex,
  screens,
} as const;

export type DesignTokens = typeof tokens;
export default tokens;
