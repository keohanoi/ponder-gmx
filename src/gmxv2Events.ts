import { ponder } from "ponder:registry";
import {
  account,
  market,
  depositEvent,
  withdrawalEvent,
  orderEventV2,
  positionEventV2,
  swapEventV2,
  dailyStats,
  positionFeesInfo,
  swapFeesInfo,
  collectedMarketFeesInfo,
  swapFeesInfoWithPeriod,
  positionFeesInfoWithPeriod,
  tokenPrice,
  userGmTokensBalanceChange,
  latestUserGmTokensBalanceChangeRef,
  liquidityProviderIncentivesStat,
  incentivesStat,
  liquidityProviderInfo,
} from "ponder:schema";

// Helper to extract values from EventLog1 eventData
function getEventDataValue(eventData: any, key: string, type: 'address' | 'uint' | 'int' | 'bool' | 'bytes32' | 'string'): any {
  const itemsKey = `${type}Items`;
  const items = eventData[itemsKey]?.items || [];
  const item = items.find((i: any) => i.key === key);
  return item?.value;
}

// Helper function to get or create account
async function getOrCreateAccount(address: string, timestamp: number, context: any) {
  let accountRecord = await context.db.select(account).where({ address }).limit(1);

  if (accountRecord.length === 0) {
    await context.db.insert(account).values({
      address,
      firstSeenAt: timestamp,
      lastActiveAt: timestamp,
      totalTradingVolume: 0n,
      totalPositions: 0,
      totalLiquidations: 0,
      realizedPnl: 0n,
    });
  } else {
    await context.db.update(account)
      .set({ lastActiveAt: timestamp })
      .where({ address });
  }
}

// Helper to convert timestamp to period start
function timestampToPeriodStart(timestamp: number, period: "1h" | "1d" | "1w"): number {
  const HOUR = 3600;
  const DAY = 86400;
  const WEEK = 604800;

  const periodSeconds = period === "1h" ? HOUR : period === "1d" ? DAY : WEEK;
  return Math.floor(timestamp / periodSeconds) * periodSeconds;
}

// Helper to get or create daily stats
async function getOrCreateDailyStats(date: string, chain: string, context: any) {
  const id = `${date}-${chain}`;
  let stats = await context.db.select(dailyStats).where({ id }).limit(1);

  if (stats.length === 0) {
    await context.db.insert(dailyStats).values({
      id,
      date,
      chain,
      totalVolumeUsd: 0n,
      totalSwapVolumeUsd: 0n,
      totalPositionVolumeUsd: 0n,
      totalFees: 0n,
      totalPositionFees: 0n,
      totalSwapFees: 0n,
      totalBorrowingFees: 0n,
      totalFundingFees: 0n,
      totalLiquidationFees: 0n,
      totalAffiliateRewards: 0n,
      totalLiquidations: 0,
      totalLiquidationVolume: 0n,
      uniqueUsers: 0,
      totalDeposits: 0n,
      totalWithdrawals: 0n,
      openInterestLong: 0n,
      openInterestShort: 0n,
    });
    stats = await context.db.select(dailyStats).where({ id }).limit(1);
  }

  return stats[0];
}

