// EventLog1 handler for detailed fee and price data extraction
import { ponder } from "ponder:registry";
import {
  positionFeesInfo,
  swapFeesInfo,
  tokenPrice,
} from "ponder:schema";

// Helper to extract values from EventLog1 eventData
function getEventDataValue(eventData: any, key: string, type: 'address' | 'uint' | 'int' | 'bool' | 'bytes32' | 'string'): any {
  const itemsKey = `${type}Items`;
  const items = eventData[itemsKey]?.items || [];
  const item = items.find((i: any) => i.key === key);
  return item?.value;
}

// EventLog1 handler - Captures detailed fee and price data
ponder.on("GMXv2EventEmitter:EventLog1", async ({ event, context }) => {
  const eventName = event.args.eventName;
  const eventData = event.args.eventData;
  const timestamp = Number(event.block.timestamp);

  // Handle PositionFeesCollected event
  if (eventName === "PositionFeesCollected") {
    const orderKey = getEventDataValue(eventData, "orderKey", "bytes32");
    const marketAddress = getEventDataValue(eventData, "market", "address");
    const collateralToken = getEventDataValue(eventData, "collateralToken", "address");
    const trader = getEventDataValue(eventData, "trader", "address");
    const affiliate = getEventDataValue(eventData, "affiliate", "address");

    // Fee amounts
    const positionFeeAmount = getEventDataValue(eventData, "positionFeeAmount", "uint") || 0n;
    const borrowingFeeAmount = getEventDataValue(eventData, "borrowingFeeUsd", "uint") || 0n;
    const fundingFeeAmount = getEventDataValue(eventData, "fundingFeeAmount", "int") || 0n;
    const liquidationFeeAmount = getEventDataValue(eventData, "liquidationFeeAmount", "uint") || 0n;
    const feeUsdForPool = getEventDataValue(eventData, "feeUsdForPool", "uint") || 0n;

    // Rebates and discounts
    const totalRebateFactor = getEventDataValue(eventData, "totalRebateFactor", "uint") || 0n;
    const totalRebateAmount = getEventDataValue(eventData, "totalRebateAmount", "uint") || 0n;
    const traderDiscountAmount = getEventDataValue(eventData, "traderDiscountAmount", "uint") || 0n;
    const affiliateRewardAmount = getEventDataValue(eventData, "affiliateRewardAmount", "uint") || 0n;

    // Prices
    const collateralTokenPriceMin = getEventDataValue(eventData, "collateralTokenPrice.min", "uint");
    const collateralTokenPriceMax = getEventDataValue(eventData, "collateralTokenPrice.max", "uint");

    // Create position fees info record
    await context.db.insert(positionFeesInfo).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      orderKey: orderKey ? `0x${orderKey.toString(16)}` : null,
      eventName: "PositionFeesCollected",
      marketAddress,
      collateralTokenAddress: collateralToken,
      trader,
      affiliate,
      collateralTokenPriceMin,
      collateralTokenPriceMax,
      positionFeeAmount,
      borrowingFeeAmount,
      fundingFeeAmount,
      liquidationFeeAmount,
      feeUsdForPool,
      totalRebateFactor,
      totalRebateAmount,
      traderDiscountAmount,
      affiliateRewardAmount,
      blockNumber: Number(event.block.number),
      timestamp,
      transactionHash: event.transaction.hash,
    });
  }

  // Handle SwapFeesCollected event
  if (eventName === "SwapFeesCollected") {
    const marketAddress = getEventDataValue(eventData, "market", "address");
    const tokenAddress = getEventDataValue(eventData, "token", "address");
    const tokenPrice = getEventDataValue(eventData, "tokenPrice", "uint");
    const feeReceiverAmount = getEventDataValue(eventData, "feeReceiverAmount", "uint") || 0n;
    const feeUsdForPool = getEventDataValue(eventData, "feeAmountForPool", "uint") || 0n;
    const swapFeeType = getEventDataValue(eventData, "swapFeeType", "string") || "swap";

    await context.db.insert(swapFeesInfo).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      marketAddress,
      tokenAddress,
      swapFeeType,
      tokenPrice,
      feeReceiverAmount,
      feeUsdForPool,
      blockNumber: Number(event.block.number),
      timestamp,
      transactionHash: event.transaction.hash,
    });
  }

  // Handle OraclePriceUpdate event for token price tracking
  if (eventName === "OraclePriceUpdate") {
    const token = getEventDataValue(eventData, "token", "address");
    const minPrice = getEventDataValue(eventData, "minPrice", "uint");
    const maxPrice = getEventDataValue(eventData, "maxPrice", "uint");

    if (token && minPrice && maxPrice) {
      const existing = await context.db.select(tokenPrice).where({ id: token }).limit(1);

      if (existing.length === 0) {
        await context.db.insert(tokenPrice).values({
          id: token,
          tokenAddress: token,
          minPrice,
          maxPrice,
          lastUpdatedBlock: Number(event.block.number),
          lastUpdatedTimestamp: timestamp,
        });
      } else {
        await context.db.update(tokenPrice)
          .set({
            minPrice,
            maxPrice,
            lastUpdatedBlock: Number(event.block.number),
            lastUpdatedTimestamp: timestamp,
          })
          .where({ id: token });
      }
    }
  }
});
