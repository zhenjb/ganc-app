// =============================================================================
// app/(pages)/layout.tsx — route-group layout for valid pages.
// -----------------------------------------------------------------------------
// Mounts the App Shell (Header, Footer, banners, normalized error UI) and the
// `AppStateProvider` only when the current URL maps to a real page file under
// `app/(pages)/<page>/page.tsx`.
//
// This is the architectural pivot that enforces the 404-vs-500 separation:
//
//   - Valid route (page file exists) → this layout mounts, `GET /api/state`
//     fires, and any backend failure is surfaced through the AppShell's
//     normalized "Internal Server Error" UI.
//   - Unknown URL (no page file) → Next.js falls back to the root
//     `app/not-found.tsx`, which lives OUTSIDE this route group. The
//     provider never mounts, no API request is sent, and the 500 page can
//     never appear. (This is the user-stated invariant: "no valid route
//     matched ⇒ no API call ⇒ no Internal Server Error".)
//
// Keep root `app/layout.tsx` minimal (html/body + ThemeProvider + the
// no-flash theme script). All shared chrome lives here.
// =============================================================================

import type { ReactNode } from "react";

import AppShell from "@/app/components/AppShell/AppShell";
import { WalletProvider } from "@/app/lib/contexts/WalletContext";
import { AppStateProvider } from "@/app/lib/contexts/AppStateContext";

export default function PagesLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <WalletProvider>
      <AppStateProvider>
        <AppShell>{children}</AppShell>
      </AppStateProvider>
    </WalletProvider>
  );
}