// Helper to update GM token balance for a user
async function saveUserGmTokensBalanceChange(
  accountAddress: string,
  marketAddress: string,
  balanceDelta: bigint,
  timestamp: number,
  txHash: string,
  logIndex: number,
  context: any
) {
  // Get latest balance
  const refId = `${accountAddress}:${marketAddress}`;
  let latestBalance = 0n;
  let index = 0n;

  const latestRef = await context.db
    .select(latestUserGmTokensBalanceChangeRef)
    .where({ id: refId })
    .limit(1);

  if (latestRef.length > 0 && latestRef[0].latestBalanceChangeId) {
    const latest = await context.db
      .select(userGmTokensBalanceChange)
      .where({ id: latestRef[0].latestBalanceChangeId })
      .limit(1);

    if (latest.length > 0) {
      latestBalance = latest[0].tokensBalance;
      index = latest[0].index + 1n;
    }
  }

  const newBalance = latestBalance + balanceDelta;
  const changeId = `${accountAddress}:${marketAddress}:${txHash}:${logIndex}`;

  // Save balance change
  await context.db.insert(userGmTokensBalanceChange).values({
    id: changeId,
    account: accountAddress,
    marketAddress,
    tokensBalance: newBalance,
    timestamp,
    cumulativeIncome: 0n, // TODO: Calculate based on feeUsdPerGmToken
    cumulativeFeeUsdPerGmToken: 0n, // TODO: Get from collectedMarketFeesInfo
    index,
    transactionHash: txHash,
    logIndex,
  });

  // Update reference
  if (latestRef.length === 0) {
    await context.db.insert(latestUserGmTokensBalanceChangeRef).values({
      id: refId,
      latestBalanceChangeId: changeId,
    });
  } else {
    await context.db.update(latestUserGmTokensBalanceChangeRef)
      .set({ latestBalanceChangeId: changeId })
      .where({ id: refId });
  }

  // Update LP info
  const lpInfoId = `${accountAddress}:${marketAddress}`;
  const existingLpInfo = await context.db
    .select(liquidityProviderInfo)
    .where({ id: lpInfoId })
    .limit(1);

  if (existingLpInfo.length === 0) {
    await context.db.insert(liquidityProviderInfo).values({
      id: lpInfoId,
      account: accountAddress,
      marketAddress,
      tokensBalance: newBalance,
    });
  } else {
    await context.db.update(liquidityProviderInfo)
      .set({ tokensBalance: newBalance })
      .where({ id: lpInfoId });
  }
}

// Deposit Created Events
ponder.on("GMXv2EventEmitter:DepositCreated", async ({ event, context }) => {
  const timestamp = Number(event.block.timestamp);

  await getOrCreateAccount(event.args.account, timestamp, context);

  await context.db.insert(depositEvent).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    key: null, // Will be updated when we get the key from deposit execution
    account: event.args.account,
    market: event.args.market,
    token: event.args.token,
    tokensLong: event.args.tokensLong,
    tokensShort: event.args.tokensShort,
    marketTokens: event.args.marketTokens,
    status: "created",
    executionPrice: null,
    blockNumber: Number(event.block.number),
    timestamp,
    transactionHash: event.transaction.hash,
  });
});

// Deposit Executed Events
ponder.on("GMXv2EventEmitter:DepositExecuted", async ({ event, context }) => {
  const timestamp = Number(event.block.timestamp);
  const marketTokens = event.args.marketTokensLong + event.args.marketTokensShort;

  // Update the deposit record to executed status
  await context.db.update(depositEvent)
    .set({
      status: "executed",
      key: event.args.key,
    })
    .where({
      account: event.args.account,
      market: event.args.market,
      status: "created",
    });

  // Create an executed deposit event record
  await context.db.insert(depositEvent).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    key: event.args.key,
    account: event.args.account,
    market: event.args.market,
    token: "0x0000000000000000000000000000000000000000", // Not available in execution event
    tokensLong: event.args.tokensLong,
    tokensShort: event.args.tokensShort,
    marketTokens,
    status: "executed",
    executionPrice: null,
    blockNumber: Number(event.block.number),
    timestamp,
    transactionHash: event.transaction.hash,
  });

  // Track GM token balance change (deposit increases balance)
  await saveUserGmTokensBalanceChange(
    event.args.account,
    event.args.market,
    marketTokens, // Positive delta
    timestamp,
    event.transaction.hash,
    Number(event.log.logIndex),
    context
  );

  // Update market supply
  await context.db.update(market)
    .set(row => ({
      marketTokensSupply: row.marketTokensSupply + marketTokens,
      lastUpdatedBlock: Number(event.block.number),
      lastUpdatedTimestamp: timestamp,
    }))
    .where({ address: event.args.market });

  // Update daily stats
  const date = new Date(timestamp * 1000).toISOString().split('T')[0];

  await context.db.update(dailyStats)
    .set(row => ({
      totalDeposits: row.totalDeposits + marketTokens,
    }))
    .where({ id: `${date}-mantleSepolia` });
});

// Deposit Cancelled Events
ponder.on("GMXv2EventEmitter:DepositCancelled", async ({ event, context }) => {
  const timestamp = Number(event.block.timestamp);

  await context.db.update(depositEvent)
    .set({
      status: "cancelled",
      key: event.args.key,
    })
    .where({
      key: event.args.key,
    });
});

