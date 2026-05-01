/**
 * VendHub OS — Design Tokens
 *
 * TypeScript source of truth for brand colors, typography, radii, shadows,
 * motion. Mirrors design/handoff/design-tokens.ts. Tailwind config inlines
 * these as JS constants (see tailwind.config.js header) to avoid ts-node in
 * the build chain — keep both in sync manually.
 *
 * Runtime theming lives in src/app/globals.css via CSS variables; this file
 * is for type-safe access from TSX (charts, motion configs, etc).
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
// 2. Sand scale (full brand palette)
// ────────────────────────────────────────────────────────────────────

export const sand = {
  50: "#FBF6F0",
  100: "#F5EBDC",
  200: "#EBD7B9",
  300: "#E0C195",
  400: "#D6AC79",
  500: "#D3A066",
  600: "#B88654",
  700: "#8E6741",
  800: "#65482E",
  900: "#3D2B1B",
} as const;

// ────────────────────────────────────────────────────────────────────
// 3. Coffee scale (existing — kept for backward compat)
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
// 4. Semantic system tokens (HSL — совместимо с globals.css)
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
// 5. Типографика
// ────────────────────────────────────────────────────────────────────

export const fonts = {
  sans: ["var(--font-sans)", "Montserrat", "system-ui", "sans-serif"],
  mono: ["var(--font-mono)", '"IBM Plex Mono"', "ui-monospace", "monospace"],
} as const;

export const fontSize = {
  xs: "11px",
  sm: "13px",
  base: "14px",
  md: "15px",
  lg: "18px",
  xl: "22px",
  "2xl": "26px",
  "3xl": "32px",
  "4xl": "48px",
  "5xl": "64px",
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
  tightest: "-0.03em",
  tighter: "-0.02em",
  tight: "-0.01em",
  normal: "0",
  wide: "0.04em",
  wider: "0.08em",
  widest: "0.1em",
} as const;

// ────────────────────────────────────────────────────────────────────
// 6. Радиусы
// ────────────────────────────────────────────────────────────────────

export const radius = {
  none: "0",
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "20px",
  full: "9999px",
} as const;

// ────────────────────────────────────────────────────────────────────
// 7. Тени
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
// 8. Анимации
// ────────────────────────────────────────────────────────────────────

export const duration = {
  micro: "120ms",
  short: "200ms",
  medium: "320ms",
  long: "500ms",
} as const;

export const easing = {
  out: "cubic-bezier(0.16, 1, 0.3, 1)",
  inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

// ────────────────────────────────────────────────────────────────────
// 9. Отступы
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
// 10. Z-index (рекомендованная шкала)
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
// 11. Breakpoints (Tailwind default + наши для Admin)
// ────────────────────────────────────────────────────────────────────

export const screens = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
  /** Admin min-width — ниже показываем заглушку "оптимизировано для desktop" */
  admin: "1024px",
} as const;

// ────────────────────────────────────────────────────────────────────
// Export all
// ────────────────────────────────────────────────────────────────────

export const tokens = {
  brand,
  sand,
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
