export const gmxv2EventEmitterAbi = [
  // Core GMX v2 events - EventEmitter contract events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "account", "type": "address"},
      {"indexed": false, "name": "market", "type": "address"},
      {"indexed": false, "name": "token", "type": "address"},
      {"indexed": false, "name": "tokensLong", "type": "uint256"},
      {"indexed": false, "name": "tokensShort", "type": "uint256"},
      {"indexed": false, "name": "marketTokens", "type": "uint256"}
    ],
    "name": "DepositCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "key", "type": "bytes32"},
      {"indexed": true, "name": "account", "type": "address"},
      {"indexed": false, "name": "market", "type": "address"},
      {"indexed": false, "name": "marketTokensLong", "type": "uint256"},
      {"indexed": false, "name": "marketTokensShort", "type": "uint256"},
      {"indexed": false, "name": "tokensLong", "type": "uint256"},
      {"indexed": false, "name": "tokensShort", "type": "uint256"}
    ],
    "name": "DepositExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "key", "type": "bytes32"},
      {"indexed": false, "name": "reason", "type": "string"}
    ],
    "name": "DepositCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "account", "type": "address"},
      {"indexed": false, "name": "market", "type": "address"},
      {"indexed": false, "name": "marketTokens", "type": "uint256"},
      {"indexed": false, "name": "minLongTokenAmount", "type": "uint256"},
      {"indexed": false, "name": "minShortTokenAmount", "type": "uint256"}
    ],
    "name": "WithdrawalCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "key", "type": "bytes32"},
      {"indexed": true, "name": "account", "type": "address"},
      {"indexed": false, "name": "market", "type": "address"},
      {"indexed": false, "name": "marketTokens", "type": "uint256"},
      {"indexed": false, "name": "longTokenAmount", "type": "uint256"},
      {"indexed": false, "name": "shortTokenAmount", "type": "uint256"}
    ],
    "name": "WithdrawalExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "key", "type": "bytes32"},
      {"indexed": false, "name": "reason", "type": "string"}
    ],
    "name": "WithdrawalCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "account", "type": "address"},
      {"indexed": false, "name": "market", "type": "address"},
      {"indexed": false, "name": "collateralToken", "type": "address"},
      {"indexed": false, "name": "sizeInUsd", "type": "uint256"},
      {"indexed": false, "name": "sizeInTokens", "type": "uint256"},
      {"indexed": false, "name": "collateralDeltaAmount", "type": "uint256"},
      {"indexed": false, "name": "executionPrice", "type": "uint256"},
      {"indexed": false, "name": "isLong", "type": "bool"},
      {"indexed": false, "name": "orderType", "type": "uint256"}
    ],
    "name": "OrderCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "key", "type": "bytes32"},
      {"indexed": true, "name": "account", "type": "address"},
      {"indexed": false, "name": "market", "type": "address"},
      {"indexed": false, "name": "collateralToken", "type": "address"},
      {"indexed": false, "name": "sizeInUsd", "type": "uint256"},
      {"indexed": false, "name": "sizeInTokens", "type": "uint256"},
      {"indexed": false, "name": "collateralDeltaAmount", "type": "uint256"},
      {"indexed": false, "name": "executionPrice", "type": "uint256"},
      {"indexed": false, "name": "isLong", "type": "bool"}
    ],
    "name": "OrderExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "key", "type": "bytes32"},
      {"indexed": false, "name": "reason", "type": "string"}
    ],
    "name": "OrderCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "account", "type": "address"},
      {"indexed": false, "name": "market", "type": "address"},
      {"indexed": false, "name": "collateralToken", "type": "address"},
      {"indexed": false, "name": "sizeInUsd", "type": "uint256"},
      {"indexed": false, "name": "sizeInTokens", "type": "uint256"},
      {"indexed": false, "name": "collateralDeltaAmount", "type": "uint256"},
      {"indexed": false, "name": "executionPrice", "type": "uint256"},
      {"indexed": false, "name": "isLong", "type": "bool"}
    ],
    "name": "PositionIncrease",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "account", "type": "address"},
      {"indexed": false, "name": "market", "type": "address"},
      {"indexed": false, "name": "collateralToken", "type": "address"},
      {"indexed": false, "name": "sizeInUsd", "type": "uint256"},
      {"indexed": false, "name": "sizeInTokens", "type": "uint256"},
      {"indexed": false, "name": "collateralDeltaAmount", "type": "uint256"},
      {"indexed": false, "name": "executionPrice", "type": "uint256"},
      {"indexed": false, "name": "realizedPnlUsd", "type": "int256"},
      {"indexed": false, "name": "isLong", "type": "bool"}
    ],
    "name": "PositionDecrease",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "account", "type": "address"},
      {"indexed": false, "name": "market", "type": "address"},
      {"indexed": false, "name": "collateralToken", "type": "address"},
      {"indexed": false, "name": "sizeInUsd", "type": "uint256"},
      {"indexed": false, "name": "sizeInTokens", "type": "uint256"},
      {"indexed": false, "name": "collateralAmount", "type": "uint256"},
      {"indexed": false, "name": "markPrice", "type": "uint256"},
      {"indexed": false, "name": "realizedPnlUsd", "type": "int256"},
      {"indexed": false, "name": "isLong", "type": "bool"}
    ],
    "name": "PositionLiquidated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "account", "type": "address"},
      {"indexed": false, "name": "tokenIn", "type": "address"},
      {"indexed": false, "name": "tokenOut", "type": "address"},
      {"indexed": false, "name": "amountIn", "type": "uint256"},
      {"indexed": false, "name": "amountOut", "type": "uint256"},
      {"indexed": false, "name": "priceImpactUsd", "type": "int256"}
    ],
    "name": "SwapExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "name": "msgSender", "type": "address"},
      {"indexed": false, "name": "eventName", "type": "string"},
      {"indexed": true, "name": "eventNameHash", "type": "string"},
      {
        "components": [
          {
            "components": [
              {
                "components": [
                  {"name": "key", "type": "string"},
                  {"name": "value", "type": "address"}
                ],
                "name": "items",
                "type": "tuple[]"
              },
              {
                "components": [
                  {"name": "key", "type": "string"},
                  {"name": "value", "type": "address[]"}
                ],
                "name": "arrayItems",
                "type": "tuple[]"
              }
            ],
            "name": "addressItems",
            "type": "tuple"
          },
          {
            "components": [
              {
                "components": [
                  {"name": "key", "type": "string"},
                  {"name": "value", "type": "uint256"}
                ],
                "name": "items",
                "type": "tuple[]"
              },
              {
                "components": [
                  {"name": "key", "type": "string"},
                  {"name": "value", "type": "uint256[]"}
                ],
                "name": "arrayItems",
                "type": "tuple[]"
              }
            ],
            "name": "uintItems",
            "type": "tuple"
          },
          {
            "components": [
              {
                "components": [
                  {"name": "key", "type": "string"},
                  {"name": "value", "type": "int256"}
                ],
                "name": "items",
                "type": "tuple[]"
              },
              {
                "components": [
                  {"name": "key", "type": "string"},
                  {"name": "value", "type": "int256[]"}
                ],
                "name": "arrayItems",
                "type": "tuple[]"
              }
            ],
            "name": "intItems",
            "type": "tuple"
          },
          {
            "components": [
              {
                "components": [
                  {"name": "key", "type": "string"},
                  {"name": "value", "type": "bool"}
                ],
                "name": "items",
                "type": "tuple[]"
              },
              {
                "components": [
                  {"name": "key", "type": "string"},
                  {"name": "value", "type": "bool[]"}
                ],
                "name": "arrayItems",
                "type": "tuple[]"
              }
            ],
            "name": "boolItems",
            "type": "tuple"
          },
          {
            "components": [
              {
                "components": [
                  {"name": "key", "type": "string"},
                  {"name": "value", "type": "bytes32"}
                ],
                "name": "items",
                "type": "tuple[]"
              },
              {
                "components": [
                  {"name": "key", "type": "string"},
                  {"name": "value", "type": "bytes32[]"}
                ],
                "name": "arrayItems",
                "type": "tuple[]"
              }
            ],
            "name": "bytes32Items",
            "type": "tuple"
          },
          {
            "components": [
              {
                "components": [
                  {"name": "key", "type": "string"},
                  {"name": "value", "type": "bytes"}
                ],
                "name": "items",
                "type": "tuple[]"
              },
              {
                "components": [
                  {"name": "key", "type": "string"},
                  {"name": "value", "type": "bytes[]"}
                ],
                "name": "arrayItems",
                "type": "tuple[]"
              }
            ],
            "name": "bytesItems",
            "type": "tuple"
          },
          {
            "components": [
              {
                "components": [
                  {"name": "key", "type": "string"},
                  {"name": "value", "type": "string"}
                ],
                "name": "items",
                "type": "tuple[]"
              },
              {
                "components": [
                  {"name": "key", "type": "string"},
                  {"name": "value", "type": "string[]"}
                ],
                "name": "arrayItems",
                "type": "tuple[]"
              }
            ],
            "name": "stringItems",
            "type": "tuple"
          }
        ],
        "indexed": false,
        "name": "eventData",
        "type": "tuple"
      }
    ],
    "name": "EventLog1",
    "type": "event"
  }
] as const;