import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monitra - Competitor Price Intelligence",
  description: "AI-powered competitor price analysis and market intelligence. Track competitor prices, get instant alerts, and make data-driven pricing decisions.",
  keywords: ["price tracking", "competitor analysis", "market intelligence", "price monitoring", "e-commerce"],
  authors: [{ name: "RudrX" }],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
  },
  openGraph: {
    title: "Monitra - Competitor Price Intelligence",
    description: "AI-powered competitor price analysis and market intelligence",
    type: "website",
    url: "https://www.monitra.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "Monitra - Competitor Price Intelligence",
    description: "AI-powered competitor price analysis and market intelligence",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
