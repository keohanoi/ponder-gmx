import { createConfig } from "ponder";

// GMX V2 Contract ABIs for Mantle Sepolia deployment
import { gmxv2EventEmitterAbi } from "./abis/GMXv2EventEmitterAbi";

export default createConfig({
  chains: {
    mantleSepolia: {
      id: 5003,
      rpc: process.env.PONDER_RPC_URL_5003 || "https://rpc.sepolia.mantle.xyz",
    },
  },
  contracts: {
    // GMX V2 EventEmitter - Core event emission contract for all GMX v2 events
    GMXv2EventEmitter: {
      abi: gmxv2EventEmitterAbi,
      chain: {
        mantleSepolia: {
          address: "0x8503471902b5915A820cB6f1B6471c1Fe623d5d3", // EventEmitter address from CSV
          startBlock: 31300000, // Recent block on Mantle Sepolia
        },
      },
    },

    // GMX V2 ExchangeRouter - Main router for all trading operations
    GMXv2ExchangeRouter: {
      abi: [], // EventEmitter handles all events, this is for reference
      chain: {
        mantleSepolia: {
          address: "0x70970cE2470cF5DA4e38CCeD35b4015DaA4810a6", // ExchangeRouter address from CSV
          startBlock: 31300000,
        },
      },
    },

    // GMX V2 DepositHandler - Handles deposit operations
    GMXv2DepositHandler: {
      abi: [], // EventEmitter handles all events, this is for reference
      chain: {
        mantleSepolia: {
          address: "0xDF55c9d1a68272D555ab9521B8b40f6C617aC8D1", // DepositHandler address from CSV
          startBlock: 31300000,
        },
      },
    },

    // GMX V2 WithdrawalHandler - Handles withdrawal operations
    GMXv2WithdrawalHandler: {
      abi: [], // EventEmitter handles all events, this is for reference
      chain: {
        mantleSepolia: {
          address: "0xb45f9D61e0891Fe57ACb52BC5B85147a4D3c72fD", // WithdrawalHandler address from CSV
          startBlock: 31300000,
        },
      },
    },

    // GMX V2 OrderHandler - Handles order operations
    GMXv2OrderHandler: {
      abi: [], // EventEmitter handles all events, this is for reference
      chain: {
        mantleSepolia: {
          address: "0xE5fCcEb668f777EA0109b430a315DDD4Eb104Cab", // OrderHandler address from CSV
          startBlock: 31300000,
        },
      },
    },

    // GMX V2 JitOrderHandler - New JIT order functionality
    GMXv2JitOrderHandler: {
      abi: [], // EventEmitter handles all events, this is for reference
      chain: {
        mantleSepolia: {
          address: "0xC3FbAbc3BD265e457fdde281d170CBA12bCA6b41", // JitOrderHandler address from CSV
          startBlock: 31300000,
        },
      },
    },

    // GMX V2 Reader - Data reading contract
    GMXv2Reader: {
      abi: [], // EventEmitter handles all events, this is for reference
      chain: {
        mantleSepolia: {
          address: "0x03ced98B0395b37A721334eC051491253aaB7B33", // Reader address from CSV
          startBlock: 31300000,
        },
      },
    },

    // GMX V2 DataStore - Core data storage
    GMXv2DataStore: {
      abi: [], // EventEmitter handles all events, this is for reference
      chain: {
        mantleSepolia: {
          address: "0x4C5Ef6dA18370Fc33Bef3395c3f1EEb7010A8111", // DataStore address from CSV
          startBlock: 31300000,
        },
      },
    },

    // GMX V2 Oracle - Price oracle
    GMXv2Oracle: {
      abi: [], // EventEmitter handles all events, this is for reference
      chain: {
        mantleSepolia: {
          address: "0xb8A7bEFDc642A8ffd38F5428CDF01883fEa47E39", // Oracle address from CSV
          startBlock: 31300000,
        },
      },
    },
  },
});