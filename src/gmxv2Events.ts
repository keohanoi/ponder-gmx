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
} from "ponder:schema";

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
    marketTokens: event.args.marketTokensLong + event.args.marketTokensShort,
    status: "executed",
    executionPrice: null,
    blockNumber: Number(event.block.number),
    timestamp,
    transactionHash: event.transaction.hash,
  });
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
    blockNumber: Number(event.block.number),
    timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update account position count
  await context.db.update(account)
    .set(row => ({
      totalPositions: row.totalPositions + 1,
    }))
    .where({ address: event.args.account });
});

// Position Decrease Events
ponder.on("GMXv2EventEmitter:PositionDecrease", async ({ event, context }) => {
  const timestamp = Number(event.block.timestamp);

  await getOrCreateAccount(event.args.account, timestamp, context);

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
});

// Position Liquidation Events
ponder.on("GMXv2EventEmitter:PositionLiquidated", async ({ event, context }) => {
  const timestamp = Number(event.block.timestamp);

  await getOrCreateAccount(event.args.account, timestamp, context);

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
});

// Swap Executed Events
ponder.on("GMXv2EventEmitter:SwapExecuted", async ({ event, context }) => {
  const timestamp = Number(event.block.timestamp);

  await getOrCreateAccount(event.args.account, timestamp, context);

  await context.db.insert(swapEventV2).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    account: event.args.account,
    tokenIn: event.args.tokenIn,
    tokenOut: event.args.tokenOut,
    amountIn: event.args.amountIn,
    amountOut: event.args.amountOut,
    priceImpactUsd: event.args.priceImpactUsd,
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
});