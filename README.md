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

## Docker Deployment

### 🚀 Quick Start Scripts

The easiest way to deploy is using the provided startup scripts:

**Windows:**
```bash
# Development with monitoring (recommended)
./docker-start.bat dev -m -d

# Production with monitoring
./docker-start.bat prod -m -d

# Full monitoring stack
./docker-start.bat monitoring -d
```

**Linux/macOS:**
```bash
# Development with monitoring (recommended)
./docker-start.sh dev -m -d

# Production with monitoring
./docker-start.sh prod -m -d

# Full monitoring stack
./docker-start.sh monitoring -d
```

### 📋 Deployment Options

#### **Option 1: Basic Stack (No Monitoring)**
```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Includes:** GMX Indexer, PostgreSQL, Redis, Prometheus, Grafana, Nginx

#### **Option 2: Complete Stack (With Monitoring)** ⭐ **Recommended**
```bash
# Development with monitoring
docker-compose -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.monitoring.yml up -d

# Production with monitoring
docker-compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d
```

**Includes:** Everything above + PostgreSQL/Redis exporters, Node exporter, cAdvisor, Alertmanager, Loki, Jaeger

#### **Option 3: Full Monitoring Stack**
```bash
# Complete observability suite
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

### 🔧 Script Options

| Flag | Description |
|------|-------------|
| `dev` | Development environment (default) |
| `prod` | Production environment |
| `monitoring` | Full monitoring stack |
| `-d, --detached` | Run in background |
| `-m, --monitoring` | Include monitoring exporters |
| `-p, --pull` | Pull latest images |
| `-r, --reset` | Reset all data (⚠️ **DATA LOSS**) |
| `-h, --help` | Show help |

### 📊 Access Points

#### **Development Mode:**
- **GraphQL API:** http://localhost:42069/graphql
- **GraphQL Playground:** http://localhost:42069/graphiql
- **Grafana Dashboards:** http://localhost:3000 (admin/admin)
- **Prometheus Metrics:** http://localhost:9091
- **PostgreSQL:** localhost:5432 (gmx_user/devpassword)
- **Redis:** localhost:6379

#### **Production Mode:**
- **GraphQL API:** http://localhost/graphql
- **Health Check:** http://localhost/health
- **Grafana:** http://localhost:3000
- **Prometheus:** http://localhost:9091
- **Database/Redis:** Internal network only

#### **Full Monitoring Stack:**
- **Alertmanager:** http://localhost:9093
- **Jaeger Tracing:** http://localhost:16686
- **Loki Logs:** http://localhost:3100

### 🏥 Health Monitoring

When monitoring is enabled, you get comprehensive health dashboards:

- **PostgreSQL Health:** Database performance, connections, locks
- **Redis Health:** Memory usage, key counts, cache hit rates
- **Application Metrics:** Request rates, response times, errors
- **Infrastructure:** CPU, memory, disk, network metrics

### 🛠 Management Commands

```bash
# Check container status
docker-compose ps

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f gmx-indexer

# Stop stack
docker-compose down

# Stop and remove volumes (⚠️ DATA LOSS)
docker-compose down -v

# Update and restart
./docker-start.bat dev -p -m -d
```

### ⚙️ Configuration Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Base services configuration |
| `docker-compose.dev.yml` | Development overrides |
| `docker-compose.prod.yml` | Production overrides |
| `docker-compose.monitoring.yml` | Monitoring stack |
| `.env` | Environment variables |
| `docker-start.bat/.sh` | Startup scripts |

### 🔒 First-Time Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure required variables in `.env`:**
   ```bash
   PONDER_RPC_URL_5003=https://rpc.sepolia.mantle.xyz
   POSTGRES_PASSWORD=your_secure_password
   ```

3. **Start with monitoring (recommended):**
   ```bash
   ./docker-start.bat dev -m -d
   ```

### 📈 Why Use Monitoring?

- **Performance Insights:** Track database and application performance
- **Issue Detection:** Get alerts before problems affect users
- **Resource Planning:** Monitor memory, CPU, and storage usage
- **Query Optimization:** Identify slow database queries
- **Operational Visibility:** Full observability into your indexer

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