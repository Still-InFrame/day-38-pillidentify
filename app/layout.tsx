import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pillidentify.100dayaichallenge.com"),
  title: {
    default: "PillCheck AI",
    template: "%s | PillCheck AI",
  },
  description:
    "A mobile-first pill identification assistant that returns possible matches from visible traits.",
  openGraph: {
    title: "PillCheck AI",
    description:
      "A mobile-first pill identification assistant that returns possible matches from visible traits.",
    url: "https://pillidentify.100dayaichallenge.com",
    siteName: "PillCheck AI",
    images: [
      {
        url: "/hero.png",
        width: 1672,
        height: 941,
        alt: "PillCheck AI product-concept mockup",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PillCheck AI",
    description:
      "A mobile-first pill identification assistant that returns possible matches from visible traits.",
    images: ["/hero.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
