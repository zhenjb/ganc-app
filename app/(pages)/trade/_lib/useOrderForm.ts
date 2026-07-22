"use client";

import { useState, useCallback, useMemo } from "react";
import { placeOrder } from "@/app/lib/services/tradeApi";
import { signOrderAdr36 } from "@/app/lib/services/wallet/orderSign";
import type { Market, OrderInput, ReservedBalance } from "@/app/lib/interfaces/trade";

export type OrderSide = "buy" | "sell";
export type OrderType = "limit" | "market" | "stop_limit";

export interface UseOrderFormResult {
  side: OrderSide;
  setSide: (s: OrderSide) => void;
  orderType: OrderType;
  setOrderType: (t: OrderType) => void;
  price: string;
  setPrice: (p: string) => void;
  amount: string;
  setAmount: (a: string) => void;
  total: string;
  sliderPercent: number;
  setSliderPercent: (p: number) => void;
  submitting: boolean;
  error: string | null;
  submit: () => Promise<boolean>;
  validate: () => string | null;
}

/**
 * Manages order form state, validation, and submission.
 */
export function useOrderForm(
  owner: string,
  market: Market | null,
  balances: ReservedBalance[],
  onSuccess: () => void
): UseOrderFormResult {
  const [side, setSide] = useState<OrderSide>("buy");
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [sliderPercent, setSliderPercent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => {
    const p = parseFloat(price);
    const a = parseFloat(amount);
    if (isNaN(p) || isNaN(a)) return "0";
    return (p * a).toFixed(4);
  }, [price, amount]);

  // Validate tick/lot size against market config
  const validate = useCallback((): string | null => {
    if (!market) return "No market selected.";
    if (!price || parseFloat(price) <= 0) return "Enter a valid price.";
    if (!amount || parseFloat(amount) <= 0) return "Enter a valid amount.";

    const tickSize = parseFloat(market.tickSize);
    const lotSize = parseFloat(market.lotSize);
    const priceNum = parseFloat(price);
    const amountNum = parseFloat(amount);

    if (tickSize > 0) {
      // Use integer math to avoid floating-point precision issues
      // e.g. 10.50 % 0.01 might give 0.00999... instead of 0
      const decimals = (market.tickSize.split(".")[1] ?? "").length;
      const factor = Math.pow(10, decimals);
      const priceInt = Math.round(priceNum * factor);
      const tickInt = Math.round(tickSize * factor);
      if (priceInt % tickInt !== 0) {
        return `Price must be a multiple of ${market.tickSize} (tick size).`;
      }
    }

    if (lotSize > 0) {
      const decimals = (market.lotSize.split(".")[1] ?? "").length;
      const factor = Math.pow(10, decimals);
      const amountInt = Math.round(amountNum * factor);
      const lotInt = Math.round(lotSize * factor);
      if (amountInt % lotInt !== 0) {
        return `Amount must be a multiple of ${market.lotSize} (lot size).`;
      }
    }

    // Balance check
    if (side === "buy") {
      const quoteDenom = market.quoteDenom;
      const bal = balances.find((b) => b.denom === quoteDenom);
      const available = parseFloat(bal?.available ?? "0");
      const totalNum = parseFloat(total);
      if (totalNum > available) {
        return `Insufficient ${quoteDenom} balance.`;
      }
    } else {
      const baseDenom = market.baseDenom;
      const bal = balances.find((b) => b.denom === baseDenom);
      const available = parseFloat(bal?.available ?? "0");
      const amountNum = parseFloat(amount);
      if (amountNum > available) {
        return `Insufficient ${baseDenom} balance.`;
      }
    }

    return null;
  }, [market, price, amount, side, total, balances]);

  const submit = useCallback(async (): Promise<boolean> => {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return false;
    }
    if (!market) return false;

    setSubmitting(true);
    try {
      // expiry = absolute unix-seconds deadline (now + 24h). The backend compares
      // this against its own clock (order_validation.go), so it must be a future
      // unix-SECONDS value — not milliseconds.
      const expiry = String(Math.floor(Date.now() / 1000) + 86400);
      const nonce = Date.now().toString();

      // Sign the EXACT fields we are about to POST (sign-then-send). Signing a
      // stale expiry/nonce and sending different values would yield bad_signature.
      // The wallet signs the canonical bytes via ADR-036; the backend binds the
      // recovered pubkey to `owner`.
      const signable = {
        owner,
        market: market.market,
        side,
        price,
        qty: amount,
        expiry,
        nonce,
      };
      const { signature, pubkey } = await signOrderAdr36(signable);
      const input: OrderInput = { ...signable, signature, pubkey };

      const result = await placeOrder(input);
      if (result.ok) {
        // Reset form
        setPrice("");
        setAmount("");
        setSliderPercent(0);
        onSuccess();
        return true;
      } else {
        setError(result.message);
        return false;
      }
    } catch {
      setError("Failed to place order. Please try again.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [validate, market, owner, side, price, amount, onSuccess]);

  return {
    side,
    setSide,
    orderType,
    setOrderType,
    price,
    setPrice,
    amount,
    setAmount,
    total,
    sliderPercent,
    setSliderPercent,
    submitting,
    error,
    submit,
    validate,
  };
}