// Withdrawal Created Events
ponder.on("GMXv2EventEmitter:WithdrawalCreated", async ({ event, context }) => {
  const timestamp = Number(event.block.timestamp);

  await getOrCreateAccount(event.args.account, timestamp, context);

  await context.db.insert(withdrawalEvent).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    key: null, // Will be updated when we get the key from withdrawal execution
    account: event.args.account,
    market: event.args.market,
    marketTokens: event.args.marketTokens,
    minLongTokenAmount: event.args.minLongTokenAmount,
    minShortTokenAmount: event.args.minShortTokenAmount,
    longTokenAmount: null,
    shortTokenAmount: null,
    status: "created",
    blockNumber: Number(event.block.number),
    timestamp,
    transactionHash: event.transaction.hash,
  });
});

// Withdrawal Executed Events
ponder.on("GMXv2EventEmitter:WithdrawalExecuted", async ({ event, context }) => {
  const timestamp = Number(event.block.timestamp);

  // Update existing withdrawal or create executed record
  await context.db.insert(withdrawalEvent).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    key: event.args.key,
    account: event.args.account,
    market: event.args.market,
    marketTokens: event.args.marketTokens,
    minLongTokenAmount: 0n,
    minShortTokenAmount: 0n,
    longTokenAmount: event.args.longTokenAmount,
    shortTokenAmount: event.args.shortTokenAmount,
    status: "executed",
    blockNumber: Number(event.block.number),
    timestamp,
    transactionHash: event.transaction.hash,
  });

  // Track GM token balance change (withdrawal decreases balance)
  await saveUserGmTokensBalanceChange(
    event.args.account,
    event.args.market,
    -event.args.marketTokens, // Negative delta
    timestamp,
    event.transaction.hash,
    Number(event.log.logIndex),
    context
  );

  // Update market supply
  await context.db.update(market)
    .set(row => ({
      marketTokensSupply: row.marketTokensSupply - event.args.marketTokens,
      lastUpdatedBlock: Number(event.block.number),
      lastUpdatedTimestamp: timestamp,
    }))
    .where({ address: event.args.market });

  // Update daily stats
  const date = new Date(timestamp * 1000).toISOString().split('T')[0];

  await context.db.update(dailyStats)
    .set(row => ({
      totalWithdrawals: row.totalWithdrawals + event.args.marketTokens,
    }))
    .where({ id: `${date}-mantleSepolia` });
});

// Withdrawal Cancelled Events
ponder.on("GMXv2EventEmitter:WithdrawalCancelled", async ({ event, context }) => {
  await context.db.update(withdrawalEvent)
    .set({
      status: "cancelled",
      key: event.args.key,
    })
    .where({
      key: event.args.key,
    });
});

// Order Created Events
ponder.on("GMXv2EventEmitter:OrderCreated", async ({ event, context }) => {
  const timestamp = Number(event.block.timestamp);

  await getOrCreateAccount(event.args.account, timestamp, context);

  await context.db.insert(orderEventV2).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    key: null, // Will be updated when we get the key from order execution
    account: event.args.account,
    market: event.args.market,
    collateralToken: event.args.collateralToken,
    sizeInUsd: event.args.sizeInUsd,
    sizeInTokens: event.args.sizeInTokens,
    collateralDeltaAmount: event.args.collateralDeltaAmount,
    executionPrice: event.args.executionPrice,
    isLong: event.args.isLong,
    orderType: Number(event.args.orderType),
    status: "created",
    blockNumber: Number(event.block.number),
    timestamp,
    transactionHash: event.transaction.hash,
  });
});

// Order Executed Events
ponder.on("GMXv2EventEmitter:OrderExecuted", async ({ event, context }) => {
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(orderEventV2).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    key: event.args.key,
    account: event.args.account,
    market: event.args.market,
    collateralToken: event.args.collateralToken,
    sizeInUsd: event.args.sizeInUsd,
    sizeInTokens: event.args.sizeInTokens,
    collateralDeltaAmount: event.args.collateralDeltaAmount,
    executionPrice: event.args.executionPrice,
    isLong: event.args.isLong,
    orderType: 0, // Default market order
    status: "executed",
    blockNumber: Number(event.block.number),
    timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update account stats
  await context.db.update(account)
    .set(row => ({
      totalTradingVolume: row.totalTradingVolume + event.args.sizeInUsd,
    }))
    .where({ address: event.args.account });
});

