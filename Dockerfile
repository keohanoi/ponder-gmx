# Multi-stage Docker build for GMX Ponder Indexer
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies required for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

# Development stage
FROM base AS development

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Generate types
RUN npm run codegen

# Expose ports
EXPOSE 42069 9090

# Start development server with hot reload
CMD ["npm", "run", "dev"]

# Production dependencies stage
FROM base AS deps

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Production build stage
FROM base AS builder

# Copy package files
COPY package*.json ./

# Install all dependencies for building
RUN npm ci

# Copy source code
COPY . .

# Generate types
RUN npm run codegen

# Production runtime stage
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    curl \
    bash \
    tini

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S ponder -u 1001

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder /app/abis ./abis
COPY --from=builder /app/src ./src
COPY --from=builder /app/ponder.config.ts ./
COPY --from=builder /app/ponder.schema.ts ./
COPY --from=builder /app/ponder-env.d.ts ./
COPY --from=builder /app/tsconfig.json ./

# Create necessary directories
RUN mkdir -p logs data && \
    chown -R ponder:nodejs /app

# Switch to non-root user
USER ponder

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:42069/health || exit 1

# Expose ports
EXPOSE 42069 9090

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start the production server
CMD ["npm", "run", "start"]

# Lightweight development stage for quick local builds
FROM base AS dev-quick

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose ports
EXPOSE 42069 9090

# Start with development server
CMD ["npm", "run", "dev"]