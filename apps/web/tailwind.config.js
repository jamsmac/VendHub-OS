/**
 * @type {import('tailwindcss').Config}
 *
 * Design tokens inlined from design/handoff/design-tokens.ts (P4.1).
 * tailwind.config.js is plain CommonJS — tokens are copied as JS constants
 * rather than imported (avoids ts-node dependency in the build chain).
 *
 * shadcn/ui HSL color system (hsl(var(--*))) is preserved untouched.
 */

// ── Design tokens (mirrors design/handoff/design-tokens.ts) ────────────────

const dtFonts = {
  sans: ["Montserrat", "system-ui", "sans-serif"],
  mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
};

const dtFontSize = {
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
};

const dtLetterSpacing = {
  tightest: "-0.03em",
  tighter: "-0.02em",
  tight: "-0.01em",
  normal: "0",
  wide: "0.04em",
  wider: "0.08em",
  widest: "0.1em",
};

const dtShadow = {
  xs: "0 1px 2px hsl(25 30% 8% / 0.04)",
  sm: "0 2px 4px hsl(25 30% 8% / 0.06)",
  md: "0 4px 12px hsl(25 30% 8% / 0.08)",
  lg: "0 8px 24px hsl(25 30% 8% / 0.12)",
  xl: "0 16px 48px hsl(25 30% 8% / 0.16)",
  glow: "0 0 0 1px hsl(var(--primary) / 0.3), 0 2px 12px hsl(var(--primary) / 0.15)",
};

const dtDuration = {
  micro: "120ms",
  short: "200ms",
  medium: "320ms",
  long: "500ms",
};

const dtEasing = {
  out: "cubic-bezier(0.16, 1, 0.3, 1)",
  inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

// ── Tailwind config ─────────────────────────────────────────────────────────

module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // ── Colors — shadcn HSL system preserved; coffee verified against tokens ──
      colors: {
        // VendHub "Warm Brew" Theme — shadcn/ui CSS variable mapping
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Custom VendHub colors — values verified against design-tokens.ts coffee scale
        coffee: {
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
        },
        success: {
          DEFAULT: "hsl(142, 76%, 36%)",
          foreground: "hsl(0, 0%, 100%)",
        },
        warning: {
          DEFAULT: "hsl(38, 92%, 50%)",
          foreground: "hsl(0, 0%, 0%)",
        },
      },

      // ── Typography (from design-tokens.ts) ──────────────────────────────
      fontFamily: {
        sans: dtFonts.sans,
        mono: dtFonts.mono,
      },
      fontSize: dtFontSize,
      letterSpacing: dtLetterSpacing,

      // ── Elevation (from design-tokens.ts) ───────────────────────────────
      boxShadow: dtShadow,

      // ── Motion (from design-tokens.ts) ──────────────────────────────────
      transitionDuration: dtDuration,
      transitionTimingFunction: dtEasing,

      // ── Radii — shadcn CSS var system (unchanged) ────────────────────────
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      // ── Animations ───────────────────────────────────────────────────────
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
