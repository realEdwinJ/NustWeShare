import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { NavProgress } from "@/components/layout/NavProgress";
import { ThemeProvider, themeScript, type ThemePref } from "@/components/providers/theme";
import { SessionProvider, type SessionUser } from "@/components/providers/session";
import { ToastProvider } from "@/components/ui/toast";
import { getCurrentUser } from "@/lib/auth/current";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "NustWeShare — NUST past papers, shared by students",
    template: "%s · NustWeShare",
  },
  description:
    "Free, community-powered archive of Namibia University of Science and Technology past papers. Search any module, read papers in the browser, download one or a whole module as a ZIP.",
  applicationName: "NustWeShare",
  keywords: ["NUST", "past papers", "exam papers", "FEBE", "FCI", "Namibia", "tests", "supplementary"],
  authors: [{ name: "NustWeShare Community" }],
  creator: "NustWeShare",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/favicon.ico" }], apple: "/icons/icon.svg" },
  openGraph: {
    type: "website",
    locale: "en_NA",
    title: "NustWeShare — NUST past papers, shared by students",
    description: "Free community archive for NUST past papers. Search, read and download.",
    siteName: "NustWeShare",
  },
  twitter: { card: "summary", title: "NustWeShare", description: "NUST past papers, shared by students." },
  robots: { index: true, follow: true },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  appleWebApp: { capable: true, title: "NustWeShare", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0f2a4f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  const sessionUser: SessionUser = user
    ? {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        avatarColor: user.avatarColor,
        avatarEmoji: user.avatarEmoji,
        preferences: user.preferences ?? {},
        uploadAnonymously: user.uploadAnonymously,
      }
    : null;
  const serverTheme = (user?.preferences?.theme as ThemePref | undefined) ?? undefined;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background text-foreground" suppressHydrationWarning>
        {/* Runs before first paint: applies the saved theme so there's no light/dark flash */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} suppressHydrationWarning />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <ThemeProvider serverTheme={serverTheme}>
          <SessionProvider user={sessionUser}>
            <ToastProvider>
              <NavProgress />
              <Header />
              <main id="main-content" className="flex-1 focus:outline-none" tabIndex={-1}>
                {children}
              </main>
              <Footer />
            </ToastProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
