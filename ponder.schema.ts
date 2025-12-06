import { onchainTable, primaryKey, index, relations } from "ponder";

// User accounts table
export const account = onchainTable("account", (t) => ({
  address: t.hex().primaryKey(),
  firstSeenAt: t.integer().notNull(),
  lastActiveAt: t.integer().notNull(),
  totalTradingVolume: t.bigint().notNull().default(0n),
  totalPositions: t.integer().notNull().default(0),
  totalLiquidations: t.integer().notNull().default(0),
  realizedPnl: t.bigint().notNull().default(0n),
}));

// GMX v2 specific tables for Mantle Sepolia deployment

// Markets table for GMX v2 (markets instead of single vault)
export const market = onchainTable("market", (t) => ({
  address: t.hex().primaryKey(),
  longToken: t.hex().notNull(),
  shortToken: t.hex().notNull(),
  indexToken: t.hex().notNull(),
  marketToken: t.hex().notNull(), // GM token for the market
  isDisabled: t.boolean().notNull().default(false),
  createdAt: t.integer().notNull(),
}));

// GMX v2 Deposits
export const depositEvent = onchainTable("deposit_event", (t) => ({
  id: t.text().primaryKey(), // txHash-logIndex
  key: t.text(), // deposit key for tracking execution
  account: t.hex().notNull(),
  market: t.hex().notNull(),
  token: t.hex().notNull(),
  tokensLong: t.bigint().notNull(),
  tokensShort: t.bigint().notNull(),
  marketTokens: t.bigint().notNull(),
  status: t.text().notNull(), // "created", "executed", "cancelled"
  executionPrice: t.bigint(),
  blockNumber: t.integer().notNull(),
  timestamp: t.integer().notNull(),
  transactionHash: t.text().notNull(),
}));

// GMX v2 Withdrawals
export const withdrawalEvent = onchainTable("withdrawal_event", (t) => ({
  id: t.text().primaryKey(), // txHash-logIndex
  key: t.text(), // withdrawal key for tracking execution
  account: t.hex().notNull(),
  market: t.hex().notNull(),
  marketTokens: t.bigint().notNull(),
  minLongTokenAmount: t.bigint().notNull(),
  minShortTokenAmount: t.bigint().notNull(),
  longTokenAmount: t.bigint(), // filled on execution
  shortTokenAmount: t.bigint(), // filled on execution
  status: t.text().notNull(), // "created", "executed", "cancelled"
  blockNumber: t.integer().notNull(),
  timestamp: t.integer().notNull(),
  transactionHash: t.text().notNull(),
}));

// GMX v2 Orders (more comprehensive than v1)
export const orderEventV2 = onchainTable("order_event_v2", (t) => ({
  id: t.text().primaryKey(), // txHash-logIndex
  key: t.text(), // order key for tracking execution
  account: t.hex().notNull(),
  market: t.hex().notNull(),
  collateralToken: t.hex().notNull(),
  sizeInUsd: t.bigint().notNull(),
  sizeInTokens: t.bigint().notNull(),
  collateralDeltaAmount: t.bigint().notNull(),
  executionPrice: t.bigint().notNull(),
  isLong: t.boolean().notNull(),
  orderType: t.integer().notNull(), // 0=MarketIncrease, 1=LimitIncrease, etc.
  status: t.text().notNull(), // "created", "executed", "cancelled"
  blockNumber: t.integer().notNull(),
  timestamp: t.integer().notNull(),
  transactionHash: t.text().notNull(),
}));

// GMX v2 Position Events (separate from orders)
export const positionEventV2 = onchainTable("position_event_v2", (t) => ({
  id: t.text().primaryKey(), // txHash-logIndex
  account: t.hex().notNull(),
  market: t.hex().notNull(),
  collateralToken: t.hex().notNull(),
  eventType: t.text().notNull(), // "increase", "decrease", "liquidate"
  sizeInUsd: t.bigint().notNull(),
  sizeInTokens: t.bigint().notNull(),
  collateralDeltaAmount: t.bigint().notNull(),
  executionPrice: t.bigint().notNull(),
  realizedPnlUsd: t.bigint().default(0n),
  isLong: t.boolean().notNull(),
  blockNumber: t.integer().notNull(),
  timestamp: t.integer().notNull(),
  transactionHash: t.text().notNull(),
}));

// GMX v2 Swap Events
export const swapEventV2 = onchainTable("swap_event_v2", (t) => ({
  id: t.text().primaryKey(), // txHash-logIndex
  account: t.hex().notNull(),
  tokenIn: t.hex().notNull(),
  tokenOut: t.hex().notNull(),
  amountIn: t.bigint().notNull(),
  amountOut: t.bigint().notNull(),
  priceImpactUsd: t.bigint().notNull(), // Can be negative
  blockNumber: t.integer().notNull(),
  timestamp: t.integer().notNull(),
  transactionHash: t.text().notNull(),
}));

// Daily aggregated statistics (updated for GMX v2)
export const dailyStats = onchainTable("daily_stats", (t) => ({
  id: t.text().primaryKey(), // date-chain (e.g., "2024-01-01-mantleSepolia")
  date: t.text().notNull(),
  chain: t.text().notNull(),
  totalVolumeUsd: t.bigint().notNull().default(0n),
  totalSwapVolumeUsd: t.bigint().notNull().default(0n),
  totalPositionVolumeUsd: t.bigint().notNull().default(0n),
  totalFees: t.bigint().notNull().default(0n),
  totalLiquidations: t.integer().notNull().default(0),
  totalLiquidationVolume: t.bigint().notNull().default(0n),
  uniqueUsers: t.integer().notNull().default(0),
  totalDeposits: t.bigint().notNull().default(0n),
  totalWithdrawals: t.bigint().notNull().default(0n),
  openInterestLong: t.bigint().notNull().default(0n),
  openInterestShort: t.bigint().notNull().default(0n),
}));

// Relations for GMX v2 tables
export const accountRelations = relations(account, ({ many }) => ({
  depositEvents: many(depositEvent),
  withdrawalEvents: many(withdrawalEvent),
  orderEvents: many(orderEventV2),
  positionEvents: many(positionEventV2),
  swapEvents: many(swapEventV2),
}));

export const marketRelations = relations(market, ({ many }) => ({
  deposits: many(depositEvent),
  withdrawals: many(withdrawalEvent),
  orders: many(orderEventV2),
  positions: many(positionEventV2),
}));