// Order Cancelled Events
ponder.on("GMXv2EventEmitter:OrderCancelled", async ({ event, context }) => {
  await context.db.update(orderEventV2)
    .set({
      status: "cancelled",
      key: event.args.key,
    })
    .where({
      key: event.args.key,
    });
});

// Position Increase Events
ponder.on("GMXv2EventEmitter:PositionIncrease", async ({ event, context }) => {
  const timestamp = Number(event.block.timestamp);

  await getOrCreateAccount(event.args.account, timestamp, context);

  // TODO: When EventLog format is available, extract these from event.args.eventData:
  // - positionFeeAmount, borrowingFeeAmount, fundingFeeAmount
  // - collateralTokenPriceMin/Max, indexTokenPriceMin/Max
  // - priceImpactAmount, priceImpactDiffUsd, basePnlUsd
  // - borrowingFactor, longTokenFundingAmountPerSize, shortTokenFundingAmountPerSize
  // - affiliate address, rebate amounts

  const positionFeeAmount = 0n; // TODO: Extract from eventData
  const borrowingFeeAmount = 0n; // TODO: Extract from eventData
  const fundingFeeAmount = 0n; // TODO: Extract from eventData
  const feeUsdForPool = 0n; // TODO: Extract from eventData

  await context.db.insert(positionEventV2).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    account: event.args.account,
    market: event.args.market,
    collateralToken: event.args.collateralToken,
    eventType: "increase",
    sizeInUsd: event.args.sizeInUsd,
    sizeInTokens: event.args.sizeInTokens,
    collateralDeltaAmount: event.args.collateralDeltaAmount,
    executionPrice: event.args.executionPrice,
    realizedPnlUsd: 0n,
    isLong: event.args.isLong,

    // Fee fields (defaults until EventLog format added)
    positionFeeAmount,
    borrowingFeeAmount,
    fundingFeeAmount,
    liquidationFeeAmount: 0n,
    feeUsdForPool,
    totalRebateAmount: 0n,
    traderDiscountAmount: 0n,
    affiliateRewardAmount: 0n,
    affiliateAddress: null,

    // Price fields (defaults until EventLog format added)
    collateralTokenPriceMin: null,
    collateralTokenPriceMax: null,
    indexTokenPriceMin: null,
    indexTokenPriceMax: null,
    priceImpactAmount: 0n,
    priceImpactDiffUsd: 0n,
    basePnlUsd: 0n,

    // Funding/borrowing fields (defaults until EventLog format added)
    borrowingFactor: 0n,
    longTokenFundingAmountPerSize: 0n,
    shortTokenFundingAmountPerSize: 0n,

    blockNumber: Number(event.block.number),
    timestamp,
    transactionHash: event.transaction.hash,
  });

  // Create position fees info record (when data available)
  // TODO: Uncomment when EventLog format is available
  // await context.db.insert(positionFeesInfo).values({
  //   id: `${event.transaction.hash}-${event.log.logIndex}`,
  //   orderKey: null,
  //   eventName: "PositionIncrease",
  //   marketAddress: event.args.market,
  //   collateralTokenAddress: event.args.collateralToken,
  //   trader: event.args.account,
  //   affiliate: null, // TODO: Extract from eventData
  //   collateralTokenPriceMin: null,
  //   collateralTokenPriceMax: null,
  //   positionFeeAmount,
  //   borrowingFeeAmount,
  //   fundingFeeAmount,
  //   liquidationFeeAmount: null,
  //   feeUsdForPool,
  //   totalRebateFactor: 0n,
  //   totalRebateAmount: 0n,
  //   traderDiscountAmount: 0n,
  //   affiliateRewardAmount: 0n,
  //   blockNumber: Number(event.block.number),
  //   timestamp,
  //   transactionHash: event.transaction.hash,
  // });

  // Update account position count
  await context.db.update(account)
    .set(row => ({
      totalPositions: row.totalPositions + 1,
    }))
    .where({ address: event.args.account });

  // Update daily stats
  const date = new Date(timestamp * 1000).toISOString().split('T')[0];
  const totalFees = positionFeeAmount + borrowingFeeAmount + fundingFeeAmount;

  await context.db.update(dailyStats)
    .set(row => ({
      totalPositionVolumeUsd: row.totalPositionVolumeUsd + event.args.sizeInUsd,
      totalVolumeUsd: row.totalVolumeUsd + event.args.sizeInUsd,
      totalFees: row.totalFees + totalFees,
      totalPositionFees: row.totalPositionFees + positionFeeAmount,
      totalBorrowingFees: row.totalBorrowingFees + borrowingFeeAmount,
      totalFundingFees: row.totalFundingFees + fundingFeeAmount,
    }))
    .where({ id: `${date}-mantleSepolia` });
});

