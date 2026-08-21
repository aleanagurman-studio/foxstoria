import type { Metadata } from "next";
import { Manrope, Literata } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-ui" });
const literata = Literata({ subsets: ["latin", "cyrillic"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "FoxStoria — Интерактивные и линейные истории",
  description: "Платформа для чтения и создания интерактивных новелл и линейных историй",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${manrope.variable} ${literata.variable}`}>{children}</body>
    </html>
  );
}
