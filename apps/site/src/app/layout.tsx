import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VendHub — Платформа управления вендинговым бизнесом в Узбекистане",
  description:
    "Единая система для управления вендинговыми автоматами, складом, персоналом, финансами и лояльностью. Создана для рынка Узбекистана.",
  keywords: [
    "вендинг",
    "вендинговые автоматы",
    "управление автоматами",
    "Узбекистан",
    "vending",
    "VendHub",
    "кофе автоматы",
    "бизнес",
  ],
  openGraph: {
    title: "VendHub — Управляйте вендинговым бизнесом",
    description: "Единая платформа для автоматов, склада, персонала и финансов",
    type: "website",
    locale: "ru_RU",
    siteName: "VendHub",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="scroll-smooth">
      <body className="antialiased bg-white text-gray-900">{children}</body>
    </html>
  );
}