// Position Decrease Events
ponder.on("GMXv2EventEmitter:PositionDecrease", async ({ event, context }) => {
  const timestamp = Number(event.block.timestamp);

  await getOrCreateAccount(event.args.account, timestamp, context);

  const positionFeeAmount = 0n; // TODO: Extract from eventData
  const borrowingFeeAmount = 0n; // TODO: Extract from eventData
  const fundingFeeAmount = 0n; // TODO: Extract from eventData
  const feeUsdForPool = 0n; // TODO: Extract from eventData

  await context.db.insert(positionEventV2).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    account: event.args.account,
    market: event.args.market,
    collateralToken: event.args.collateralToken,
    eventType: "decrease",
    sizeInUsd: event.args.sizeInUsd,
    sizeInTokens: event.args.sizeInTokens,
    collateralDeltaAmount: event.args.collateralDeltaAmount,
    executionPrice: event.args.executionPrice,
    realizedPnlUsd: event.args.realizedPnlUsd,
    isLong: event.args.isLong,

    // Fee fields (defaults until EventLog format added)
    positionFeeAmount,
    borrowingFeeAmount,
    fundingFeeAmount,
    liquidationFeeAmount: 0n,
    feeUsdForPool,
    totalRebateAmount: 0n,
    traderDiscountAmount: 0n,
    affiliateRewardAmount: 0n,
    affiliateAddress: null,

    // Price fields (defaults until EventLog format added)
    collateralTokenPriceMin: null,
    collateralTokenPriceMax: null,
    indexTokenPriceMin: null,
    indexTokenPriceMax: null,
    priceImpactAmount: 0n,
    priceImpactDiffUsd: 0n,
    basePnlUsd: event.args.realizedPnlUsd, // Use realized PnL as base

    // Funding/borrowing fields (defaults until EventLog format added)
    borrowingFactor: 0n,
    longTokenFundingAmountPerSize: 0n,
    shortTokenFundingAmountPerSize: 0n,

    blockNumber: Number(event.block.number),
    timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update account realized P&L
  await context.db.update(account)
    .set(row => ({
      realizedPnl: row.realizedPnl + event.args.realizedPnlUsd,
    }))
    .where({ address: event.args.account });

  // Update daily stats
  const date = new Date(timestamp * 1000).toISOString().split('T')[0];
  const totalFees = positionFeeAmount + borrowingFeeAmount + fundingFeeAmount;

  await context.db.update(dailyStats)
    .set(row => ({
      totalPositionVolumeUsd: row.totalPositionVolumeUsd + event.args.sizeInUsd,
      totalVolumeUsd: row.totalVolumeUsd + event.args.sizeInUsd,
      totalFees: row.totalFees + totalFees,
      totalPositionFees: row.totalPositionFees + positionFeeAmount,
      totalBorrowingFees: row.totalBorrowingFees + borrowingFeeAmount,
      totalFundingFees: row.totalFundingFees + fundingFeeAmount,
    }))
    .where({ id: `${date}-mantleSepolia` });
});

