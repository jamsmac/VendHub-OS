import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import {
  setRequestLocale,
  getMessages,
  getTranslations,
} from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ToastProvider } from "@/components/ui/Toast";
import { ModalProvider } from "@/lib/modal-context";
import { ProductsProvider } from "@/lib/useProductsData";
import ModalRoot from "@/components/modals/ModalRoot";
import { fetchPublicSiteCms } from "@/lib/api-client";
import { products as fallbackProducts } from "@/lib/data";
import type { Product } from "@/lib/types";
import "../globals.css";

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

const BASE_URL = "https://vendhub.uz";

const KEYWORDS: Record<string, string[]> = {
  ru: ["VendHub", "кофе", "вендинг", "Ташкент", "автомат", "кофейный автомат"],
  uz: ["VendHub", "kofe", "vending", "Toshkent", "avtomat", "kofe avtomati"],
  en: ["VendHub", "coffee", "vending", "Tashkent", "vending machine", "snacks"],
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  const localeUrlMap: Record<string, string> = {
    ru: BASE_URL,
    uz: `${BASE_URL}/uz`,
    en: `${BASE_URL}/en`,
  };
  const url = localeUrlMap[locale] ?? BASE_URL;

  return {
    title: t("title"),
    description: t("description"),
    keywords: KEYWORDS[locale] ?? KEYWORDS.ru,
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: url,
      languages: {
        ru: BASE_URL,
        uz: `${BASE_URL}/uz`,
        en: `${BASE_URL}/en`,
      },
    },
    openGraph: {
      title: t("title"),
      description: t("ogDescription"),
      url,
      siteName: "VendHub",
      locale: locale === "uz" ? "uz_UZ" : locale === "en" ? "en_US" : "ru_RU",
      alternateLocale: ["ru_RU", "uz_UZ", "en_US"].filter(
        (l) =>
          l !==
          (locale === "uz" ? "uz_UZ" : locale === "en" ? "en_US" : "ru_RU"),
      ),
      type: "website",
      images: [
        {
          url: `${BASE_URL}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: t("ogImageAlt"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("ogDescription"),
      images: [`${BASE_URL}/opengraph-image`],
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const [messages, seo, apiProducts] = await Promise.all([
    getMessages(),
    getTranslations("seo"),
    fetchPublicSiteCms("products"),
  ]);

  const initialProducts = (
    apiProducts.length > 0 ? apiProducts : fallbackProducts
  ) as Product[];

  // JSON-LD: Product catalog for SEO
  const productListJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "VendHub Menu",
    numberOfItems: initialProducts.filter((p) => p.available).length,
    itemListElement: initialProducts
      .filter((p) => p.available)
      .slice(0, 20)
      .map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          name: p.name,
          ...(p.description ? { description: p.description } : {}),
          ...(p.image_url ? { image: p.image_url } : {}),
          offers: {
            "@type": "Offer",
            price: p.price,
            priceCurrency: "UZS",
            availability: "https://schema.org/InStock",
          },
          ...(p.rating
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: String(p.rating),
                  bestRating: "5",
                },
              }
            : {}),
        },
      })),
  });

  // JSON-LD structured data — locale-aware, built from trusted translation strings
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "VendHub",
    description: seo("jsonLdDescription"),
    url: BASE_URL,
    logo: `${BASE_URL}/images/brand/hub-logo.webp`,
    telephone: "+998712003999",
    email: "info@vendhub.uz",
    address: {
      "@type": "PostalAddress",
      addressLocality: seo("jsonLdArea"),
      addressCountry: "UZ",
    },
    areaServed: seo("jsonLdArea"),
    sameAs: [
      "https://t.me/vendhub_support",
      "https://instagram.com/vendhub.uz",
      "https://youtube.com/@vendhub",
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "10000",
      bestRating: "5",
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "06:00",
      closes: "23:00",
    },
  });

  return (
    <html lang={locale} className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="font-body bg-cream text-chocolate antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-espresso-dark focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
        >
          {seo("skipToContent")}
        </a>
        <script
          type="application/ld+json"
          // Safe: content is built from trusted server-side translation strings
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
        <script
          type="application/ld+json"
          // Safe: product data is from server-side API query, serialized via JSON.stringify
          dangerouslySetInnerHTML={{ __html: productListJsonLd }}
        />
        <NextIntlClientProvider messages={messages}>
          <ToastProvider>
            <ModalProvider>
              <ProductsProvider initialProducts={initialProducts}>
                {children}
                <ModalRoot />
              </ProductsProvider>
            </ModalProvider>
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
