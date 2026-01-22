import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

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
        className="antialiased"
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
