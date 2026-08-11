import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-numeric",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dashboard Omnichannel",
  description: "Vendas unificadas — e-commerce (Shopify) + loja física.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
