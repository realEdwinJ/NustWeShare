import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "NustWeShare — Past papers. Shared by students.",
    template: "%s | NustWeShare",
  },
  description:
    "Free, community-powered archive for Namibia University of Science and Technology past papers. FEBE & FCI. Search, browse, upload. No account needed.",
  keywords: ["NUST", "past papers", "FEBE", "FCI", "Namibia", "exams", "tests"],
  authors: [{ name: "NustWeShare Community" }],
  creator: "NustWeShare",
  openGraph: {
    type: "website",
    locale: "en_NA",
    title: "NustWeShare — Past papers. Shared by students.",
    description: "Free community archive for NUST past papers. FEBE & FCI.",
    siteName: "NustWeShare",
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
          Skip to content
        </a>
        <Header />
        <main id="main-content" className="flex-1 focus:outline-none" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