// Position Liquidation Events
ponder.on("GMXv2EventEmitter:PositionLiquidated", async ({ event, context }) => {
  const timestamp = Number(event.block.timestamp);

  await getOrCreateAccount(event.args.account, timestamp, context);

  const positionFeeAmount = 0n; // TODO: Extract from eventData
  const borrowingFeeAmount = 0n; // TODO: Extract from eventData
  const fundingFeeAmount = 0n; // TODO: Extract from eventData
  const liquidationFeeAmount = 0n; // TODO: Extract from eventData
  const feeUsdForPool = 0n; // TODO: Extract from eventData

  await context.db.insert(positionEventV2).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    account: event.args.account,
    market: event.args.market,
    collateralToken: event.args.collateralToken,
    eventType: "liquidate",
    sizeInUsd: event.args.sizeInUsd,
    sizeInTokens: event.args.sizeInTokens,
    collateralDeltaAmount: event.args.collateralAmount,
    executionPrice: event.args.markPrice,
    realizedPnlUsd: event.args.realizedPnlUsd,
    isLong: event.args.isLong,

    // Fee fields (defaults until EventLog format added)
    positionFeeAmount,
    borrowingFeeAmount,
    fundingFeeAmount,
    liquidationFeeAmount, // Liquidation-specific fee
    feeUsdForPool,
    totalRebateAmount: 0n,
    traderDiscountAmount: 0n,
    affiliateRewardAmount: 0n,
    affiliateAddress: null,

    // Price fields (defaults until EventLog format added)
    collateralTokenPriceMin: null,
    collateralTokenPriceMax: null,
    indexTokenPriceMin: null,
    indexTokenPriceMax: null,
    priceImpactAmount: 0n,
    priceImpactDiffUsd: 0n,
    basePnlUsd: event.args.realizedPnlUsd,

    // Funding/borrowing fields (defaults until EventLog format added)
    borrowingFactor: 0n,
    longTokenFundingAmountPerSize: 0n,
    shortTokenFundingAmountPerSize: 0n,

    blockNumber: Number(event.block.number),
    timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update account liquidation count
  await context.db.update(account)
    .set(row => ({
      totalLiquidations: row.totalLiquidations + 1,
      realizedPnl: row.realizedPnl + event.args.realizedPnlUsd,
    }))
    .where({ address: event.args.account });

  // Update daily stats
  const date = new Date(timestamp * 1000).toISOString().split('T')[0];
  const totalFees = positionFeeAmount + borrowingFeeAmount + fundingFeeAmount + liquidationFeeAmount;

  await context.db.update(dailyStats)
    .set(row => ({
      totalLiquidations: row.totalLiquidations + 1,
      totalLiquidationVolume: row.totalLiquidationVolume + event.args.sizeInUsd,
      totalFees: row.totalFees + totalFees,
      totalPositionFees: row.totalPositionFees + positionFeeAmount,
      totalBorrowingFees: row.totalBorrowingFees + borrowingFeeAmount,
      totalFundingFees: row.totalFundingFees + fundingFeeAmount,
      totalLiquidationFees: row.totalLiquidationFees + liquidationFeeAmount,
    }))
    .where({ id: `${date}-mantleSepolia` });
});

// Swap Executed Events
ponder.on("GMXv2EventEmitter:SwapExecuted", async ({ event, context }) => {
  const timestamp = Number(event.block.timestamp);

  await getOrCreateAccount(event.args.account, timestamp, context);

  // TODO: Extract from eventData when available
  const swapFeeAmount = 0n;
  const feeUsdForPool = 0n;

  await context.db.insert(swapEventV2).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    account: event.args.account,
    tokenIn: event.args.tokenIn,
    tokenOut: event.args.tokenOut,
    amountIn: event.args.amountIn,
    amountOut: event.args.amountOut,
    priceImpactUsd: event.args.priceImpactUsd,

    // Fee fields (defaults until EventLog format added)
    swapFeeType: null, // TODO: Determine type (swap/deposit/withdrawal/atomic)
    feeReceiverAmount: swapFeeAmount,
    feeUsdForPool,

    // Price fields (defaults until EventLog format added)
    tokenInPrice: null, // TODO: Extract from eventData
    tokenOutPrice: null, // TODO: Extract from eventData
    priceImpactAmount: 0n, // TODO: Extract from eventData

    blockNumber: Number(event.block.number),
    timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update account trading volume (approximate USD value)
  await context.db.update(account)
    .set(row => ({
      totalTradingVolume: row.totalTradingVolume + event.args.amountIn,
    }))
    .where({ address: event.args.account });

  // Update daily stats
  const date = new Date(timestamp * 1000).toISOString().split('T')[0];

  await context.db.update(dailyStats)
    .set(row => ({
      totalSwapVolumeUsd: row.totalSwapVolumeUsd + event.args.amountIn,
      totalVolumeUsd: row.totalVolumeUsd + event.args.amountIn,
      totalFees: row.totalFees + swapFeeAmount,
      totalSwapFees: row.totalSwapFees + swapFeeAmount,
    }))
    .where({ id: `${date}-mantleSepolia` });
});