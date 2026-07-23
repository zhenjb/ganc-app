"use client";

import type { Market, ReservedBalance } from "@/app/lib/interfaces/trade";
import {
  useOrderForm,
  type OrderType,
} from "@/app/(pages)/trade/_lib/useOrderForm";
import styles from "./OrderForm.module.scss";

interface OrderFormProps {
  owner: string;
  market: Market | null;
  balances: ReservedBalance[];
  onOrderPlaced: () => void;
}

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: "limit", label: "Limit" },
  { value: "market", label: "Market" },
  { value: "stop_limit", label: "Stop Limit" },
];

export function OrderForm({
  owner,
  market,
  balances,
  onOrderPlaced,
}: OrderFormProps) {
  const {
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
  } = useOrderForm(owner, market, balances, onOrderPlaced);

  const baseDenom = market?.baseDenom ?? "—";
  const quoteDenom = market?.quoteDenom ?? "—";

  // Fee calculation for summary
  const feeRate =
    side === "buy"
      ? (market?.takerFeeBps ?? 0) / 10000
      : (market?.makerFeeBps ?? 0) / 10000;
  const totalNum = parseFloat(total) || 0;
  const fee = (totalNum * feeRate).toFixed(4);

  return (
    <div className={styles.container}>
      {/* Buy/Sell Toggle */}
      <div className={styles.toggleRow} role="tablist" aria-label="Order side">
        <button
          role="tab"
          aria-selected={side === "buy"}
          className={`${styles.toggleBtn} ${side === "buy" ? `${styles.toggleBtnActive} ${styles.buy}` : ""}`}
          onClick={() => setSide("buy")}
          type="button"
        >
          BUY
        </button>
        <button
          role="tab"
          aria-selected={side === "sell"}
          className={`${styles.toggleBtn} ${side === "sell" ? `${styles.toggleBtnActive} ${styles.sell}` : ""}`}
          onClick={() => setSide("sell")}
          type="button"
        >
          SELL
        </button>
      </div>

      {/* Order type sub-tabs */}
      <div className={styles.subTabs} role="tablist" aria-label="Order type">
        {ORDER_TYPES.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={orderType === t.value}
            className={`${styles.subTab} ${orderType === t.value ? styles.subTabActive : ""}`}
            onClick={() => setOrderType(t.value)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Price */}
      <div>
        <label className={styles.fieldLabel} htmlFor="order-price">
          Price
        </label>
        <div className={styles.fieldBox}>
          <input
            id="order-price"
            className={styles.fieldInput}
            type="number"
            step="any"
            placeholder="0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <span className={styles.fieldUnit}>{quoteDenom}</span>
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className={styles.fieldLabel} htmlFor="order-amount">
          Amount
        </label>
        <div className={styles.fieldBox}>
          <input
            id="order-amount"
            className={styles.fieldInput}
            type="number"
            step="any"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <span className={styles.fieldUnit}>{baseDenom}</span>
        </div>
      </div>

      {/* Slider */}
      <input
        type="range"
        className={styles.slider}
        min={0}
        max={100}
        value={sliderPercent}
        onChange={(e) => setSliderPercent(Number(e.target.value))}
        aria-label="Percentage of available balance"
      />

      {/* Total */}
      <div>
        <label className={styles.fieldLabel} htmlFor="order-total">
          Total
        </label>
        <div className={styles.fieldBox}>
          <input
            id="order-total"
            className={styles.fieldInput}
            type="text"
            readOnly
            value={total}
          />
          <span className={styles.fieldUnit}>{quoteDenom}</span>
        </div>
      </div>

      {/* Transaction Summary */}
      <div className={styles.summaryTitle}>Transaction Summary</div>
      <div className={styles.summaryRow}>
        <span>Entry Price</span>
        <b>{price || "—"}</b>
      </div>
      <div className={styles.summaryRow}>
        <span>Fee ({side === "buy" ? "Taker" : "Maker"})</span>
        <b>{fee} {quoteDenom}</b>
      </div>
      <div className={styles.summaryRow}>
        <span>Total Cost</span>
        <b>{total} {quoteDenom}</b>
      </div>

      {/* Error message */}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {/* Place Order Button */}
      <button
        type="button"
        className={`${styles.placeBtn} ${side === "buy" ? styles.placeBtnBuy : styles.placeBtnSell}`}
        onClick={submit}
        disabled={submitting || !market || !owner}
      >
        {submitting
          ? "Placing…"
          : !owner
            ? "Connect Wallet"
            : `Place ${side === "buy" ? "Buy" : "Sell"} Order`}
      </button>
    </div>
  );
}

export default OrderForm;
