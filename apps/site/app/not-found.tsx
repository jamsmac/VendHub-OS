import { Coffee, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Playfair_Display, DM_Sans } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
});

const TEXTS = {
  ru: {
    title: "Страница не найдена",
    subtitle: "Кажется, этот напиток закончился",
    button: "На главную",
  },
  uz: {
    title: "Sahifa topilmadi",
    subtitle: "Bu ichimlik tugagan ko'rinadi",
    button: "Bosh sahifa",
  },
  en: {
    title: "Page not found",
    subtitle: "Looks like this drink has run out",
    button: "Go home",
  },
} as const;

export default async function NotFound() {
  const locale = await getLocale();
  const t = TEXTS[locale as keyof typeof TEXTS] ?? TEXTS.ru;
  const homeHref = locale === "ru" ? "/" : `/${locale}`;

  return (
    <html lang={locale} className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="font-body antialiased bg-cream">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-foam flex items-center justify-center">
              <Coffee size={32} className="text-espresso/40" />
            </div>
            <h1 className="font-display text-5xl text-espresso font-bold mb-2">
              404
            </h1>
            <h2 className="font-display text-xl text-chocolate font-bold mb-2">
              {t.title}
            </h2>
            <p className="text-chocolate/50 text-sm mb-6">{t.subtitle}</p>
            <Link
              href={homeHref}
              className="btn-espresso inline-flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              {t.button}
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
