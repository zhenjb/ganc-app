// =============================================================================
// Trade domain types
// -----------------------------------------------------------------------------
// Types for the trading screen: markets metadata, order book, orders, fills,
// and reserved balances. Mirrors ganc-sys REST API responses.
// =============================================================================

/** Market metadata from GET /api/markets */
export interface Market {
  market: string;
  baseDenom: string;
  quoteDenom: string;
  tickSize: string;
  lotSize: string;
  makerFeeBps: number;
  takerFeeBps: number;
  status: "active" | "market_inactive";
}

export interface MarketsResponse {
  markets: Market[];
}

/** Order book level (price + quantity) */
export interface OrderBookLevel {
  price: string;
  qty: string;
}

/** Order book snapshot from GET /api/orderbook/{market} */
export interface OrderbookSnapshot {
  market: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  bestBid: string;
  bestAsk: string;
}

/** Open order from GET /api/orders?owner= */
export interface OpenOrder {
  orderId: string;
  orderHash: string;
  owner: string;
  market: string;
  side: "buy" | "sell";
  price: string;
  qty: string;
  remaining: string;
  filled: string;
  status: "open" | "partial";
  sequence: number;
}

export interface OpenOrdersResponse {
  openOrders: OpenOrder[];
}

/** Trade fill from GET /api/trades?market= */
export interface Fill {
  tradeId: string;
  market: string;
  makerOrderHash: string;
  takerOrderHash: string;
  price: string;
  qty: string;
  makerFee: string;
  takerFee: string;
  buyer: string;
  seller: string;
  /** Unix timestamp in seconds when the trade was executed */
  timestamp: number;
}

export interface FillsResponse {
  fills: Fill[];
}

/** Reserved balance from GET /api/state?owner= */
export interface ReservedBalance {
  owner: string;
  denom: string;
  available: string;
  reserved: string;
}

export interface ReservedBalancesResponse {
  reservedBalances: ReservedBalance[];
}

/** Order placement input for POST /api/order */
export interface OrderInput {
  owner: string;
  market: string;
  side: "buy" | "sell";
  price: string;
  qty: string;
  expiry: string;
  nonce: string;
  signature: string;
  /**
   * Base64 compressed secp256k1 public key of the signer. Sent only for real
   * ADR-036 order auth (backend ORDER_SIG_MODE=adr36); omitted in mock mode.
   */
  pubkey?: string;
}

/** Order state returned inside OrderResponse */
export interface OrderState {
  orderId: string;
  orderHash: string;
  status: string;
  remaining: string;
  filled: string;
}

/** Response from POST /api/order */
export interface OrderResponse {
  order: OrderInput;
  status: string;
  state: OrderState;
}

/** Error response from POST /api/order (400) */
export interface OrderErrorResponse {
  error: string;
  reason: OrderErrorReason;
}

export type OrderErrorReason =
  | "insufficient_balance"
  | "bad_signature"
  | "bad_format"
  | "unknown_market"
  | "market_inactive"
  | "tick_violation"
  | "lot_violation"
  | "expired"
  | "order_nullifier_used"
  | "duplicate_order";
