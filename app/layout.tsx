// =============================================================================
// FE-01 App Shell — Root layout
// -----------------------------------------------------------------------------
// Server component (no "use client") that owns the <html>/<body> shell, mounts
// the inline no-flash theme script, imports the global stylesheet, and wraps
// route children with the provider stack required by FE-01:
//
//   <ThemeProvider>
//     <AppStateProvider>
//       <AppShell>{children}</AppShell>
//     </AppStateProvider>
//   </ThemeProvider>
//
// `<html lang="en">` satisfies Req 1.6. `suppressHydrationWarning` tells React
// not to complain about the class mismatch caused by the no-flash script
// toggling `class="dark"` on `<html>` between SSR and hydration (per design
// risk register).
//
// The no-flash script runs synchronously *before* React hydrates and *before*
// first paint, so the page is rendered with the correct palette out of the
// gate. It checks localStorage for "dark" and adds the class accordingly.
// Wrapped in a try/catch so storage-blocking browsers cannot crash boot.
// =============================================================================

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import "./globals.css";

import { ThemeProvider } from "@/app/lib/contexts/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZKDEX",
  description: "ZKDEX dashboard — deposit, batch, prove, submit, claim.",
};

/**
 * Inline "no-flash" theme script. Reads `localStorage["theme"]` synchronously
 * and toggles `<html class="dark">` *before* the first paint so users never
 * see the wrong palette flash during hydration. Only "dark" adds the class;
 * anything else (including missing/invalid values) defaults to light.
 */
const NO_FLASH_THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");var c=document.documentElement.classList;if(t==="dark"){c.add("dark");}else{c.remove("dark");}}catch(_){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
         * No-flash theme script. `next/script` with `beforeInteractive`
         * injects this into the initial HTML and runs it before React
         * hydrates, so the correct palette is applied before first paint.
         * Using <Script> (instead of a raw <script> element) avoids React
         * 19's "Encountered a script tag while rendering" warning, since the
         * raw element is never executed during client render/hydration.
         */}
        <Script id="no-flash-theme" strategy="beforeInteractive">
          {NO_FLASH_THEME_SCRIPT}
        </Script>
        <ThemeProvider>
          {/*
           * Children render directly under the root layout. The shared App
           * Shell (Header, Footer, AnnouncementBanner, AppStateProvider) is
           * mounted only inside `app/(pages)/layout.tsx`, so unknown URLs
           * fall through to `app/not-found.tsx` without ever firing the
           * `GET /api/state` request — guaranteeing the 404-vs-500
           * separation by construction.
           */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
