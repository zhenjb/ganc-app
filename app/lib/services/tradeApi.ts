// =============================================================================
// Trade API wrappers
// -----------------------------------------------------------------------------
// Typed wrappers for the trading endpoints. All calls go through the shared
// `request<T>()` utility in http.ts for consistent error handling and timeout.
//
// IMPORTANT: The orderbook endpoint uses the market name with a literal "/"
// (e.g. "ATOM/USDC") in the path. We must NOT url-encode this slash.
// =============================================================================

import { request, getApiBaseUrl } from "@/app/lib/services/http";
import { ApiError } from "@/app/lib/interfaces/api";
import type {
  MarketsResponse,
  OrderbookSnapshot,
  OpenOrdersResponse,
  FillsResponse,
  ReservedBalancesResponse,
  OrderInput,
  OrderResponse,
  OrderErrorResponse,
  OrderErrorReason,
} from "@/app/lib/interfaces/trade";
import type { CallOptions } from "@/app/lib/services/api";

// -----------------------------------------------------------------------------
// Markets
// -----------------------------------------------------------------------------

/** GET /api/markets — fetch available markets metadata. */
export async function getMarkets(opts?: CallOptions): Promise<MarketsResponse> {
  return request<MarketsResponse>("/api/markets", { method: "GET", ...opts });
}

// -----------------------------------------------------------------------------
// Order Book
// -----------------------------------------------------------------------------

/**
 * GET /api/orderbook/{market} — fetch order book snapshot.
 * NOTE: market name contains "/" which must NOT be url-encoded in the path.
 */
export async function getOrderbook(
  market: string,
  opts?: CallOptions
): Promise<OrderbookSnapshot> {
  // Build URL manually to avoid encoding the "/" in market name
  return request<OrderbookSnapshot>(`/api/orderbook/${market}`, {
    method: "GET",
    ...opts,
  });
}

// -----------------------------------------------------------------------------
// Balances
// -----------------------------------------------------------------------------

/** GET /api/state?owner= — fetch reserved balances for an owner. */
export async function getReservedBalances(
  owner: string,
  opts?: CallOptions
): Promise<ReservedBalancesResponse> {
  return request<ReservedBalancesResponse>(
    `/api/state?owner=${encodeURIComponent(owner)}`,
    { method: "GET", ...opts }
  );
}

// -----------------------------------------------------------------------------
// Orders
// -----------------------------------------------------------------------------

/** GET /api/orders?owner= — fetch open orders for an owner. */
export async function getOpenOrders(
  owner: string,
  opts?: CallOptions
): Promise<OpenOrdersResponse> {
  return request<OpenOrdersResponse>(
    `/api/orders?owner=${encodeURIComponent(owner)}`,
    { method: "GET", ...opts }
  );
}

/** GET /api/trades?market= — fetch trade fills for a market. */
export async function getTrades(
  market: string,
  opts?: CallOptions
): Promise<FillsResponse> {
  // market contains "/" — don't encode
  return request<FillsResponse>(`/api/trades?market=${market}`, {
    method: "GET",
    ...opts,
  });
}

// -----------------------------------------------------------------------------
// Place Order
// -----------------------------------------------------------------------------

/** Order placement result — either success or typed error. */
export type PlaceOrderResult =
  | { ok: true; data: OrderResponse }
  | { ok: false; reason: OrderErrorReason; message: string };

/** Human-readable error messages for each order error reason. */
const ORDER_ERROR_MESSAGES: Record<OrderErrorReason, string> = {
  insufficient_balance: "Insufficient balance to place this order.",
  bad_signature: "Invalid signature. Please try again.",
  bad_format: "Invalid order format. Check your input.",
  unknown_market: "Unknown market. This trading pair is not available.",
  market_inactive: "This market is currently inactive.",
  tick_violation: "Price does not match the tick size for this market.",
  lot_violation: "Amount does not match the lot size for this market.",
  expired: "Order has expired. Please submit a new order.",
  order_nullifier_used: "This order has already been used.",
  duplicate_order: "Duplicate order detected.",
};

/**
 * POST /api/order — place a new order.
 * Returns a discriminated union so the caller can handle success/error cleanly.
 */
export async function placeOrder(
  input: OrderInput,
  opts?: CallOptions
): Promise<PlaceOrderResult> {
  const url = `${getApiBaseUrl()}/api/order`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: opts?.signal,
    });
  } catch (err) {
    console.error("[Trade] placeOrder fetch error", err);
    throw new ApiError("Internal Server Error", 500);
  }

  if (res.ok) {
    const data = (await res.json()) as OrderResponse;
    return { ok: true, data };
  }

  if (res.status === 400) {
    try {
      const body = (await res.json()) as OrderErrorResponse;
      const reason = body.reason;
      const message =
        ORDER_ERROR_MESSAGES[reason] ?? "Order rejected. Please try again.";
      return { ok: false, reason, message };
    } catch {
      return { ok: false, reason: "bad_format", message: "Order rejected." };
    }
  }

  console.error("[Trade] placeOrder HTTP error", { status: res.status });
  throw new ApiError("Internal Server Error", 500);
}

// -----------------------------------------------------------------------------
// Cancel Order
// -----------------------------------------------------------------------------

export type CancelOrderResult =
  | { ok: true }
  | { ok: false; code: number; message: string };

/**
 * DELETE /api/order/{id}?owner= — cancel an open order.
 * Handles 400 (owner_required), 403 (not owner), 404 (not found/already cancelled).
 */
export async function cancelOrder(
  orderHashOrId: string,
  owner: string,
  opts?: CallOptions
): Promise<CancelOrderResult> {
  const url = `${getApiBaseUrl()}/api/order/${encodeURIComponent(
    orderHashOrId
  )}?owner=${encodeURIComponent(owner)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "DELETE",
      cache: "no-store",
      signal: opts?.signal,
    });
  } catch (err) {
    console.error("[Trade] cancelOrder fetch error", err);
    throw new ApiError("Internal Server Error", 500);
  }

  if (res.ok) return { ok: true };

  if (res.status === 400) {
    return { ok: false, code: 400, message: "Owner is required." };
  }
  if (res.status === 403) {
    return {
      ok: false,
      code: 403,
      message: "You are not the owner of this order.",
    };
  }
  if (res.status === 404) {
    return {
      ok: false,
      code: 404,
      message: "Order not found or already cancelled.",
    };
  }

  console.error("[Trade] cancelOrder HTTP error", { status: res.status });
  throw new ApiError("Internal Server Error", 500);
}
