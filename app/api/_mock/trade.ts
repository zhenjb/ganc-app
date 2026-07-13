import type {
  Market,
  OrderBookLevel,
  OrderbookSnapshot,
  OpenOrder,
  Fill,
  ReservedBalance,
  OrderInput,
  OrderState,
  OrderErrorReason,
} from "@/app/lib/interfaces/trade";

// =============================================================================
// Mock Trade Data
// =============================================================================

/** Available markets */
export const mockMarkets: Market[] = [
  {
    market: "ATOM/USDC",
    baseDenom: "ATOM",
    quoteDenom: "USDC",
    tickSize: "0.01",
    lotSize: "0.1",
    makerFeeBps: 10,
    takerFeeBps: 20,
    status: "active",
  },
  {
    market: "ETH/USDC",
    baseDenom: "ETH",
    quoteDenom: "USDC",
    tickSize: "0.01",
    lotSize: "0.001",
    makerFeeBps: 10,
    takerFeeBps: 20,
    status: "active",
  },
];

/** In-memory order book state per market */
const mockOrderbooks: Record<string, OrderbookSnapshot> = {
  "ATOM/USDC": {
    market: "ATOM/USDC",
    bids: [
      { price: "10.50", qty: "1200" },
      { price: "10.48", qty: "850" },
      { price: "10.45", qty: "2100" },
      { price: "10.42", qty: "600" },
      { price: "10.40", qty: "1500" },
      { price: "10.38", qty: "900" },
      { price: "10.35", qty: "1800" },
      { price: "10.32", qty: "400" },
      { price: "10.30", qty: "700" },
      { price: "10.28", qty: "300" },
    ],
    asks: [
      { price: "10.52", qty: "1100" },
      { price: "10.55", qty: "750" },
      { price: "10.58", qty: "1900" },
      { price: "10.60", qty: "500" },
      { price: "10.63", qty: "1400" },
      { price: "10.65", qty: "800" },
      { price: "10.68", qty: "1600" },
      { price: "10.70", qty: "350" },
      { price: "10.73", qty: "650" },
      { price: "10.75", qty: "250" },
    ],
    bestBid: "10.50",
    bestAsk: "10.52",
  },
  "ETH/USDC": {
    market: "ETH/USDC",
    bids: [
      { price: "1820.10", qty: "51.66" },
      { price: "1819.85", qty: "44.21" },
      { price: "1819.60", qty: "38.01" },
      { price: "1819.30", qty: "31.84" },
      { price: "1819.05", qty: "26.90" },
      { price: "1818.75", qty: "21.33" },
      { price: "1818.40", qty: "16.55" },
      { price: "1818.10", qty: "11.98" },
      { price: "1817.75", qty: "7.42" },
      { price: "1817.40", qty: "3.11" },
    ],
    asks: [
      { price: "1820.40", qty: "49.11" },
      { price: "1820.65", qty: "41.87" },
      { price: "1820.95", qty: "35.99" },
      { price: "1821.20", qty: "30.21" },
      { price: "1821.50", qty: "25.04" },
      { price: "1821.80", qty: "19.87" },
      { price: "1822.10", qty: "15.33" },
      { price: "1822.45", qty: "10.70" },
      { price: "1822.80", qty: "6.52" },
      { price: "1823.10", qty: "2.78" },
    ],
    bestBid: "1820.10",
    bestAsk: "1820.40",
  },
};

/** Reserved balances per owner */
const mockReservedBalances: Record<string, ReservedBalance[]> = {
  cosmos1alice: [
    { owner: "cosmos1alice", denom: "ATOM", available: "500.5", reserved: "20.0" },
    { owner: "cosmos1alice", denom: "USDC", available: "12480.36", reserved: "1200.00" },
    { owner: "cosmos1alice", denom: "ETH", available: "2.56", reserved: "0.42" },
    { owner: "cosmos1alice", denom: "USDT", available: "890.20", reserved: "0.00" },
    { owner: "cosmos1alice", denom: "BTC", available: "0.0842", reserved: "0.0000" },
  ],
};

