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

  // Market state tracking
  marketTokensSupply: t.bigint().notNull().default(0n),
  poolValueUsd: t.bigint().notNull().default(0n),
  lastUpdatedBlock: t.integer().notNull().default(0),
  lastUpdatedTimestamp: t.integer().notNull().default(0),
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

  // Fee breakdown fields
  positionFeeAmount: t.bigint().default(0n),
  borrowingFeeAmount: t.bigint().default(0n),
  fundingFeeAmount: t.bigint().default(0n),
  liquidationFeeAmount: t.bigint().default(0n),
  feeUsdForPool: t.bigint().default(0n),
  totalRebateAmount: t.bigint().default(0n),
  traderDiscountAmount: t.bigint().default(0n),
  affiliateRewardAmount: t.bigint().default(0n),
  affiliateAddress: t.hex(),

  // Price tracking fields
  collateralTokenPriceMin: t.bigint(),
  collateralTokenPriceMax: t.bigint(),
  indexTokenPriceMin: t.bigint(),
  indexTokenPriceMax: t.bigint(),
  priceImpactAmount: t.bigint().default(0n),
  priceImpactDiffUsd: t.bigint().default(0n),
  basePnlUsd: t.bigint().default(0n),

  // Funding & borrowing fields
  borrowingFactor: t.bigint().default(0n),
  longTokenFundingAmountPerSize: t.bigint().default(0n),
  shortTokenFundingAmountPerSize: t.bigint().default(0n),

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

  // Fee fields
  swapFeeType: t.text(),
  feeReceiverAmount: t.bigint().default(0n),
  feeUsdForPool: t.bigint().default(0n),

  // Price tracking
  tokenInPrice: t.bigint(),
  tokenOutPrice: t.bigint(),
  priceImpactAmount: t.bigint().default(0n),

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

  // Fee breakdown by type
  totalPositionFees: t.bigint().notNull().default(0n),
  totalSwapFees: t.bigint().notNull().default(0n),
  totalBorrowingFees: t.bigint().notNull().default(0n),
  totalFundingFees: t.bigint().notNull().default(0n),
  totalLiquidationFees: t.bigint().notNull().default(0n),
  totalAffiliateRewards: t.bigint().notNull().default(0n),

  totalLiquidations: t.integer().notNull().default(0),
  totalLiquidationVolume: t.bigint().notNull().default(0n),
  uniqueUsers: t.integer().notNull().default(0),
  totalDeposits: t.bigint().notNull().default(0n),
  totalWithdrawals: t.bigint().notNull().default(0n),
  openInterestLong: t.bigint().notNull().default(0n),
  openInterestShort: t.bigint().notNull().default(0n),
}));

// Position Fees Info - Detailed fee breakdown per position event
export const positionFeesInfo = onchainTable("position_fees_info", (t) => ({
  id: t.text().primaryKey(), // orderKey:eventName or txHash-logIndex
  orderKey: t.text(),
  eventName: t.text().notNull(), // "PositionIncrease" | "PositionDecrease" | "PositionLiquidated"
  marketAddress: t.hex().notNull(),
  collateralTokenAddress: t.hex().notNull(),
  trader: t.hex().notNull(),
  affiliate: t.hex(),

  // Token prices at execution
  collateralTokenPriceMin: t.bigint(),
  collateralTokenPriceMax: t.bigint(),

  // Fee breakdown
  positionFeeAmount: t.bigint().notNull().default(0n),
  borrowingFeeAmount: t.bigint().notNull().default(0n),
  fundingFeeAmount: t.bigint().notNull().default(0n),
  liquidationFeeAmount: t.bigint().default(0n),
  feeUsdForPool: t.bigint().notNull().default(0n),

  // Rebate/discount system
  totalRebateFactor: t.bigint().notNull().default(0n),
  totalRebateAmount: t.bigint().notNull().default(0n),
  traderDiscountAmount: t.bigint().notNull().default(0n),
  affiliateRewardAmount: t.bigint().notNull().default(0n),

  blockNumber: t.integer().notNull(),
  timestamp: t.integer().notNull(),
  transactionHash: t.text().notNull(),
}));

