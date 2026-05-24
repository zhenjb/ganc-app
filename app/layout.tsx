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
// gate. It mirrors the resolution rule used by `ThemeProvider`:
//   - explicit "dark"   → add the "dark" class
//   - explicit "light"  → remove it
//   - "system" / null   → mirror `prefers-color-scheme: dark`
// Wrapped in a try/catch so storage-blocking browsers cannot crash boot.
// =============================================================================

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

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
  title: "ZKDEX MVP",
  description: "ZKDEX MVP dashboard — deposit, batch, prove, submit, claim.",
};

/**
 * Inline "no-flash" theme script. Reads `localStorage["theme"]` synchronously,
 * resolves the `"system"` case via `prefers-color-scheme`, and toggles
 * `<html class="dark">` *before* the first paint so users never see the wrong
 * palette flash during hydration. Kept as a single self-invoking expression so
 * it stays under one tick of the parser.
 */
const NO_FLASH_THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");var s=window.matchMedia("(prefers-color-scheme: dark)").matches;var d=t==="dark"||((!t||t==="system")&&s);var c=document.documentElement.classList;if(d){c.add("dark");}else{c.remove("dark");}}catch(_){}})();`;

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
      <head>
        {/* Must run before React hydrates — inline, blocking, synchronous. */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
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