/** Open orders store (mutable) */
let mockOpenOrders: OpenOrder[] = [
  {
    orderId: "ord-001",
    orderHash: "0xabc123def456789001",
    owner: "cosmos1alice",
    market: "ATOM/USDC",
    side: "buy",
    price: "10.45",
    qty: "100",
    remaining: "40",
    filled: "60",
    status: "partial",
    sequence: 1,
  },
  {
    orderId: "ord-002",
    orderHash: "0xabc123def456789002",
    owner: "cosmos1alice",
    market: "ATOM/USDC",
    side: "sell",
    price: "10.65",
    qty: "50",
    remaining: "50",
    filled: "0",
    status: "open",
    sequence: 2,
  },
  {
    orderId: "ord-003",
    orderHash: "0xabc123def456789003",
    owner: "cosmos1alice",
    market: "ETH/USDC",
    side: "buy",
    price: "1818.00",
    qty: "1.5",
    remaining: "1.5",
    filled: "0",
    status: "open",
    sequence: 3,
  },
];

/** Trade fills store */
const mockFills: Fill[] = [
  {
    tradeId: "trade-001",
    market: "ATOM/USDC",
    makerOrderHash: "0xmaker001",
    takerOrderHash: "0xabc123def456789001",
    price: "10.45",
    qty: "60",
    makerFee: "0.063",
    takerFee: "0.126",
    buyer: "cosmos1alice",
    seller: "cosmos1bob",
  },
  {
    tradeId: "trade-002",
    market: "ETH/USDC",
    makerOrderHash: "0xmaker002",
    takerOrderHash: "0xtaker002",
    price: "1820.00",
    qty: "0.5",
    makerFee: "0.91",
    takerFee: "1.82",
    buyer: "cosmos1bob",
    seller: "cosmos1alice",
  },
];

let orderSequence = 4;

// =============================================================================
// Mock accessors
// =============================================================================

export function getMarketsData() {
  return { markets: mockMarkets };
}

export function getOrderbookData(market: string): OrderbookSnapshot | null {
  return mockOrderbooks[market] ?? null;
}

export function getReservedBalancesData(owner: string) {
  return { reservedBalances: mockReservedBalances[owner] ?? [] };
}

export function getOpenOrdersData(owner: string) {
  return { openOrders: mockOpenOrders.filter((o) => o.owner === owner) };
}

export function getTradesData(market: string) {
  return { fills: mockFills.filter((f) => f.market === market) };
}

// =============================================================================
// Mutations
// =============================================================================

export interface PlaceOrderValidation {
  valid: boolean;
  reason?: OrderErrorReason;
}

export function validateOrder(input: OrderInput): PlaceOrderValidation {
  const market = mockMarkets.find((m) => m.market === input.market);
  if (!market) return { valid: false, reason: "unknown_market" };
  if (market.status === "market_inactive")
    return { valid: false, reason: "market_inactive" };

  if (!input.owner || !input.price || !input.qty)
    return { valid: false, reason: "bad_format" };

  const price = parseFloat(input.price);
  const qty = parseFloat(input.qty);
  if (isNaN(price) || price <= 0) return { valid: false, reason: "bad_format" };
  if (isNaN(qty) || qty <= 0) return { valid: false, reason: "bad_format" };

  // Tick size check
  const tickSize = parseFloat(market.tickSize);
  if (tickSize > 0 && Math.abs(price % tickSize) > 1e-10) {
    return { valid: false, reason: "tick_violation" };
  }

  // Lot size check
  const lotSize = parseFloat(market.lotSize);
  if (lotSize > 0 && Math.abs(qty % lotSize) > 1e-10) {
    return { valid: false, reason: "lot_violation" };
  }

  // Balance check
  const balances = mockReservedBalances[input.owner] ?? [];
  if (input.side === "buy") {
    const quoteBal = balances.find((b) => b.denom === market.quoteDenom);
    const available = parseFloat(quoteBal?.available ?? "0");
    const needed = price * qty;
    if (needed > available) return { valid: false, reason: "insufficient_balance" };
  } else {
    const baseBal = balances.find((b) => b.denom === market.baseDenom);
    const available = parseFloat(baseBal?.available ?? "0");
    if (qty > available) return { valid: false, reason: "insufficient_balance" };
  }

  return { valid: true };
}