// Swap Fees Info - Swap fee details
export const swapFeesInfo = onchainTable("swap_fees_info", (t) => ({
  id: t.text().primaryKey(), // txHash-logIndex
  marketAddress: t.hex().notNull(),
  tokenAddress: t.hex().notNull(),
  swapFeeType: t.text().notNull(), // "swap" | "deposit" | "withdrawal" | "atomic"
  tokenPrice: t.bigint().notNull(),
  feeReceiverAmount: t.bigint().notNull().default(0n),
  feeUsdForPool: t.bigint().notNull().default(0n),
  blockNumber: t.integer().notNull(),
  timestamp: t.integer().notNull(),
  transactionHash: t.text().notNull(),
}));

// Collected Market Fees Info - Period-based fee aggregations
export const collectedMarketFeesInfo = onchainTable("collected_market_fees_info", (t) => ({
  id: t.text().primaryKey(), // marketAddress:period:timestampGroup
  period: t.text().notNull(), // "1h" | "1d" | "total"
  marketAddress: t.hex().notNull(),
  timestampGroup: t.integer().notNull(),
  feeUsdForPool: t.bigint().notNull().default(0n),
  cumulativeFeeUsdForPool: t.bigint().notNull().default(0n),
  feeUsdPerPoolValue: t.bigint().notNull().default(0n),
  cumulativeFeeUsdPerPoolValue: t.bigint().notNull().default(0n),
  feeUsdPerGmToken: t.bigint().notNull().default(0n),
  cumulativeFeeUsdPerGmToken: t.bigint().notNull().default(0n),
  prevCumulativeFeeUsdPerGmToken: t.bigint().notNull().default(0n),
}));

// Swap Fees With Period - Daily aggregations
export const swapFeesInfoWithPeriod = onchainTable("swap_fees_info_with_period", (t) => ({
  id: t.text().primaryKey(), // timestampGroup | "total"
  period: t.text().notNull(), // "1d" | "total"
  totalFeeReceiverUsd: t.bigint().notNull().default(0n),
  totalFeeUsdForPool: t.bigint().notNull().default(0n),
}));

// Position Fees With Period - Daily aggregations
export const positionFeesInfoWithPeriod = onchainTable("position_fees_info_with_period", (t) => ({
  id: t.text().primaryKey(), // timestampGroup | "total"
  period: t.text().notNull(), // "1d" | "total"
  totalPositionFeeAmount: t.bigint().notNull().default(0n),
  totalPositionFeeUsd: t.bigint().notNull().default(0n),
  totalBorrowingFeeUsd: t.bigint().notNull().default(0n),
  totalLiquidationFeeAmount: t.bigint().notNull().default(0n),
  totalLiquidationFeeUsd: t.bigint().notNull().default(0n),
}));

// Token Price - Price tracking for tokens
export const tokenPrice = onchainTable("token_price", (t) => ({
  id: t.hex().primaryKey(), // tokenAddress
  tokenAddress: t.hex().notNull(),
  minPrice: t.bigint().notNull(),
  maxPrice: t.bigint().notNull(),
  lastUpdatedBlock: t.integer().notNull(),
  lastUpdatedTimestamp: t.integer().notNull(),
}));

// Funding Rate Update - Historical funding rates (optional)
export const fundingRateUpdate = onchainTable("funding_rate_update", (t) => ({
  id: t.text().primaryKey(), // marketAddress:timestamp
  marketAddress: t.hex().notNull(),
  longTokenFundingAmountPerSize: t.bigint().notNull(),
  shortTokenFundingAmountPerSize: t.bigint().notNull(),
  blockNumber: t.integer().notNull(),
  timestamp: t.integer().notNull(),
}));

// User GM Tokens Balance Change - GM token balance snapshots
export const userGmTokensBalanceChange = onchainTable("user_gm_tokens_balance_change", (t) => ({
  id: t.text().primaryKey(), // account:marketAddress:txHash:logIndex
  account: t.hex().notNull(),
  marketAddress: t.hex().notNull(),
  tokensBalance: t.bigint().notNull(),
  timestamp: t.integer().notNull(),
  cumulativeIncome: t.bigint().notNull().default(0n),
  cumulativeFeeUsdPerGmToken: t.bigint().notNull().default(0n),
  index: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
  logIndex: t.integer().notNull(),
}));

