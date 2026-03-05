import { ReactNode } from "react";

// Minimal root layout — real layout lives in [locale]/layout.tsx
// This is required by Next.js but [locale]/layout provides <html>, <body>, fonts, metadata
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
