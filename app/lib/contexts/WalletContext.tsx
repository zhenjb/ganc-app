"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "zkdex_wallet_address";

export interface WalletContextValue {
  /** Connected wallet address or null. */
  address: string | null;
  /** True while a connection attempt is in progress. */
  connecting: boolean;
  /** Connect to Keplr/Leap and persist address. */
  connect: () => Promise<void>;
  /** Clear persisted address and disconnect. */
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

/**
 * Provider that manages wallet connection state.
 * On mount, reads persisted address from localStorage.
 * On connect, stores address to localStorage.
 * On disconnect (or if API state returns no owner), clears localStorage.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setAddress(stored);
    }
    setHydrated(true);
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const { connectWallet } = await import("@/app/lib/services/wallet");
      const connection = await connectWallet();
      setAddress(connection.address);
      localStorage.setItem(STORAGE_KEY, connection.address);
    } catch (err) {
      console.error("[Wallet] connect failed", err);
      // Don't clear existing address on failure
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Don't render children until hydrated to avoid mismatch
  if (!hydrated) return null;

  return (
    <WalletContext.Provider value={{ address, connecting, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

/**
 * Hook for consuming wallet connection state.
 * Throws if used outside WalletProvider.
 */
export function useWalletContext(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWalletContext must be used inside <WalletProvider>.");
  }
  return ctx;
}