// Latest User GM Balance Ref - Reference to latest balance change
export const latestUserGmTokensBalanceChangeRef = onchainTable("latest_user_gm_balance_ref", (t) => ({
  id: t.text().primaryKey(), // account:marketAddress
  latestBalanceChangeId: t.text(),
}));

// Liquidity Provider Incentives Stat - Time-weighted LP tracking
export const liquidityProviderIncentivesStat = onchainTable("lp_incentives_stat", (t) => ({
  id: t.text().primaryKey(), // account:marketAddress:period:timestamp
  period: t.text().notNull(), // "1w"
  timestamp: t.integer().notNull(),
  account: t.hex().notNull(),
  marketAddress: t.hex().notNull(),
  updatedTimestamp: t.integer().notNull(),
  lastTokensBalance: t.bigint().notNull().default(0n),
  cumulativeTimeByTokensBalance: t.bigint().notNull().default(0n),
  weightedAverageTokensBalance: t.bigint().notNull().default(0n),
}));

// Incentives Stat - Pool-level incentives tracking
export const incentivesStat = onchainTable("incentives_stat", (t) => ({
  id: t.text().primaryKey(), // marketAddress:period:timestamp
  period: t.text().notNull(), // "1w"
  timestamp: t.integer().notNull(),
  marketAddress: t.hex().notNull(),
  updatedTimestamp: t.integer().notNull(),
  lastTokensSupply: t.bigint().notNull().default(0n),
  cumulativeTimeByTokensSupply: t.bigint().notNull().default(0n),
  weightedAverageTokensSupply: t.bigint().notNull().default(0n),
}));

// Liquidity Provider Info - Current LP position
export const liquidityProviderInfo = onchainTable("lp_info", (t) => ({
  id: t.text().primaryKey(), // account:marketAddress
  account: t.hex().notNull(),
  marketAddress: t.hex().notNull(),
  tokensBalance: t.bigint().notNull().default(0n),
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
  positionFees: many(positionFeesInfo),
  swapFees: many(swapFeesInfo),
  collectedFees: many(collectedMarketFeesInfo),
  gmBalanceChanges: many(userGmTokensBalanceChange),
  lpIncentives: many(liquidityProviderIncentivesStat),
  incentives: many(incentivesStat),
  lpInfo: many(liquidityProviderInfo),
}));

export const positionFeesInfoRelations = relations(positionFeesInfo, ({ one }) => ({
  market: one(market, {
    fields: [positionFeesInfo.marketAddress],
    references: [market.address],
  }),
}));

export const swapFeesInfoRelations = relations(swapFeesInfo, ({ one }) => ({
  market: one(market, {
    fields: [swapFeesInfo.marketAddress],
    references: [market.address],
  }),
}));

export const userGmTokensBalanceChangeRelations = relations(userGmTokensBalanceChange, ({ one }) => ({
  account: one(account, {
    fields: [userGmTokensBalanceChange.account],
    references: [account.address],
  }),
  market: one(market, {
    fields: [userGmTokensBalanceChange.marketAddress],
    references: [market.address],
  }),
}));

export const liquidityProviderIncentivesStatRelations = relations(liquidityProviderIncentivesStat, ({ one }) => ({
  account: one(account, {
    fields: [liquidityProviderIncentivesStat.account],
    references: [account.address],
  }),
  market: one(market, {
    fields: [liquidityProviderIncentivesStat.marketAddress],
    references: [market.address],
  }),
}));

export const liquidityProviderInfoRelations = relations(liquidityProviderInfo, ({ one }) => ({
  account: one(account, {
    fields: [liquidityProviderInfo.account],
    references: [account.address],
  }),
  market: one(market, {
    fields: [liquidityProviderInfo.marketAddress],
    references: [market.address],
  }),
}));