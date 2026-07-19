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
const mockFills: Fill[] = generateMockFills();

/** Generate realistic trade fills with timestamps for the last 2 hours */
function generateMockFills(): Fill[] {
  const now = Math.floor(Date.now() / 1000);
  const twoHoursAgo = now - 7200;
  const fills: Fill[] = [];

  // ATOM/USDC fills — simulate price movement around 10.50
  let atomPrice = 10.35;
  let fillId = 1;
  for (let t = twoHoursAgo; t < now; t += 15 + Math.floor(Math.random() * 30)) {
    // Random walk
    atomPrice += (Math.random() - 0.48) * 0.04;
    atomPrice = Math.max(10.10, Math.min(10.90, atomPrice));

    fills.push({
      tradeId: `trade-${String(fillId++).padStart(4, "0")}`,
      market: "ATOM/USDC",
      makerOrderHash: `0xmaker${fillId.toString(16).padStart(8, "0")}`,
      takerOrderHash: `0xtaker${fillId.toString(16).padStart(8, "0")}`,
      price: atomPrice.toFixed(2),
      qty: (Math.random() * 200 + 10).toFixed(1),
      makerFee: (atomPrice * 0.001).toFixed(3),
      takerFee: (atomPrice * 0.002).toFixed(3),
      buyer: Math.random() > 0.5 ? "cosmos1alice" : "cosmos1bob",
      seller: Math.random() > 0.5 ? "cosmos1bob" : "cosmos1alice",
      timestamp: t,
    });
  }

  // ETH/USDC fills — simulate price movement around 1820
  let ethPrice = 1815.0;
  for (let t = twoHoursAgo; t < now; t += 20 + Math.floor(Math.random() * 40)) {
    ethPrice += (Math.random() - 0.47) * 2.5;
    ethPrice = Math.max(1800, Math.min(1845, ethPrice));

    fills.push({
      tradeId: `trade-${String(fillId++).padStart(4, "0")}`,
      market: "ETH/USDC",
      makerOrderHash: `0xmaker${fillId.toString(16).padStart(8, "0")}`,
      takerOrderHash: `0xtaker${fillId.toString(16).padStart(8, "0")}`,
      price: ethPrice.toFixed(2),
      qty: (Math.random() * 5 + 0.1).toFixed(3),
      makerFee: (ethPrice * 0.0005).toFixed(2),
      takerFee: (ethPrice * 0.001).toFixed(2),
      buyer: Math.random() > 0.5 ? "cosmos1alice" : "cosmos1bob",
      seller: Math.random() > 0.5 ? "cosmos1bob" : "cosmos1alice",
      timestamp: t,
    });
  }

  return fills;
}

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
  if (tickSize > 0) {
    const decimals = (market.tickSize.split(".")[1] ?? "").length;
    const factor = Math.pow(10, decimals);
    const priceInt = Math.round(price * factor);
    const tickInt = Math.round(tickSize * factor);
    if (priceInt % tickInt !== 0) {
      return { valid: false, reason: "tick_violation" };
    }
  }

  // Lot size check
  const lotSize = parseFloat(market.lotSize);
  if (lotSize > 0) {
    const decimals = (market.lotSize.split(".")[1] ?? "").length;
    const factor = Math.pow(10, decimals);
    const qtyInt = Math.round(qty * factor);
    const lotInt = Math.round(lotSize * factor);
    if (qtyInt % lotInt !== 0) {
      return { valid: false, reason: "lot_violation" };
    }
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

  const market = mockMarkets.find((m) => m.market === input.market);
  const book = mockOrderbooks[input.market];
  const price = parseFloat(input.price);
  let remainingQty = parseFloat(input.qty);
  let filledQty = 0;

  // --- Order matching engine ---
  if (book) {
    // Buy order matches against asks (lowest first); sell matches against bids (highest first)
    const oppositeBook = input.side === "buy" ? book.asks : book.bids;

    while (remainingQty > 0 && oppositeBook.length > 0) {
      const bestLevel = oppositeBook[0];
      const bestPrice = parseFloat(bestLevel.price);

      // Check if price crosses
      const crosses =
        input.side === "buy" ? price >= bestPrice : price <= bestPrice;
      if (!crosses) break;

      const availableQty = parseFloat(bestLevel.qty);
      const fillQty = Math.min(remainingQty, availableQty);
      const fillPrice = bestPrice; // Match at maker's price

      // Create a fill record
      const tradeId = `trade-match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const makerFee = market
        ? ((fillPrice * fillQty * market.makerFeeBps) / 10000).toFixed(4)
        : "0";
      const takerFee = market
        ? ((fillPrice * fillQty * market.takerFeeBps) / 10000).toFixed(4)
        : "0";

      mockFills.push({
        tradeId,
        market: input.market,
        makerOrderHash: `0xbook_${bestLevel.price}`,
        takerOrderHash: orderHash,
        price: bestLevel.price,
        qty: fillQty.toFixed(4),
        makerFee,
        takerFee,
        buyer: input.side === "buy" ? input.owner : "counterparty",
        seller: input.side === "sell" ? input.owner : "counterparty",
        timestamp: Math.floor(Date.now() / 1000),
      });

      // Update order book level
      const newLevelQty = availableQty - fillQty;
      if (newLevelQty <= 0.0001) {
        oppositeBook.shift(); // Remove exhausted level
      } else {
        bestLevel.qty = newLevelQty.toFixed(1);
      }

      remainingQty -= fillQty;
      filledQty += fillQty;
    }

    // Update best bid/ask after matching
    if (book.bids.length > 0) book.bestBid = book.bids[0].price;
    else book.bestBid = "0";
    if (book.asks.length > 0) book.bestAsk = book.asks[0].price;
    else book.bestAsk = "0";
  }

  // --- Determine order status ---
  const totalQty = parseFloat(input.qty);
  let orderStatus: "open" | "partial" | "filled";
  if (remainingQty <= 0.0001) {
    orderStatus = "filled";
  } else if (filledQty > 0) {
    orderStatus = "partial";
  } else {
    orderStatus = "open";
  }

  // --- If there's remaining qty, add to order book and open orders ---
  if (remainingQty > 0.0001) {
    const newOrder: OpenOrder = {
      orderId,
      orderHash,
      owner: input.owner,
      market: input.market,
      side: input.side,
      price: input.price,
      qty: input.qty,
      remaining: remainingQty.toFixed(4),
      filled: filledQty.toFixed(4),
      status: orderStatus === "filled" ? "open" : orderStatus,
      sequence: orderSequence,
    };
    mockOpenOrders.push(newOrder);

    // Add remaining qty to the order book on our side
    if (book) {
      const levels = input.side === "buy" ? book.bids : book.asks;
      const existingIdx = levels.findIndex((l) => l.price === input.price);
      if (existingIdx !== -1) {
        const existing = levels[existingIdx];
        existing.qty = (parseFloat(existing.qty) + remainingQty).toFixed(1);
      } else {
        levels.push({ price: input.price, qty: remainingQty.toFixed(1) });
        if (input.side === "buy") {
          levels.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        } else {
          levels.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        }
      }
      // Update best bid/ask
      if (book.bids.length > 0) book.bestBid = book.bids[0].price;
      if (book.asks.length > 0) book.bestAsk = book.asks[0].price;
    }
  }

  // --- Update balances ---
  const balances = mockReservedBalances[input.owner];
  if (balances && market) {
    if (input.side === "buy") {
      const quoteBal = balances.find((b) => b.denom === market.quoteDenom);
      if (quoteBal) {
        // Filled portion: deduct from available (already spent)
        // Remaining portion: move from available to reserved
        const filledCost = filledQty * price;
        const reservedCost = remainingQty * price;
        quoteBal.available = (parseFloat(quoteBal.available) - filledCost - reservedCost).toFixed(4);
        quoteBal.reserved = (parseFloat(quoteBal.reserved) + reservedCost).toFixed(4);
      }
      // Credit filled base tokens
      if (filledQty > 0) {
        const baseBal = balances.find((b) => b.denom === market.baseDenom);
        if (baseBal) {
          baseBal.available = (parseFloat(baseBal.available) + filledQty).toFixed(4);
        }
      }
    } else {
      const baseBal = balances.find((b) => b.denom === market.baseDenom);
      if (baseBal) {
        // Filled portion: deduct from available (already sold)
        // Remaining portion: move from available to reserved
        baseBal.available = (parseFloat(baseBal.available) - filledQty - remainingQty).toFixed(4);
        baseBal.reserved = (parseFloat(baseBal.reserved) + remainingQty).toFixed(4);
      }
      // Credit filled quote tokens (sold at match prices)
      if (filledQty > 0) {
        const quoteBal = balances.find((b) => b.denom === market.quoteDenom);
        if (quoteBal) {
          // Use total filled value from fills (sum of fillPrice * fillQty)
          const filledValue = filledQty * price; // Simplified: use order price
          quoteBal.available = (parseFloat(quoteBal.available) + filledValue).toFixed(4);
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
      status: orderStatus === "filled" ? "filled" : "open",
      remaining: remainingQty > 0.0001 ? remainingQty.toFixed(4) : "0",
      filled: filledQty.toFixed(4),
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

  // Remove order's remaining qty from order book
  const book = mockOrderbooks[order.market];
  if (book) {
    const levels = order.side === "buy" ? book.bids : book.asks;
    const levelIdx = levels.findIndex((l) => l.price === order.price);
    if (levelIdx !== -1) {
      const remaining = parseFloat(order.remaining);
      const currentQty = parseFloat(levels[levelIdx].qty);
      const newQty = currentQty - remaining;
      if (newQty <= 0) {
        levels.splice(levelIdx, 1);
      } else {
        levels[levelIdx].qty = newQty.toFixed(1);
      }
      // Update best bid/ask
      if (book.bids.length > 0) book.bestBid = book.bids[0].price;
      if (book.asks.length > 0) book.bestAsk = book.asks[0].price;
    }
  }

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
