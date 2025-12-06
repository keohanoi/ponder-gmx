# GMX v2 Indexer for Mantle Sepolia

A [Ponder](https://ponder.sh) indexer for GMX v2 protocol deployed on Mantle Sepolia testnet.

## Overview

This indexer tracks GMX v2 events including:
- Deposits and Withdrawals
- Order creation and execution
- Position increases/decreases
- Swaps
- Daily statistics aggregation

## Contracts Indexed

| Contract | Address | Description |
|----------|---------|-------------|
| EventEmitter | `0x8503471902b5915A820cB6f1B6471c1Fe623d5d3` | Main event emission contract |
| ExchangeRouter | `0x70970cE2470cF5DA4e38CCeD35b4015DaA4810a6` | Main trading router |
| DepositHandler | `0xDF55c9d1a68272D555ab9521B8b40f6C617aC8D1` | Handles deposits |
| WithdrawalHandler | `0xb45f9D61e0891Fe57ACb52BC5B85147a4D3c72fD` | Handles withdrawals |
| OrderHandler | `0xE5fCcEb668f777EA0109b430a315DDD4Eb104Cab` | Handles orders |

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your RPC URL
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## Docker Setup

1. **Using Docker Compose:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
   ```

2. **Production deployment:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
   ```

## Environment Variables

- `PONDER_RPC_URL_5003`: Mantle Sepolia RPC URL (default: https://rpc.sepolia.mantle.xyz)
- `DATABASE_URL`: PostgreSQL connection string
- `PONDER_LOG_LEVEL`: Log level (debug, info, warn, error)

## Database Schema

The indexer creates the following main tables:
- `account`: User accounts and statistics
- `market`: GMX v2 market information
- `deposit_event`: Deposit events and execution
- `withdrawal_event`: Withdrawal events and execution
- `order_event_v2`: Order creation and execution
- `position_event_v2`: Position changes
- `swap_event_v2`: Swap transactions
- `daily_stats`: Aggregated daily statistics

## Development

This project uses:
- [Ponder](https://ponder.sh) - Blockchain indexing framework
- TypeScript - Type safety
- PostgreSQL - Database

## License

MIT