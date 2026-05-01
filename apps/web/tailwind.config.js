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
  sans: ["var(--font-sans)", "Montserrat", "system-ui", "sans-serif"],
  mono: ["var(--font-mono)", '"IBM Plex Mono"', "ui-monospace", "monospace"],
  display: ["var(--font-sans)", "Montserrat", "system-ui", "sans-serif"],
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
  // Semantic typography scale (handoff)
  "display-xl": [
    "72px",
    { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "800" },
  ],
  "display-lg": [
    "56px",
    { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "800" },
  ],
  "display-md": [
    "44px",
    { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" },
  ],
  "display-sm": [
    "32px",
    { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "700" },
  ],
  h1: [
    "28px",
    { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "700" },
  ],
  h2: [
    "22px",
    { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "700" },
  ],
  h3: [
    "18px",
    { lineHeight: "1.3", letterSpacing: "-0.005em", fontWeight: "600" },
  ],
  "body-lg": ["16px", { lineHeight: "1.55", fontWeight: "400" }],
  body: ["14px", { lineHeight: "1.55", fontWeight: "400" }],
  "body-sm": ["13px", { lineHeight: "1.5", fontWeight: "400" }],
  label: [
    "12px",
    {
      lineHeight: "1.4",
      letterSpacing: "0.04em",
      fontWeight: "600",
    },
  ],
  caption: ["11px", { lineHeight: "1.4", fontWeight: "500" }],
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

        // ── Brand primitives (handoff) ─────────────────────────────────
        "hub-sand": "#D3A066",
        "hub-black": "#1A1919",
        "hub-white": "#FFFFFF",

        // ── Sand scale (handoff) ───────────────────────────────────────
        sand: {
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
        },

        // ── Legacy aliases — espresso/caramel from earlier brand iteration.
        // Mapped to shadcn HSL vars + coffee scale so the 820+ legacy
        // classes (text-espresso-*, bg-espresso-*, border-espresso-*,
        // *-caramel) resolve and theme correctly without touching JSX.
        // Migrate to coffee/sand scale incrementally as files are touched.
        espresso: {
          DEFAULT: "hsl(var(--foreground))",
          dark: "hsl(var(--foreground))",
          light: "hsl(var(--muted-foreground))",
          50: "hsl(var(--muted))",
          100: "#f2e8e5", // = coffee-100
        },
        caramel: {
          DEFAULT: "#d2bab0", // = coffee-400
          dark: "#a18072", // = coffee-600
        },

        // ── Status surfaces — paired bg + border for badges/alerts ────
        "status-success": {
          DEFAULT: "hsl(var(--success))",
          surface: "hsl(152 50% 95%)",
          border: "hsl(152 40% 80%)",
        },
        "status-warning": {
          DEFAULT: "hsl(var(--warning))",
          surface: "hsl(38 90% 96%)",
          border: "hsl(38 70% 80%)",
        },
        "status-danger": {
          DEFAULT: "hsl(var(--destructive))",
          surface: "hsl(0 80% 96%)",
          border: "hsl(0 60% 82%)",
        },
        "status-info": {
          DEFAULT: "hsl(var(--info))",
          surface: "hsl(210 80% 96%)",
          border: "hsl(210 60% 82%)",
        },
      },

      // ── Typography (from design-tokens.ts) ──────────────────────────────
      fontFamily: {
        sans: dtFonts.sans,
        mono: dtFonts.mono,
        display: dtFonts.display,
      },
      fontSize: dtFontSize,
      letterSpacing: dtLetterSpacing,

      // ── 4px spacing rhythm (handoff additions) ──────────────────────────
      spacing: {
        0.5: "2px",
        1.5: "6px",
        2.5: "10px",
        3.5: "14px",
        4.5: "18px",
        13: "52px",
        15: "60px",
        18: "72px",
        22: "88px",
      },

      // ── Elevation (from design-tokens.ts + handoff card series) ─────────
      boxShadow: {
        ...dtShadow,
        "card-sm": "0 1px 2px 0 hsl(25 30% 8% / 0.04)",
        card: "0 1px 3px 0 hsl(25 30% 8% / 0.06), 0 1px 2px -1px hsl(25 30% 8% / 0.04)",
        "card-md":
          "0 4px 8px -2px hsl(25 30% 8% / 0.08), 0 2px 4px -2px hsl(25 30% 8% / 0.04)",
        "card-lg":
          "0 12px 24px -6px hsl(25 30% 8% / 0.12), 0 4px 8px -4px hsl(25 30% 8% / 0.06)",
        "card-xl":
          "0 24px 48px -12px hsl(25 30% 8% / 0.18), 0 8px 16px -8px hsl(25 30% 8% / 0.08)",
        "glow-sm":
          "0 0 0 1px hsl(var(--primary) / 0.3), 0 1px 4px hsl(var(--primary) / 0.12)",
        "glow-lg":
          "0 0 0 1px hsl(var(--primary) / 0.4), 0 4px 24px hsl(var(--primary) / 0.25), 0 12px 48px hsl(var(--primary) / 0.12)",
      },

      // ── Motion (from design-tokens.ts + handoff named durations) ────────
      transitionDuration: {
        ...dtDuration,
        // alias used by handoff utilities
        med: "320ms",
      },
      transitionTimingFunction: {
        ...dtEasing,
        "in-quad": "cubic-bezier(0.55, 0.085, 0.68, 0.53)",
        "out-quad": "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "in-out-quad": "cubic-bezier(0.455, 0.03, 0.515, 0.955)",
      },

      // ── Radii — shadcn CSS var system + handoff extras ──────────────────
      borderRadius: {
        xs: "4px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "16px",
        "2xl": "20px",
        "3xl": "28px",
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
        "pulse-warm": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-warm": "pulse-warm 2s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
        "fade-in-up": "fade-in-up 320ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