export function placeOrderMock(input: OrderInput): {
  order: OrderInput;
  status: string;
  state: OrderState;
} {
  const orderId = `ord-${String(orderSequence++).padStart(3, "0")}`;
  const orderHash =
    "0x" + crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);

  const newOrder: OpenOrder = {
    orderId,
    orderHash,
    owner: input.owner,
    market: input.market,
    side: input.side,
    price: input.price,
    qty: input.qty,
    remaining: input.qty,
    filled: "0",
    status: "open",
    sequence: orderSequence,
  };

  mockOpenOrders.push(newOrder);

  // Reserve balance
  const balances = mockReservedBalances[input.owner];
  if (balances) {
    const market = mockMarkets.find((m) => m.market === input.market);
    if (market) {
      if (input.side === "buy") {
        const quoteBal = balances.find((b) => b.denom === market.quoteDenom);
        if (quoteBal) {
          const needed = parseFloat(input.price) * parseFloat(input.qty);
          quoteBal.available = (parseFloat(quoteBal.available) - needed).toFixed(4);
          quoteBal.reserved = (parseFloat(quoteBal.reserved) + needed).toFixed(4);
        }
      } else {
        const baseBal = balances.find((b) => b.denom === market.baseDenom);
        if (baseBal) {
          const qty = parseFloat(input.qty);
          baseBal.available = (parseFloat(baseBal.available) - qty).toFixed(4);
          baseBal.reserved = (parseFloat(baseBal.reserved) + qty).toFixed(4);
        }
      }
    }
  }

  return {
    order: input,
    status: "accepted",
    state: {
      orderId,
      orderHash,
      status: "open",
      remaining: input.qty,
      filled: "0",
    },
  };
}

export function cancelOrderMock(
  orderHashOrId: string,
  owner: string
): { ok: boolean; status: number; message?: string } {
  if (!owner) return { ok: false, status: 400, message: "owner_required" };

  const idx = mockOpenOrders.findIndex(
    (o) => o.orderHash === orderHashOrId || o.orderId === orderHashOrId
  );

  if (idx === -1) return { ok: false, status: 404, message: "not_found" };

  const order = mockOpenOrders[idx];
  if (order.owner !== owner)
    return { ok: false, status: 403, message: "forbidden" };

  // Release reserved balance
  const balances = mockReservedBalances[owner];
  if (balances) {
    const market = mockMarkets.find((m) => m.market === order.market);
    if (market) {
      if (order.side === "buy") {
        const quoteBal = balances.find((b) => b.denom === market.quoteDenom);
        if (quoteBal) {
          const reserved = parseFloat(order.remaining) * parseFloat(order.price);
          quoteBal.available = (parseFloat(quoteBal.available) + reserved).toFixed(4);
          quoteBal.reserved = (parseFloat(quoteBal.reserved) - reserved).toFixed(4);
        }
      } else {
        const baseBal = balances.find((b) => b.denom === market.baseDenom);
        if (baseBal) {
          const remaining = parseFloat(order.remaining);
          baseBal.available = (parseFloat(baseBal.available) + remaining).toFixed(4);
          baseBal.reserved = (parseFloat(baseBal.reserved) - remaining).toFixed(4);
        }
      }
    }
  }

  mockOpenOrders.splice(idx, 1);
  return { ok: true, status: 200 };
}
