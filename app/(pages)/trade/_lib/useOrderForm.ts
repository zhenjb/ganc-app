"use client";

import { useState, useCallback, useMemo } from "react";
import { placeOrder } from "@/app/lib/services/tradeApi";
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
      const remainder = priceNum % tickSize;
      if (Math.abs(remainder) > 1e-10) {
        return `Price must be a multiple of ${market.tickSize} (tick size).`;
      }
    }

    if (lotSize > 0) {
      const remainder = amountNum % lotSize;
      if (Math.abs(remainder) > 1e-10) {
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
      const input: OrderInput = {
        owner,
        market: market.market,
        side,
        price,
        qty: amount,
        expiry: "2000000",
        nonce: Date.now().toString(),
        signature: "0x", // Placeholder — real signing handled externally
      };

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
